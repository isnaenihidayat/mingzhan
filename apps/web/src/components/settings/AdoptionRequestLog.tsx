import type {
  LlmRequestLogFilters,
  LlmRequestLogPage,
  LlmUsageGroupStats,
} from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { Input } from "@mingzhan/ui/input";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/context/use-auth";
import { buildChatPath } from "@/lib/chat-history";
import { formatUsd } from "@/lib/chat-usage";
import { client, formatError } from "@/lib/client";

export function AdoptionRequestLog({
  account,
  onClose,
  orgId,
  userId,
}: {
  account: LlmUsageGroupStats;
  onClose: () => void;
  orgId: string;
  userId: string;
}) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<LlmRequestLogFilters>({});

  const log = useInfiniteQuery({
    getNextPageParam: (lastPage: LlmRequestLogPage) =>
      lastPage.nextCursor ?? undefined,
    // SAFETY: The first page has no cursor. Subsequent cursors are numeric IDs.
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }): Promise<LlmRequestLogPage> =>
      client.forOrg(orgId).listLlmRequestLog(userId, {
        ...filters,
        before: pageParam ?? undefined,
      }),
    queryKey: ["usage-request-log", orgId, user?.id, userId, filters],
  });

  const rows = log.data?.pages.flatMap((page) => page.entries) ?? [];
  const recordedSince = log.data?.pages[0]?.recordedSince;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get("status");
    setFilters({
      from: String(form.get("from") ?? "") || undefined,
      model: String(form.get("model") ?? "").trim() || undefined,
      status:
        status === "success" || status === "failed" || status === "cancelled"
          ? status
          : undefined,
      to: String(form.get("to") ?? "") || undefined,
    });
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Request log · {account.name ?? userId}</DialogTitle>
          <DialogDescription>
            {account.requestCount.toLocaleString()} tracked requests ·{" "}
            {account.totalTokens.toLocaleString()} tokens.
            {recordedSince
              ? ` Detailed records since ${new Date(recordedSince).toLocaleString()}.`
              : " Detailed records are available for new requests only."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={applyFilters}
        >
          <label className="space-y-1 text-sm">
            <span>From (UTC)</span>
            <Input name="from" type="date" />
          </label>
          <label className="space-y-1 text-sm">
            <span>To (UTC)</span>
            <Input name="to" type="date" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Model ID</span>
            <Input maxLength={256} name="model" placeholder="All models" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Status</span>
            <select
              className="block h-9 rounded-md border bg-background px-2"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
        {log.isPending && <p role="status">Loading requests…</p>}
        {log.error && (
          <div className="flex items-center gap-2">
            <p className="text-destructive text-sm" role="alert">
              {formatError(log.error)}
            </p>
            <Button onClick={() => void log.refetch()} variant="outline">
              Try again
            </Button>
          </div>
        )}
        {log.isSuccess && rows.length === 0 && (
          <p>No matching request records.</p>
        )}
        {rows.length > 0 && (
          <div className="min-h-0 overflow-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  {[
                    "Time",
                    "Agent",
                    "Provider / model",
                    "Status",
                    "Input / output",
                    "Est. cost",
                    "Duration",
                    "Chat",
                  ].map((label) => (
                    <th
                      className="whitespace-nowrap p-3 font-medium"
                      key={label}
                      scope="col"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-b last:border-0" key={row.id}>
                    <td className="whitespace-nowrap p-3">
                      {new Date(row.startedAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {row.agentName ?? row.profileId ?? "—"}
                    </td>
                    <td className="p-3">
                      {row.provider} / {row.modelId}
                    </td>
                    <td className="p-3 capitalize">{row.status}</td>
                    <td className="whitespace-nowrap p-3">
                      {row.inputTokens?.toLocaleString() ?? "—"} /{" "}
                      {row.outputTokens?.toLocaleString() ?? "—"}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {row.estimatedCostUsd === null
                        ? "—"
                        : formatUsd(row.estimatedCostUsd)}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {row.durationMs.toLocaleString()} ms
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {row.chat ? (
                        <Button
                          nativeButton={false}
                          render={
                            <a
                              href={buildChatPath(
                                row.chat.profileId,
                                row.chat.sessionId
                              )}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Open chat
                            </a>
                          }
                          size="sm"
                          variant="outline"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {log.hasNextPage && (
          <Button
            disabled={log.isFetching}
            onClick={() => void log.fetchNextPage()}
            variant="outline"
          >
            {log.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
