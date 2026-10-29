import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { truncateMailBody } from "./mail/types";

/** Shared with email body truncation (`MAX_EMAIL_BODY_BYTES`). */
export const ANYDOC_MAX_OUTPUT_BYTES = 256 * 1024;

const extractionCache = new Map<string, string>();

const MAX_CACHED_DOCUMENTS = 32;

const ANYDOC_TIMEOUT_MS = 10_000;

export const ANYDOC_MAX_CONCURRENT = 2;

/** Parked callers, each pinning its document bytes until a slot frees up. */
export const ANYDOC_MAX_QUEUE = 32;

export type AnydocFormat =
  | "doc"
  | "docx"
  | "odt"
  | "pdf"
  | "ppt"
  | "pptx"
  | "rtf"
  | "epub"
  | "xlsx"
  | "ods"
  | "odp"
  | "csv";

export interface AnydocConvertResult {
  text: string;
  truncated: boolean;
}

/**
 * Receives an `AbortSignal` that fires when the caller's deadline elapses:
 * a converter that owns a terminable resource (child process, worker) must
 * stop on abort and let the returned promise settle. The slot is released
 * when that promise settles, never when the caller gives up on it.
 */
export type AnydocConvertFn = (
  bytes: Uint8Array,
  format: AnydocFormat | null,
  signal: AbortSignal
) => Promise<string>;

export interface ConvertDocumentBytesOptions {
  /** Test seam — defaults to `@firecrawl/anydoc` `toMarkdownBytes`. */
  convertFn?: AnydocConvertFn;
  filename?: string;
  format?: AnydocFormat | null;
  maxOutputBytes?: number;
  mediaType?: string;
  timeoutMs?: number;
}

const MEDIA_TYPE_TO_FORMAT = {
  "application/csv": "csv",
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12": "xlsx",
  "application/vnd.ms-excel.sheet.macroEnabled.12": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml":
    "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/csv": "csv",
} satisfies Record<string, AnydocFormat>;

/** Slots in use: a running conversion, or a woken caller about to start one. */
let activeConversions = 0;

const waitQueue: AnydocWaiter[] = [];

interface AnydocWaiter {
  admit: () => void;
}

function conversionTimedOut(): Error {
  return new Error("Document text extraction timed out.");
}

function conversionBusy(): Error {
  return new Error("Document conversion is busy. Try again shortly.");
}

function releaseAnydocSlot(): void {
  const next = waitQueue.shift();

  if (next) {
    // Hand the slot straight over: the counter already counts it, so it must
    // not dip while the next caller wakes up and starts its conversion.
    next.admit();

    return;
  }

  activeConversions -= 1;
}

function dropWaiter(waiter: AnydocWaiter): void {
  const index = waitQueue.indexOf(waiter);

  if (index !== -1) {
    waitQueue.splice(index, 1);
  }
}

/**
 * Reserves one of the `ANYDOC_MAX_CONCURRENT` slots. The queue wait is
 * bounded by the caller's deadline, so a caller that never gets a slot
 * rejects instead of pinning its document bytes indefinitely.
 */
async function acquireAnydocSlot(deadlineAt: number): Promise<void> {
  if (activeConversions < ANYDOC_MAX_CONCURRENT) {
    activeConversions += 1;

    return;
  }

  if (waitQueue.length >= ANYDOC_MAX_QUEUE) {
    throw conversionBusy();
  }

  const waiter: AnydocWaiter = { admit: () => undefined };

  const admitted = new Promise<void>((resolve) => {
    waiter.admit = resolve;
  });

  waitQueue.push(waiter);

  const remaining = deadlineAt - Date.now();

  if (remaining <= 0) {
    dropWaiter(waiter);
    throw conversionTimedOut();
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      admitted,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          // Give up the queue place before rejecting, so a release that
          // happens later cannot hand this slot to an abandoned caller.
          dropWaiter(waiter);
          reject(conversionTimedOut());
        }, remaining);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  // Admitted by `releaseAnydocSlot`, which already accounted for this slot.
}

