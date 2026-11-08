import type { JsonValue } from "./mcp-client-manager";

// Tool image limits, as pi's tool-result image pass: longest side and base64 size.
const MODEL_IMAGE_MAX_SIDE = 2000;

const MODEL_IMAGE_MAX_BASE64 = 4.5 * 1024 * 1024;

const MODEL_IMAGE_JPEG_QUALITIES = [80, 85, 70, 55, 40];

/** Larger images are not decoded at all: decoding is where the memory goes. */
const MODEL_IMAGE_MAX_INPUT_BASE64 = 32 * 1024 * 1024;

interface McpContentPart {
  data?: string;
  mimeType?: string;
  text?: string;
  type: string;
}

interface ModelImage {
  data: string;
  mediaType: string;
  note?: string;
}

/**
 * Images go out as `images`, which the chat loop sends to the model as image
 * input. Inline base64 reached the model as text: one screenshot was ~1M tokens.
 */
export async function formatToolContentResult(
  content: McpContentPart[]
): Promise<JsonValue> {
  const images: JsonValue[] = [];
  const parts: JsonValue[] = [];
  const notes: string[] = [];

  for (const part of content) {
    if (
      part.type === "image" &&
      isString(part.data) &&
      isString(part.mimeType)
    ) {
      const fitted = await fitImageForModel(part.data, part.mimeType);

      if (!fitted) {
        const note = `[Image dropped: ${part.data.length} base64 characters could not be fitted under the model limit.]`;
        parts.push({ text: note, type: "text" });
        notes.push(note);

        continue;
      }

      const { note, ...image } = fitted;

      images.push(image);
      parts.push({ mimeType: image.mediaType, type: "image" });

      if (note) {
        parts.push({ text: note, type: "text" });
        notes.push(note);
      }

      continue;
    }

    parts.push(parseJsonValue(part));
  }

  const text = [formatToolContent(content), ...notes].join("\n");

  return images.length > 0
    ? { content: parts, images, text }
    : { content: parts, text };
}

/**
 * Scale down and re-encode until the image fits; PNG first, then JPEG.
 * Returns null when the image cannot be brought under the limit.
 */
async function fitImageForModel(
  data: string,
  mimeType: string
): Promise<ModelImage | null> {
  if (data.length > MODEL_IMAGE_MAX_INPUT_BASE64) {
    return null;
  }

  try {
    const bytes = Buffer.from(data, "base64");
    const { height, width } = await new Bun.Image(bytes).metadata();

    if (
      width <= MODEL_IMAGE_MAX_SIDE &&
      height <= MODEL_IMAGE_MAX_SIDE &&
      data.length < MODEL_IMAGE_MAX_BASE64
    ) {
      return { data, mediaType: mimeType };
    }

    const scale = Math.min(1, MODEL_IMAGE_MAX_SIDE / Math.max(width, height));
    let targetWidth = Math.max(1, Math.round(width * scale));
    let targetHeight = Math.max(1, Math.round(height * scale));

    while (true) {
      const resized = () =>
        new Bun.Image(bytes).resize(targetWidth, targetHeight, {
          fit: "fill",
        });

      const encodings: Array<[string, () => Promise<Uint8Array>]> = [
        ["image/png", () => resized().png().bytes()],
        ...MODEL_IMAGE_JPEG_QUALITIES.map(
          (quality): [string, () => Promise<Uint8Array>] => [
            "image/jpeg",
            () => resized().jpeg({ quality }).bytes(),
          ]
        ),
      ];

      for (const [mediaType, encode] of encodings) {
        const encoded = Buffer.from(await encode()).toString("base64");

        if (encoded.length < MODEL_IMAGE_MAX_BASE64) {
          return {
            data: encoded,
            mediaType,
            note: `[Image: original ${width}x${height}, displayed at ${targetWidth}x${targetHeight}. Multiply coordinates by ${(width / targetWidth).toFixed(2)} to map to original image.]`,
          };
        }
      }

      if (targetWidth === 1 && targetHeight === 1) {
        return null;
      }

      targetWidth = Math.max(1, Math.floor(targetWidth * 0.75));
      targetHeight = Math.max(1, Math.floor(targetHeight * 0.75));
    }
  } catch {
    // A format Bun cannot decode goes out as the tool sent it, if it fits.
    return data.length < MODEL_IMAGE_MAX_BASE64
      ? { data, mediaType: mimeType }
      : null;
  }
}

export function formatToolContent(
  content: McpContentPart[] | undefined
): string {
  if (!content || content.length === 0) {
    return "Tool completed with no content.";
  }

  return content
    .map((part) => {
      if (part.type === "text" && isString(part.text)) {
        return part.text;
      }

      if (part.type === "image") {
        return `[${part.mimeType ?? "image"}]`;
      }

      return JSON.stringify(part);
    })
    .join("\n");
}

function isString<T>(value: T): value is T & string {
  return Object.prototype.toString.call(value) === "[object String]";
}

const MAX_JSON_DEPTH = 100;

export function parseJsonValue<T>(value: T): JsonValue {
  if (!isJsonValue(value)) {
    throw new Error("MCP tool result is not a JSON value.");
  }

  return value;
}

export function isJsonValue<T>(
  value: T,
  seen = new WeakSet<object>(),
  depth = 0
): value is T & JsonValue {
  if (depth > MAX_JSON_DEPTH) {
    return false;
  }

  if (value === null || value === true || value === false || isString(value)) {
    return true;
  }

  if (
    Object.prototype.toString.call(value) === "[object Number]" &&
    !(value instanceof Number)
  ) {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    const valid = value.every((entry) => isJsonValue(entry, seen, depth + 1));
    seen.delete(value);

    return valid;
  }

  if (!(value instanceof Object) || seen.has(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  seen.add(value);

  const valid = Object.values(value).every((entry) =>
    isJsonValue(entry, seen, depth + 1)
  );

  seen.delete(value);

  return valid;
}
