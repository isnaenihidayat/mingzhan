import type { PublicConversationShareResponse } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import { Spinner } from "@mingzhan/ui/spinner";
import { cn } from "@mingzhan/ui/utils";
import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  Message01Icon,
  Share04Icon,
  SparklesIcon,
  UserIcon,
} from "hugeicons-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageResponse } from "@/components/ai-elements/message";
import { client, formatError } from "@/lib/client";

export function PublicConversationSharePage() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<PublicConversationShareResponse | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    client
      .getPublicConversationShare(token)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(formatError(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) {
      return "";
    }

    try {
      return new Date(isoString).toLocaleDateString("id-ID", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-y-auto overflow-x-hidden bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-border/60 border-b bg-background/95 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2.5">
          <Link
            className="flex items-center gap-2 font-semibold text-foreground transition-opacity hover:opacity-80"
            to="/chat"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#00b2be] text-white">
              <SparklesIcon className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">MíngZhàn</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-muted-foreground text-xs">
            Percakapan Publik
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="h-8 gap-1.5 text-xs"
            onClick={handleCopy}
            size="sm"
            variant="outline"
          >
            {copied ? (
              <>
                <CheckmarkCircle01Icon className="size-3.5 text-[#00b2be]" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy01Icon className="size-3.5 text-muted-foreground" />
                <span>Salin Tautan</span>
              </>
            )}
          </Button>

          <Button
            className="h-8 gap-1.5 bg-[#00b2be] text-white text-xs hover:bg-[#009ca6]"
            nativeButton={false}
            render={<Link to="/chat" />}
            size="sm"
          >
            <Message01Icon className="size-3.5" />
            <span>Buka MíngZhàn</span>
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-4xl flex-1 shrink-0 px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Spinner className="size-6 text-[#00b2be]" />
            <p className="text-xs">Memuat percakapan...</p>
          </div>
        ) : error || !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Share04Icon className="size-6" />
            </div>
            <h2 className="mb-1 font-semibold text-lg">
              Percakapan Tidak Ditemukan
            </h2>
            <p className="mb-6 max-w-sm text-muted-foreground text-sm">
              Tautan ini mungkin telah dicabut oleh pemiliknya atau token tidak
              valid.
            </p>
            <Button
              nativeButton={false}
              render={<Link to="/chat" />}
              size="sm"
              variant="outline"
            >
              Kembali ke Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Conversation Header */}
            <div className="border-border/60 border-b pb-6">
              <h1 className="mb-2 font-bold text-2xl tracking-tight">
                {data.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground text-xs">
                <span>Dibagikan pada {formatDate(data.createdAt)}</span>
                <span>•</span>
                <span>{data.messages.length} pesan</span>
              </div>
            </div>

            {/* Message Thread */}
            <div className="space-y-6">
              {data.messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    className={cn(
                      "flex gap-3",
                      isUser ? "flex-row-reverse" : "flex-row"
                    )}
                    key={message.id}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full font-medium text-xs",
                        isUser
                          ? "bg-muted text-muted-foreground"
                          : "bg-[#e6f7f9] text-[#00b2be] dark:bg-[#003c42] dark:text-[#38d4df]"
                      )}
                    >
                      {isUser ? (
                        <UserIcon className="size-4" />
                      ) : (
                        <SparklesIcon className="size-4" />
                      )}
                    </div>

                    {/* Message Body */}
                    <div
                      className={cn(
                        "min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                        isUser
                          ? "rounded-tr-none bg-[#e6f7f9] text-foreground dark:bg-[#002f35]"
                          : "rounded-tl-none border border-border/40 bg-muted/40"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MessageResponse>{message.content}</MessageResponse>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-border/40 border-t py-6 text-center text-muted-foreground text-xs">
        <p>
          Dibagikan menggunakan{" "}
          <Link
            className="font-medium text-foreground hover:underline"
            to="/chat"
          >
            MíngZhàn
          </Link>{" "}
          — Autonomous Agentic Workspace
        </p>
      </footer>
    </div>
  );
}
