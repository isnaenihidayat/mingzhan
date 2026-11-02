import type {
  McpServerResponse,
  McpServerSummary,
} from "@mingzhan/core/contract";
import { isPreinstalledMcpServerId } from "@mingzhan/core/mcp/preinstalled";
import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { Spinner } from "@mingzhan/ui/spinner";
import { useEffect, useState } from "react";
import { McpServerAuthorizeDialog } from "@/components/soul-tools/mcp-tab/McpServerAuthorizeDialog";
import { McpServerDialog } from "@/components/soul-tools/mcp-tab/McpServerDialog";
import {
  McpPageState,
  McpServersSection,
} from "@/components/soul-tools/mcp-tab/McpServersSection";
import type { PopularServer } from "@/components/soul-tools/mcp-tab/mcp-connect-app-views";
import { useMcpServersQuery } from "@/hooks/use-app-queries";
import {
  useConnectMcpServerMutation,
  useCreateMcpServerMutation,
  useDeleteMcpServerMutation,
  useSyncMcpServerMutation,
  useUpdateMcpServerMutation,
} from "@/hooks/use-resource-mutations";
import { client, formatError } from "@/lib/client";

/** The callback connects the server on its own, so the list is re-read until it lands. */
const AUTHORIZATION_POLL_INTERVAL_MS = 3000;

function findMcpTargets(
  servers: McpServerSummary[],
  authId: string | undefined,
  editId: string | null
) {
  return {
    editServer: servers.find((server) => server.id === editId) ?? null,
    pendingAuthStatus: authId
      ? servers.find((server) => server.id === authId)?.status
      : undefined,
  };
}

async function testMcpConnection(server: McpServerSummary) {
  const result = await client.testMcpServer({
    config: server.transport === "http" ? { url: "" } : { command: "" },
    name: server.name,
    serverId: server.id,
    transport: server.transport,
  });

  if (!result.ok) {
    throw new Error(result.error ?? "Connection test failed.");
  }

  return `Connection successful. Found ${result.toolCount} tool${result.toolCount === 1 ? "" : "s"}.`;
}