/** Run the native parser outside the server so its deadline can stop it. */
const convertWithAnydoc: AnydocConvertFn = (bytes, format, signal) =>
  new Promise((resolve, reject) => {
    let modulePath: string;

    try {
      modulePath = import.meta.resolve("@firecrawl/anydoc");
    } catch {
      // Source and server dist live three levels below the repository root.
      modulePath = createRequire(
        new URL("../../../packages/core/package.json", import.meta.url)
      ).resolve("@firecrawl/anydoc");
    }

    const moduleUrl = modulePath.startsWith("file:")
      ? modulePath
      : pathToFileURL(modulePath).href;

    const script = `(async () => {
      const { toMarkdownBytes } = await import(${JSON.stringify(moduleUrl)});
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const text = await toMarkdownBytes(Buffer.concat(chunks), ${JSON.stringify(format)});
      process.stdout.write(text);
    })().catch(error => { console.error(error.message); process.exitCode = 1; });`;

    const child = spawn(process.execPath, ["-e", script], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let limited = false;
    let errorText = "";

    const abort = () => {
      child.kill("SIGKILL");
    };

    signal.addEventListener("abort", abort, { once: true });

    if (signal.aborted) {
      abort();
    }

    child.stdout.on("data", (chunk: Buffer) => {
      const room = ANYDOC_MAX_OUTPUT_BYTES + 8 - outputBytes;

      if (room > 0) {
        const part = chunk.subarray(0, room);
        chunks.push(part);
        outputBytes += part.length;
      }

      if (outputBytes > ANYDOC_MAX_OUTPUT_BYTES) {
        limited = true;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errorText = (errorText + chunk.toString()).slice(0, 2000);
    });
    // An abort can close stdin before the document has been sent.
    child.stdin.on("error", () => undefined);
    child.on("error", (error) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
    child.on("close", (code) => {
      signal.removeEventListener("abort", abort);

      if (signal.aborted) {
        reject(signal.reason);
      } else if (code !== 0 && !limited) {
        reject(new Error(errorText || "Document parser failed."));
      } else {
        resolve(Buffer.concat(chunks).toString("utf8"));
      }
    });
    child.stdin.end(bytes);
  });

function startConversion(
  convertFn: AnydocConvertFn,
  input: Uint8Array,
  format: AnydocFormat | null,
  signal: AbortSignal
): Promise<string> {
  try {
    return Promise.resolve(convertFn(input, format, signal));
  } catch (error) {
    return Promise.reject(error);
  }
}

export function resolveAnydocFormat(
  mediaType?: string,
  filename?: string
): AnydocFormat | null {
  const normalizedMedia = mediaType?.trim().toLowerCase() ?? "";

  const mediaFormat = Object.entries(MEDIA_TYPE_TO_FORMAT).find(
    ([media]) => media === normalizedMedia
  )?.[1];

  if (mediaFormat) {
    return mediaFormat;
  }

  const extension = filename?.includes(".")
    ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
    : "";

  switch (extension) {
    case ".pdf":
      return "pdf";
    case ".doc":
      return "doc";
    case ".docx":
    case ".docm":
      return "docx";
    case ".xls":
    case ".xlsx":
    case ".xlsm":
    case ".xlsb":
      return "xlsx";
    case ".csv":
      return "csv";
    case ".ppt":
    case ".pps":
    case ".pot":
      return "ppt";
    case ".pptx":
    case ".pptm":
    case ".ppsx":
    case ".ppsm":
      return "pptx";
    case ".odt":
      return "odt";
    case ".ods":
      return "ods";
    case ".odp":
      return "odp";
    case ".rtf":
      return "rtf";
    case ".epub":
      return "epub";
    default:
      return null;
  }
}

export async function convertDocumentBytes(
  bytes: Buffer | Uint8Array,
  options: ConvertDocumentBytesOptions = {}
): Promise<AnydocConvertResult> {
  const format =
    options.format ?? resolveAnydocFormat(options.mediaType, options.filename);

  const timeoutMs = options.timeoutMs ?? ANYDOC_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? ANYDOC_MAX_OUTPUT_BYTES;
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const cacheKey = options.convertFn
    ? null
    : `${format}:${createHash("sha256").update(input).digest("hex")}`;

  const cached = cacheKey ? extractionCache.get(cacheKey) : undefined;

  if (cached !== undefined) {
    extractionCache.delete(cacheKey!);
    extractionCache.set(cacheKey!, cached);

    return truncateMailBody(cached, maxOutputBytes);
  }

  // The advertised deadline covers queueing and converting, so a caller never
  // spends longer than `timeoutMs` waiting on the parser.
  const deadlineAt = Date.now() + timeoutMs;
  const controller = new AbortController();
  const convertFn = options.convertFn ?? convertWithAnydoc;

  await acquireAnydocSlot(deadlineAt);

  const conversion = startConversion(
    convertFn,
    input,
    format,
    controller.signal
  );

  // The slot belongs to the conversion, not to the caller's promise: work the
  // caller has already stopped waiting for keeps its slot until the parser
  // actually stops, which is what bounds in-flight native work.
  conversion.then(releaseAnydocSlot, releaseAnydocSlot);

  const remaining = deadlineAt - Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    if (remaining <= 0) {
      controller.abort(conversionTimedOut());
      throw controller.signal.reason;
    }

    const markdown = await Promise.race([
      conversion,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          // Stop the parser before the caller hears about it: the signal is
          // the only channel a converter has, and a converter that honours it
          // settles `conversion`, handing the slot back right away.
          controller.abort(conversionTimedOut());
          reject(controller.signal.reason);
        }, remaining);
      }),
    ]);

    if (controller.signal.aborted) {
      // A converter that resolves past its abort produced output nobody is
      // waiting for; drop it instead of trimming a doomed result.
      throw controller.signal.reason;
    }

    const trimmed = markdown.trim();

    if (!trimmed) {
      return { text: "", truncated: false };
    }

    if (cacheKey) {
      extractionCache.set(cacheKey, trimmed);

      while (extractionCache.size > MAX_CACHED_DOCUMENTS) {
        extractionCache.delete(extractionCache.keys().next().value!);
      }
    }

    return truncateMailBody(trimmed, maxOutputBytes);
  } finally {
    clearTimeout(timeout);
  }
}
