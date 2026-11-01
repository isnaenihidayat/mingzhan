import { Button } from "@mingzhan/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mingzhan/ui/dropdown-menu";
import { Input } from "@mingzhan/ui/input";
import { ArrowDown01Icon, Search01Icon } from "hugeicons-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/use-auth";
import {
  isNewerPluginVersion,
  isPluginLifecycleBusy,
  nextPluginVersions,
  usePluginAgentAccess,
} from "@/hooks/use-plugins";
import { formatError } from "@/lib/client";
import { canAccessSystemPage, canManagePluginReleases } from "@/lib/navigation";
import { LocalPluginInstaller } from "@/pages/plugins/local-plugin-installer";
import { PluginAgentAccessDialog } from "@/pages/plugins/plugin-agent-access-dialog";
import { PluginConfirmDialog } from "@/pages/plugins/plugin-confirm-dialog";
import { PluginRow } from "@/pages/plugins/plugin-row";
import {
  type PluginFilter,
  pluginMatchesFilter,
  pluginMatchesQuery,
  usePluginCatalog,
  usePluginManagement,
} from "@/pages/plugins/use-plugin-management";

export function PluginsPage() {
  const { pluginId: selectedPluginId } = useParams<{ pluginId: string }>();
  const { user, activeOrg } = useAuth();
  const isPlatformAdmin = user?.isPlatformAdmin === true;
  const canManage = canAccessSystemPage(isPlatformAdmin, activeOrg?.role);
  const canInstallPackages = canManagePluginReleases(isPlatformAdmin);
  const orgId = activeOrg?.id ?? "";

  const {
    plugins,
    official,
    releases,
    pluginIds,
    updates,
    isLoading,
    catalogLoading,
    error: queryError,
  } = usePluginCatalog(canInstallPackages);

  const {
    accessDialog,
    actionError,
    busy,
    closeDialog,
    confirmDialog,
    dialog,
    handleUpdate,
    previewNpmPackage,
    reinstallOfficial,
    rememberFocus,
    setAccessDialog,
    setActionError,
    setDialog,
  } = usePluginManagement(canInstallPackages, orgId);

  const agentAccess = usePluginAgentAccess();
  const accessData = isPlatformAdmin ? agentAccess.data : undefined;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PluginFilter>("All");
  const [folderOpen, setFolderOpen] = useState(false);

  if (isLoading && plugins.length === 0) {
    return <PluginEmptyState detail={Boolean(selectedPluginId)} loading />;
  }

  const errorMessage =
    actionError ?? (queryError ? formatError(queryError) : null);

  const needle = query.trim().toLowerCase();
  const canInstallHere = canInstallPackages && Boolean(orgId);

  const visiblePluginIds = selectedPluginId
    ? pluginIds.filter((id) => id === selectedPluginId)
    : pluginIds.filter(
        (id) =>
          pluginMatchesQuery(id, needle, { official, plugins, releases }) &&
          pluginMatchesFilter(id, filter, plugins, releases)
      );

  const renderRow = (pluginId: string) => {
    const plugin = plugins.find((item) => item.pluginId === pluginId);
    const catalog = official.find((item) => item.id === pluginId);

    const pluginReleases = releases.filter(
      (item) => item.pluginId === pluginId
    );

    const updatable =
      plugin?.installed &&
      ["enabled", "disabled"].includes(plugin.lifecycleState);

    const registryUpdate = updatable
      ? updates.find(
          (item) =>
            item.pluginId === pluginId &&
            isNewerPluginVersion(item.version, plugin)
        )
      : undefined;

    const updateVersion = updatable
      ? (nextPluginVersions(plugin)[0] ?? registryUpdate?.version)
      : undefined;

    return (
      <PluginRow
        accessCount={accessData?.counts[pluginId]}
        busy={busy || Boolean(plugin && isPluginLifecycleBusy(plugin))}
        canManage={canManage}
        canManageAgentAccess={isPlatformAdmin}
        catalogDescription={catalog?.description}
        detail={Boolean(selectedPluginId)}
        icon={plugin?.icon ?? catalog?.icon ?? pluginReleases[0]?.manifest.icon}
        key={pluginId}
        name={
          plugin?.name ??
          catalog?.name ??
          pluginReleases[0]?.manifest.name ??
          pluginId
        }
        official={Boolean(catalog)}
        onAction={(type, target) => {
          rememberFocus(target);
          setActionError(null);

          if (type === "install" && catalog) {
            setDialog({
              description: catalog.description,
              name: catalog.name,
              pluginId,
              type: "official-install",
            });

            return;
          }

          if (type === "remove-plugin" || type === "force-delete") {
            setDialog({
              pluginId,
              type,
              versions: pluginReleases.map((item) => item.version),
            });

            return;
          }

          if (!plugin) {
            return;
          }

          if (type === "access") {
            setAccessDialog({ orgId, plugin });

            return;
          }

          if (type === "reinstall") {
            void reinstallOfficial
              .mutateAsync({
                expectedRevision: plugin.revision,
                pluginId,
              })
              .catch((err) => setActionError(formatError(err)));

            return;
          }

          if (type === "update") {
            const version = nextPluginVersions(plugin)[0];

            if (version) {
              void handleUpdate(plugin, version);
            } else if (registryUpdate) {
              // Nobody approved this version yet: review it, then update.
              void previewNpmPackage(
                {
                  packageName: registryUpdate.packageName,
                  version: registryUpdate.version,
                },
                plugin
              );
            }

            return;
          }

          setDialog({ plugin, type });
        }}
        onRemove={(release, event) => {
          rememberFocus(event.currentTarget);
          setDialog({
            pluginId,
            type: "remove-release",
            version: release.version,
          });
        }}
        plugin={plugin}
        pluginId={pluginId}
        releases={pluginReleases}
        updateVersion={canManage ? updateVersion : undefined}
      />
    );
  };

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-8">
      <PluginPageHeader
        busy={busy}
        canInstall={canInstallHere}
        detail={Boolean(selectedPluginId)}
        error={dialog ? null : errorMessage}
        filter={filter}
        onFilterChange={setFilter}
        onInstall={(target) => {
          rememberFocus(target);
          setActionError(null);
          setDialog({ type: "package-entry" });
        }}
        onInstallFromFolder={() => setFolderOpen(true)}
        onQueryChange={setQuery}
        query={query}
      />
      {canInstallHere ? (
        <LocalPluginInstaller
          key={orgId}
          onOpenChange={setFolderOpen}
          open={folderOpen}
          orgId={orgId}
        />
      ) : null}

      {visiblePluginIds.length === 0 ? (
        <PluginEmptyState
          detail={Boolean(selectedPluginId)}
          filtered={pluginIds.length > 0}
          loading={catalogLoading}
        />
      ) : (
        <ul
          className={
            selectedPluginId
              ? "min-w-0"
              : "grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2"
          }
        >
          {visiblePluginIds.map(renderRow)}
        </ul>
      )}

      {isPlatformAdmin && accessDialog?.orgId === orgId ? (
        <PluginAgentAccessDialog
          key={`${orgId}:${accessDialog.plugin.pluginId}`}
          onClose={closeDialog}
          plugin={accessDialog.plugin}
        />
      ) : null}
      <PluginConfirmDialog
        busy={busy}
        dialog={dialog}
        error={actionError}
        onClose={closeDialog}
        onConfirm={() => void confirmDialog()}
        onPreview={(source) => void previewNpmPackage(source)}
      />
    </div>
  );
}