export function McpTab({ embedded = false }: { embedded?: boolean } = {}) {
  const [pendingAuth, setPendingAuth] = useState<{
    name: string;
    serverId: string;
    url: string;
  } | null>(null);

  const {
    data: servers = [],
    isLoading,
    error,
  } = useMcpServersQuery(
    pendingAuth ? { refetchInterval: AUTHORIZATION_POLL_INTERVAL_MS } : {}
  );

  const createMutation = useCreateMcpServerMutation();
  const updateMutation = useUpdateMcpServerMutation();
  const deleteMutation = useDeleteMcpServerMutation();
  const connectMutation = useConnectMcpServerMutation();
  const syncMutation = useSyncMcpServerMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [createPreset, setCreatePreset] = useState<PopularServer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFromRegistry, setCreateFromRegistry] = useState(false);
  const [editServerId, setEditServerId] = useState<string | null>(null);
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<McpServerSummary | null>(
    null
  );

  const { pendingAuthStatus, editServer } = findMcpTargets(
    servers,
    pendingAuth?.serverId,
    editServerId
  );

  const loading = isLoading && servers.length === 0;

  const busy =
    [
      createMutation,
      updateMutation,
      deleteMutation,
      connectMutation,
      syncMutation,
    ].some((mutation) => mutation.isPending) || testingServerId !== null;

  const errorMessage = actionError ?? (error ? formatError(error) : null);

  useEffect(() => {
    if (pendingAuthStatus === "connected") {
      setPendingAuth(null);
    }
  }, [pendingAuthStatus]);

  function startAuthorization(response: McpServerResponse): boolean {
    if (!response.authorizationUrl) {
      return false;
    }

    setPendingAuth({
      name: response.server.name,
      serverId: response.server.id,
      url: response.authorizationUrl,
    });

    return true;
  }

  function requestDelete(server: McpServerSummary) {
    if (isPreinstalledMcpServerId(server.id)) {
      return;
    }

    setDeleteTarget(server);
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setActionError(null);

    try {
      await deleteMutation.mutateAsync({
        force: true,
        serverId: deleteTarget.id,
      });
      setExpandedServerId((current) =>
        current === deleteTarget.id ? null : current
      );
      setDeleteTarget(null);
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleConnect(serverId: string) {
    setActionError(null);

    try {
      const response = await connectMutation.mutateAsync(serverId);

      if (startAuthorization(response)) {
        return;
      }

      setExpandedServerId(serverId);
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleSync(serverId: string) {
    setActionError(null);

    try {
      await syncMutation.mutateAsync(serverId);
      setExpandedServerId(serverId);
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleTestConnection(server: McpServerSummary) {
    setActionError(null);
    setActionNotice(null);
    setTestingServerId(server.id);

    try {
      setActionNotice(await testMcpConnection(server));
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setTestingServerId(null);
    }
  }

  if (loading) {
    return <McpPageState embedded={embedded} message="Loading MCP servers…" />;
  }

  return (
    <>
      {errorMessage ? (
        <p className="mx-auto mb-4 max-w-3xl rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {errorMessage}
        </p>
      ) : null}
      {actionNotice ? (
        <p className="mx-auto mb-4 max-w-3xl rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-700 text-sm dark:text-emerald-300">
          {actionNotice}
        </p>
      ) : null}

      <McpServerAuthorizeDialog
        authorizationUrl={pendingAuth?.url ?? null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingAuth(null);
          }
        }}
        open={pendingAuth !== null}
        serverName={pendingAuth?.name ?? ""}
      />

      <McpServersSection
        busy={busy}
        embedded={embedded}
        expandedServerId={expandedServerId}
        onAddPreset={(preset) => {
          setCreateFromRegistry(false);
          setCreatePreset(preset);
          setCreateOpen(true);
        }}
        onAddServer={() => {
          setCreateFromRegistry(false);
          setCreatePreset(null);
          setCreateOpen(true);
        }}
        onConnect={(serverId) => void handleConnect(serverId)}
        onDelete={requestDelete}
        onEdit={setEditServerId}
        onSearchRegistry={() => {
          setCreateFromRegistry(true);
          setCreatePreset(null);
          setCreateOpen(true);
        }}
        onSync={(serverId) => void handleSync(serverId)}
        onTestConnection={(serverId) => {
          const server = servers.find((item) => item.id === serverId);

          if (server) {
            void handleTestConnection(server);
          }
        }}
        onToggleServer={setExpandedServerId}
        servers={servers}
        syncingServerId={syncMutation.isPending ? syncMutation.variables : null}
      />

      <McpServerDialog
        busy={createMutation.isPending}
        initialCustom={!createFromRegistry}
        initialPreset={createPreset ?? undefined}
        key={createPreset?.name ?? (createFromRegistry ? "registry" : "custom")}
        onOpenChange={(open) => {
          setCreateOpen(open);

          if (!open) {
            setActionError(null);
          }
        }}
        onSubmit={async (request) => {
          setActionError(null);

          try {
            const response = await createMutation.mutateAsync({
              ...request,
              connect: true,
            });

            if (!response.authorizationUrl) {
              setCreateOpen(false);
              setExpandedServerId(response.server.id);
            }

            return response;
          } catch (err) {
            const message = formatError(err);
            setActionError(message);
            throw new Error(message);
          }
        }}
        open={createOpen}
      />

      <McpEditServerDialog
        connectMutation={connectMutation}
        onClose={() => {
          setEditServerId(null);
          setActionError(null);
        }}
        onError={setActionError}
        open={editServerId !== null}
        server={editServer}
        updateMutation={updateMutation}
      />

      <DeleteMcpServerDialog
        busy={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        target={deleteTarget}
      />
    </>
  );
}

function McpEditServerDialog({
  connectMutation,
  onClose,
  onError,
  open,
  server,
  updateMutation,
}: {
  connectMutation: ReturnType<typeof useConnectMcpServerMutation>;
  onClose: () => void;
  onError: (message: string | null) => void;
  open: boolean;
  server: McpServerSummary | null;
  updateMutation: ReturnType<typeof useUpdateMcpServerMutation>;
}) {
  return (
    <McpServerDialog
      busy={updateMutation.isPending || connectMutation.isPending}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      onSubmit={async (request) => {
        if (!server) {
          return;
        }

        onError(null);

        try {
          const wasConnected = server.status === "connected";
          const { connect: _connect, ...updateRequest } = request;
          await updateMutation.mutateAsync({
            request: updateRequest,
            serverId: server.id,
          });
          onClose();

          if (wasConnected) {
            await connectMutation.mutateAsync(server.id);
          }
        } catch (err) {
          const message = formatError(err);
          onError(message);
          throw new Error(message);
        }
      }}
      open={open}
      server={server}
    />
  );
}

function DeleteMcpServerDialog({
  busy,
  onClose,
  onConfirm,
  target,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  target: McpServerSummary | null;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || busy)) {
          onClose();
        }
      }}
      open={target !== null}
    >
      <DialogContent className="gap-6 p-6 sm:max-w-md">
        <DialogHeader className="gap-3">
          <DialogTitle>Delete MCP server?</DialogTitle>
          <DialogDescription>
            Remove {target?.name ? `"${target.name}"` : "this MCP server"}. This
            cannot be undone.
            {(target?.assignedProfileCount ?? 0) > 0
              ? ` It will also unassign this server from ${target?.assignedProfileCount} profile${target?.assignedProfileCount === 1 ? "" : "s"}.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mx-0 mb-0 gap-2 border-0 bg-transparent p-0 sm:flex-row sm:justify-end">
          <Button
            disabled={busy}
            onClick={() => onClose()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {busy ? (
              <Spinner className="size-4" />
            ) : (target?.assignedProfileCount ?? 0) > 0 ? (
              "Force delete"
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
