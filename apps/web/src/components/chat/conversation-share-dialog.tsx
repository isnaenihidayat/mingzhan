import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { Input } from "@mingzhan/ui/input";
import { Spinner } from "@mingzhan/ui/spinner";
import {
  CheckmarkCircle01Icon,
  Copy01Icon,
  Share04Icon,
} from "hugeicons-react";
import { useEffect, useState } from "react";
import { client, formatError } from "@/lib/client";

interface ConversationShareDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sessionId: string;
  sessionTitle: string;
}

export function ConversationShareDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
}: ConversationShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(open && sessionId)) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCopied(false);

    client
      .getConversationShareStatus(sessionId)
      .then((status) => {
        if (!cancelled && status?.active) {
          setShareId(status.id);

          const fullUrl =
            status.shareUrl || `${window.location.origin}${status.sharePath}`;

          setShareUrl(fullUrl);
        } else if (!cancelled) {
          setShareId(null);
          setShareUrl(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);

    try {
      const res = await client.publishConversationShare(sessionId, {
        clientOrigin: window.location.origin,
      });

      const fullUrl =
        res.shareUrl || `${window.location.origin}${res.sharePath}`;

      setShareUrl(fullUrl);
      setShareId(res.status.id);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setPublishing(false);
    }
  };

  const handleRevoke = async () => {
    if (!shareId) {
      return;
    }
    setRevoking(true);
    setError(null);

    try {
      await client.revokeConversationShare(sessionId, shareId);
      setShareUrl(null);
      setShareId(null);
      setCopied(false);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#e6f7f9] text-[#00b2be] dark:bg-[#003c42] dark:text-[#38d4df]">
              <Share04Icon className="size-4" />
            </div>
            <DialogTitle>Bagikan Percakapan</DialogTitle>
          </div>
          <DialogDescription>
            Buat tautan publik agar siapa pun dapat membaca salinan percakapan{" "}
            <span className="font-medium text-foreground">
              "{sessionTitle}"
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Spinner className="size-5" />
          </div>
        ) : shareUrl ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Input
                className="select-all bg-muted/50 font-mono text-xs"
                readOnly
                value={shareUrl}
              />
              <Button
                className="shrink-0 gap-1.5 bg-[#00b2be] text-white hover:bg-[#009ca6]"
                onClick={handleCopy}
                size="sm"
              >
                {copied ? (
                  <>
                    <CheckmarkCircle01Icon className="size-3.5" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy01Icon className="size-3.5" />
                    Salin
                  </>
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Tautan ini aktif dan dapat dibuka oleh siapa saja tanpa harus
              login. Pesan baru yang dikirim setelah tautan dibuat tidak akan
              otomatis masuk kecuali diperbarui.
            </p>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <DialogFooter className="flex items-center justify-between pt-2 sm:justify-between">
              <Button
                className="text-destructive hover:bg-destructive/10"
                disabled={revoking}
                onClick={handleRevoke}
                size="sm"
                variant="ghost"
              >
                {revoking ? "Mencabut..." : "Cabut Tautan"}
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="outline"
              >
                Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-xs">
              Tautan publik menyertakan riwayat pesan dan kode dalam sesi ini.
              Informasi rahasia atau kunci API tidak disertakan.
            </p>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <DialogFooter className="pt-2">
              <Button
                disabled={publishing}
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="outline"
              >
                Batal
              </Button>
              <Button
                className="gap-1.5 bg-[#00b2be] text-white hover:bg-[#009ca6]"
                disabled={publishing}
                onClick={handlePublish}
                size="sm"
              >
                {publishing ? (
                  <>
                    <Spinner className="size-3.5" />
                    Membuat tautan...
                  </>
                ) : (
                  <>
                    <Share04Icon className="size-3.5" />
                    Buat Tautan Publik
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