function PluginEmptyState({
  detail,
  filtered = false,
  loading,
}: {
  detail: boolean;
  filtered?: boolean;
  loading: boolean;
}) {
  let message = detail ? "Plugin not found." : "No plugins available.";

  if (filtered && !detail) {
    message = "No plugins match.";
  }

  if (loading) {
    message = "Loading plugins…";
  }

  return (
    <p className="py-10 text-center text-muted-foreground text-sm">{message}</p>
  );
}

function PluginPageHeader({
  busy,
  canInstall,
  detail,
  error,
  onInstall,
  onInstallFromFolder,
  onQueryChange,
  filter,
  onFilterChange,
  query,
}: {
  busy: boolean;
  canInstall: boolean;
  detail: boolean;
  error: string | null;
  onInstall(target: HTMLElement | null): void;
  onInstallFromFolder(): void;
  onQueryChange(query: string): void;
  query: string;
  filter: PluginFilter;
  onFilterChange(filter: PluginFilter): void;
}) {
  const installRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="space-y-3">
      {detail ? (
        <Link
          className="block w-fit text-muted-foreground text-sm hover:text-foreground"
          to="/customize/plugins"
        >
          ← Back to plugins
        </Link>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 pt-3">
            <div className="min-w-0 space-y-2">
              <h1 className="font-semibold text-2xl tracking-tight">Plugins</h1>
              <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
                Browse, install, and manage plugins for your workspace.
              </p>
            </div>
            {canInstall ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="h-10 shrink-0 rounded-xl"
                      disabled={busy}
                      ref={installRef}
                      variant="outline"
                    />
                  }
                >
                  Add plugin
                  <ArrowDown01Icon aria-hidden="true" className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={onInstallFromFolder}>
                    Made by an agent
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onInstall(installRef.current)}
                  >
                    From npm package
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 pt-4 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search01Icon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search plugins"
                className="h-12 rounded-xl bg-muted/30 pl-12"
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search plugins by name, description, or source"
                type="search"
                value={query}
              />
            </div>
            <div
              aria-label="Filter plugins"
              className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1"
              role="group"
            >
              {(["All", "Installed", "Available", "Local"] as const).map(
                (item) => (
                  <Button
                    aria-pressed={filter === item}
                    className={
                      filter === item
                        ? "h-10 flex-1 rounded-lg bg-muted text-foreground lg:flex-none"
                        : "h-10 flex-1 rounded-lg text-muted-foreground lg:flex-none"
                    }
                    key={item}
                    onClick={() => onFilterChange(item)}
                    variant="ghost"
                  >
                    {item}
                  </Button>
                )
              )}
            </div>
          </div>
        </>
      )}
      {error ? (
        <p
          className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
