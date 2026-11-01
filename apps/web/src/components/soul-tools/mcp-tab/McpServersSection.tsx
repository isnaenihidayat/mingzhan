import type { McpServerSummary } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import { Card, CardContent } from "@mingzhan/ui/card";
import { Input } from "@mingzhan/ui/input";
import { Spinner } from "@mingzhan/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@mingzhan/ui/tooltip";
import { cn } from "@mingzhan/ui/utils";
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Loading03Icon as LoaderIcon,
  PencilIcon,
  Plug01Icon,
  RefreshIcon,
  Search01Icon,
} from "hugeicons-react";
import { useId, useState } from "react";
import { McpServerTools } from "@/components/soul-tools/mcp-tab/McpServerTools";
import type { PopularServer } from "./mcp-connect-app-views";
import { unregisteredPopularServers } from "./popular-mcp-servers";
import { mcpServerDeleteBlockReason } from "./shared";

export function McpPageState({
  message,
  embedded = false,
}: {
  message: string;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-6 text-muted-foreground text-sm",
        !embedded && "mx-auto max-w-3xl"
      )}
    >
      <Spinner className="size-4" />
      {message}
    </div>
  );
}

function McpServerActions({
  server,
  busy,
  syncing,
  onEdit,
  onConnect,
  onTestConnection,
  onSync,
  onDelete,
}: {
  server: McpServerSummary;
  busy: boolean;
  syncing: boolean;
  onEdit: () => void;
  onConnect: () => void;
  onTestConnection: () => void;
  onSync: () => void;
  onDelete: () => void;
}) {
  const deleteBlockReason = mcpServerDeleteBlockReason(server);
  const deleteReasonId = useId();

  return (
    <div className="flex flex-wrap items-center gap-1 py-1 [&_button]:min-h-8 pointer-coarse:[&_button]:min-h-11">
      {server.status === "connected" ? null : (
        <Button disabled={busy} onClick={onConnect} size="sm" type="button">
          <Plug01Icon aria-hidden />
          {server.status === "needs_auth" ? "Sign in" : "Connect"}
        </Button>
      )}
      <Button
        disabled={busy}
        onClick={onTestConnection}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Plug01Icon aria-hidden />
        Test connection
      </Button>
      <Button
        disabled={busy}
        onClick={onEdit}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PencilIcon aria-hidden />
        Edit
      </Button>
      <Button
        aria-busy={syncing}
        disabled={busy}
        onClick={onSync}
        size="sm"
        type="button"
        variant="ghost"
      >
        {syncing ? (
          <LoaderIcon aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <RefreshIcon aria-hidden />
        )}
        {syncing ? "Syncing…" : "Sync tools"}
      </Button>
      {deleteBlockReason ? (
        <Tooltip>
          <TooltipTrigger
            aria-describedby={deleteReasonId}
            render={
              <Button
                className="text-muted-foreground opacity-50"
                disabled
                focusableWhenDisabled
                size="sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <Delete02Icon aria-hidden />
            Delete
          </TooltipTrigger>
          <TooltipContent id={deleteReasonId} role="tooltip">
            {deleteBlockReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Button
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={onDelete}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Delete02Icon aria-hidden />
          Delete
        </Button>
      )}
    </div>
  );
}

export function McpServersSection({
  servers,
  busy,
  syncingServerId = null,
  embedded = false,
  expandedServerId,
  onToggleServer,
  onAddServer,
  onAddPreset,
  onEdit,
  onConnect,
  onTestConnection,
  onSync,
  onDelete,
}: {
  servers: McpServerSummary[];
  busy: boolean;
  syncingServerId?: string | null;
  embedded?: boolean;
  onAddServer: () => void;
  onAddPreset?: (preset: PopularServer) => void;
  expandedServerId: string | null;
  onToggleServer: (serverId: string | null) => void;
  onEdit: (serverId: string) => void;
  onConnect: (serverId: string) => void;
  onTestConnection: (serverId: string) => void;
  onSync: (serverId: string) => void;
  onDelete: (server: McpServerSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const needle = query.trim().toLowerCase();

  const library = unregisteredPopularServers(servers).filter(
    (item) =>
      (filter === "all" || filter === "http") &&
      `${item.name} ${item.description}`.toLowerCase().includes(needle)
  );

  const orderedServers = [...servers]
    .filter(
      (item) =>
        (filter === "all" || item.transport === filter) &&
        `${item.name} ${item.status} ${item.transport}`
          .toLowerCase()
          .includes(needle)
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

  return (
    <section
      className={cn(
        "min-w-0 space-y-8",
        embedded ? "p-4" : "mx-auto max-w-6xl"
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-semibold text-2xl tracking-tight">
            Model Context Protocol (MCP)
          </h1>
          <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
            Connect MCP servers to expand what your agents can do. Add a server
            from the library or configure your own.
          </p>
        </div>
        <Button
          className="h-10 shrink-0 rounded-xl"
          disabled={busy}
          onClick={onAddServer}
          variant="outline"
        >
          Add custom server
        </Button>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search01Icon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search MCP servers"
            className="h-12 rounded-xl bg-muted/30 pl-12"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search MCP servers"
            type="search"
            value={query}
          />
        </div>
        <select
          aria-label="Filter MCP transport"
          className="h-12 rounded-xl border border-border bg-background px-4 text-sm"
          onChange={(event) => setFilter(event.target.value)}
          value={filter}
        >
          <option value="all">All</option>
          <option value="http">HTTP</option>
          <option value="stdio">STDIO</option>
        </select>
      </div>
      <h2 className="font-semibold text-base">Installed</h2>
      <Card className="w-full overflow-hidden shadow-none">
        <CardContent className="p-0">
          {orderedServers.length === 0 ? (
            <div className="space-y-2 p-10 text-center text-sm">
              <p>
                {servers.length
                  ? "No installed servers match your filters."
                  : "No MCP servers installed yet."}
              </p>
              <p className="text-muted-foreground">
                Pick one from the library below to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orderedServers.map((server) => {
                const assignedProfileCount = server.assignedProfileCount ?? 0;

                return (
                  <li key={server.id}>
                    <button
                      aria-controls={`mcp-tools-${server.id}`}
                      aria-expanded={expandedServerId === server.id}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                      onClick={() =>
                        onToggleServer(
                          expandedServerId === server.id ? null : server.id
                        )
                      }
                      type="button"
                    >
                      <ArrowRight01Icon
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground",
                          expandedServerId === server.id && "rotate-90"
                        )}
                      />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="break-all text-foreground text-sm">
                            {server.name}
                          </span>
                          {assignedProfileCount > 0 ? (
                            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                              {assignedProfileCount} profile
                              {assignedProfileCount === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          {server.status === "needs_auth" ? (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 text-xs dark:text-amber-300">
                              Sign-in required
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-muted-foreground text-xs">
                          {server.transport.toUpperCase()} · {server.toolCount}{" "}
                          tool
                          {server.toolCount === 1 ? "" : "s"}
                          {server.status === "needs_auth"
                            ? ""
                            : ` · ${server.status === "connected" ? "Connected" : server.status === "error" ? "Error" : "Disconnected"}`}
                        </span>
                        {server.lastError ? (
                          <span className="block break-words text-destructive text-xs">
                            {server.lastError}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <div
                      hidden={expandedServerId !== server.id}
                      id={`mcp-tools-${server.id}`}
                    >
                      {expandedServerId === server.id ? (
                        <div className="space-y-3 border-border border-t bg-muted/10 p-4">
                          <McpServerActions
                            busy={busy}
                            onConnect={() => onConnect(server.id)}
                            onDelete={() => onDelete(server)}
                            onEdit={() => onEdit(server.id)}
                            onSync={() => onSync(server.id)}
                            onTestConnection={() => onTestConnection(server.id)}
                            server={server}
                            syncing={syncingServerId === server.id}
                          />
                          <McpServerTools server={server} />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <section aria-label="MCP library" className="space-y-4">
        <h2 className="font-semibold text-base">Library</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {library.map((item) => (
            <article
              className="flex min-w-0 gap-4 rounded-2xl bg-muted/40 p-5 sm:p-6"
              key={item.name}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border">
                <svg
                  aria-hidden="true"
                  className="size-6 fill-current"
                  viewBox={item.viewBox}
                >
                  <path d={item.path} />
                </svg>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base">{item.name}</h3>
                    <p className="mt-1 text-muted-foreground text-xs">
                      HTTP · {item.auth === "token" ? "Token" : "OAuth"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Add ${item.name} MCP server`}
                    className="shrink-0 rounded-full bg-muted"
                    disabled={busy}
                    onClick={() =>
                      onAddPreset ? onAddPreset(item) : onAddServer()
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Add01Icon aria-hidden="true" className="size-5" />
                  </Button>
                </div>
                <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
        {library.length ? null : (
          <p className="rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No additional servers match your filters.
          </p>
        )}
      </section>
    </section>
  );
}
