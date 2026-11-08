import { cn } from "@mingzhan/ui/utils";
import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  StopIcon,
  VolumeHighIcon,
} from "hugeicons-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const messageActionClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40";

export const messageActionRowClass =
  "flex min-h-8 flex-wrap items-center gap-1 transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
});

export function MessageTime({ createdAt }: { createdAt?: string }) {
  if (!createdAt) {
    return null;
  }

  const date = new Date(createdAt);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return (
    <time
      className="whitespace-nowrap px-1 text-muted-foreground text-xs tabular-nums"
      dateTime={createdAt}
    >
      {timeFormatter.format(date)}
    </time>
  );
}

export function CopyMessageButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [feedback, setFeedback] = useState<"copied" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => setFeedback(null), 2000);
  }

  const actionLabel =
    feedback === "copied"
      ? "Copied"
      : feedback === "failed"
        ? "Could not copy"
        : label;

  return (
    <button
      aria-label={actionLabel}
      className={cn(
        messageActionClass,
        feedback === "copied" && "text-emerald-600 dark:text-emerald-400"
      )}
      disabled={!text.trim()}
      onClick={() => void copy()}
      title={actionLabel}
      type="button"
    >
      {feedback === "copied" ? (
        <CheckmarkCircle01Icon aria-hidden className="size-4" />
      ) : (
        <Copy01Icon aria-hidden className="size-4" />
      )}
    </button>
  );
}

interface MessageSpeech {
  activeId: string | null;
  failedId: string | null;
  supported: boolean;
  toggle: (id: string, text: string) => void;
}

const MessageSpeechContext = createContext<MessageSpeech | null>(null);

function speechText(markdown: string): string {
  return markdown
    .replace(
      /^[ \t]*(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*(?:`{3,}|~{3,})[^\n]*$/gm,
      ""
    )
    .replace(/!?\[([^\]\n]*)\]\([^)\n]*\)/g, "$1")
    .replace(/^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+)/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function MessageSpeechProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  const supported = Boolean(
    globalThis.window?.speechSynthesis && window.SpeechSynthesisUtterance
  );

  useEffect(
    () => () => {
      if (utterance.current) {
        utterance.current = null;
        window.speechSynthesis.cancel();
      }
    },
    []
  );

  const toggle = useCallback(
    (id: string, text: string) => {
      if (!supported) {
        return;
      }

      utterance.current = null;
      window.speechSynthesis.cancel();
      setActiveId(null);
      setFailedId(null);

      if (activeId === id) {
        return;
      }

      const chunks = text.match(/.{1,200}(?:\s|$)|.{1,200}/gu) ?? [];

      function speak(index: number) {
        const chunk = chunks[index];

        if (!chunk) {
          utterance.current = null;
          setActiveId(null);

          return;
        }

        const next = new window.SpeechSynthesisUtterance(chunk.trim());
        utterance.current = next;
        next.onend = () => {
          if (utterance.current === next) {
            speak(index + 1);
          }
        };

        const fail = () => {
          if (utterance.current === next) {
            utterance.current = null;
            setActiveId(null);
            setFailedId(id);
          }
        };

        next.onerror = fail;

        try {
          window.speechSynthesis.speak(next);
        } catch {
          fail();
        }
      }

      if (chunks.length > 0) {
        setActiveId(id);
        speak(0);
      }
    },
    [activeId, supported]
  );

  const speech = useMemo(
    () => ({ activeId, failedId, supported, toggle }),
    [activeId, failedId, supported, toggle]
  );

  return (
    <MessageSpeechContext.Provider value={speech}>
      {children}
    </MessageSpeechContext.Provider>
  );
}

export function ReadAloudButton({ id, text }: { id: string; text: string }) {
  const speech = useContext(MessageSpeechContext);
  const playing = speech?.activeId === id;
  const label = playing ? "Stop reading" : "Read aloud";
  const unavailable = !speech?.supported;
  const spokenText = speechText(text);

  return (
    <button
      aria-label={label}
      className={messageActionClass}
      disabled={unavailable || !spokenText}
      onClick={() => speech?.toggle(id, spokenText)}
      title={
        unavailable
          ? "Read aloud is unavailable on this device"
          : speech.failedId === id
            ? "Could not read aloud. Try again."
            : label
      }
      type="button"
    >
      {playing ? (
        <StopIcon aria-hidden className="size-4" />
      ) : (
        <VolumeHighIcon aria-hidden className="size-4" />
      )}
    </button>
  );
}
