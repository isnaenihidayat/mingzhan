import type { SharedLinkSummary } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Delete02Icon } from "hugeicons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/use-auth";
import { buildChatPath } from "@/lib/chat-history";
import { client, formatError } from "@/lib/client";

export function SharedLinksSettingsRow() {
  const [open, setOpen] = useState(false);

  const [confirm, setConfirm] = useState<SharedLinkSummary | "all" | null>(
    null
  );

  const { activeOrg, user } = useAuth();

  const links = useQuery({
    enabled: open,
    queryFn: () => client.listSharedLinks(),
    queryKey: ["sharedLinks", activeOrg?.id, user?.id],
  });

  const revoke = useMutation({
    mutationFn: (link: SharedLinkSummary | null) =>
      client.revokeSharedLinks(link ?? undefined),
    onSuccess: async () => {
      await links.refetch();
    },
  });

  const rows = links.data?.links ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="font-medium text-foreground text-sm">Shared links</p>
        <Button onClick={() => setOpen(true)} size="sm" variant="outline">
          Manage
        </Button>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Shared links</DialogTitle>
            <DialogDescription>
              Anyone with a shared link can view its content. Deleting a link
              stops access without deleting the original conversation or file.
              Names open your original content.
            </DialogDescription>
          </DialogHeader>
          {links.error || revoke.error ? (
            <p className="text-destructive text-sm" role="alert">
              {formatError(links.error || revoke.error)}
            </p>
          ) : null}
          {links.isPending ? <p role="status">Loading shared links…</p> : null}
          {links.error ? (
            <Button onClick={() => void links.refetch()} variant="outline">
              Try again
            </Button>
          ) : null}
          <div className="min-h-0 overflow-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="whitespace-nowrap p-4 font-medium">
                    Date shared
                  </th>
                  <th className="p-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((link) => (
                  <tr
                    className="border-b last:border-0"
                    key={`${link.kind}:${link.id}`}
                  >
                    <td className="max-w-80 break-words p-4">
                      <Link
                        className="underline underline-offset-4"
                        onClick={() => setOpen(false)}
                        to={
                          link.kind === "chat" &&
                          link.sessionId &&
                          link.profileId
                            ? buildChatPath(link.profileId, link.sessionId)
                            : "/files"
                        }
                      >
                        {link.name}
                      </Link>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {link.kind === "chat"
                        ? "Chat"
                        : link.mimeType?.startsWith("image/")
                          ? "Image"
                          : "File"}
                    </td>
                    <td className="whitespace-nowrap p-4 text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-2">
                      <Button
                        aria-label={`Delete shared link: ${link.name}`}
                        disabled={revoke.isPending}
                        onClick={() => {
                          revoke.reset();
                          setConfirm(link);
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Delete02Icon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!(links.isPending || links.error) && rows.length === 0 ? (
                  <tr>
                    <td
                      className="p-8 text-center text-muted-foreground"
                      colSpan={4}
                    >
                      No shared links.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={
                rows.length === 0 || revoke.isPending || links.isFetching
              }
              onClick={() => {
                revoke.reset();
                setConfirm("all");
              }}
              variant="destructive"
            >
              Delete all shared links
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirm ? (
        <ConfirmDialog
          confirmLabel="Delete"
          description="Existing links will stop working. Your original conversations and files will remain available."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await revoke.mutateAsync(confirm === "all" ? null : confirm);
            setConfirm(null);
          }}
          title={
            confirm === "all"
              ? "Delete all shared links?"
              : "Delete shared link?"
          }
        />
      ) : null}
    </>
  );
}
