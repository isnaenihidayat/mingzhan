import type {
  OrgPluginDetail,
  PluginReleaseSummary,
} from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mingzhan/ui/dropdown-menu";
import { MoreHorizontalIcon, Tick02Icon } from "hugeicons-react";
import { type MouseEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { pluginRowActions } from "@/hooks/use-plugins";
import { usePinnedPlugins } from "@/hooks/use-sidebar-collapsed";
import { pluginIcon, pluginPagePath } from "@/lib/navigation";
import {
  PLUGIN_DESCRIPTIONS,
  type PluginDialog,
} from "@/pages/plugins/use-plugin-management";

function PluginReleasesList({
  busy,
  plugins,
  releases,
  onRemove,
}: {
  busy: boolean;
  plugins: OrgPluginDetail[];
  releases: PluginReleaseSummary[];
  onRemove(release: PluginReleaseSummary, event: MouseEvent<HTMLElement>): void;
}) {
  if (releases.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-border">
      {releases.map((release) => {
        const inUse = plugins.some(
          (plugin) =>
            plugin.pluginId === release.pluginId &&
            plugin.selectedVersion === release.version &&
            plugin.installed
        );

        return (
          <li
            className="flex flex-wrap items-center justify-between gap-3 py-3"
            key={`${release.pluginId}@${release.version}`}
          >
            <div className="min-w-0">
              <p className="break-all font-mono text-xs">{release.version}</p>
              {release.source === "local" || release.source === "agent" ? (
                <span className="text-xs">
                  {release.source === "agent"
                    ? "Made by an agent"
                    : "From a folder"}
                </span>
              ) : null}
              <p className="text-muted-foreground text-xs">
                {inUse ? "In use" : "Available"}
              </p>
            </div>
            <Button
              disabled={busy || inUse}
              onClick={(event) => {
                onRemove(release, event);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Remove version
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

interface PluginRowProps {
  accessCount?: number;
  busy: boolean;
  canManage: boolean;
  canManageAgentAccess: boolean;
  catalogDescription?: string;
  detail?: boolean;
  icon?: string;
  name: string;
  official: boolean;
  onAction(
    type:
      | Exclude<
          PluginDialog["type"],
          "package" | "package-entry" | "remove-release" | "official-install"
        >
      | "reinstall"
      | "access"
      | "remove-plugin"
      | "force-delete",
    target: HTMLElement | null
  ): void;
  onRemove(release: PluginReleaseSummary, event: MouseEvent<HTMLElement>): void;
  plugin?: OrgPluginDetail;
  pluginId: string;
  releases: PluginReleaseSummary[];
  /** A newer version this org can move to, approved or still in the registry. */
  updateVersion?: string;
}

function PluginCard({
  catalogDescription,
  plugin,
  pluginId,
  name,
  official,
  releases,
  busy,
  canManage,
  canManageAgentAccess,
  onAction,
  updateVersion,
}: PluginRowProps) {
  const local = releases.some(
    (item) => item.source === "local" || item.source === "agent"
  );

  const source = local
    ? "Local"
    : official
      ? "Built-in"
      : releases.some((item) => item.source === "npm")
        ? "npm"
        : "Workspace";

  const version = plugin?.selectedVersion ?? releases[0]?.version;

  return (
    <li className="flex min-w-0 flex-col gap-5 rounded-2xl bg-muted/40 p-5 text-foreground sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-base">
            <Link
              className="break-words rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              to={`/customize/plugins/${encodeURIComponent(pluginId)}`}
            >
              {name}
            </Link>
          </h2>
          <p
            className="mt-1 truncate text-muted-foreground text-sm"
            title={pluginId}
          >
            {source} · {pluginId}
          </p>
        </div>
        <PluginRowControls
          busy={busy}
          canManage={canManage}
          canManageAgentAccess={canManageAgentAccess}
          detail={false}
          name={name}
          official={official}
          onAction={onAction}
          plugin={plugin}
          pluginId={pluginId}
          releases={releases}
          updateVersion={updateVersion}
        />
      </div>
      <p className="line-clamp-2 break-words text-muted-foreground text-sm leading-relaxed">
        {PLUGIN_DESCRIPTIONS.get(pluginId) ||
          plugin?.description ||
          catalogDescription ||
          releases[0]?.manifest.description}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {version ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground text-xs">
            v{version.split("+")[0]}
          </span>
        ) : null}
        {plugin?.installed && plugin.lifecycleState !== "enabled" ? (
          <span className="text-muted-foreground text-xs">
            {plugin.lifecycleState === "disabled"
              ? "Disabled"
              : plugin.lifecycleState}
          </span>
        ) : null}
        {updateVersion ? (
          <span className="text-primary text-xs">Update {updateVersion}</span>
        ) : null}
      </div>
      {plugin?.lastLifecycleError ? (
        <p className="break-words text-destructive text-xs" role="alert">
          {plugin.lastLifecycleError}
        </p>
      ) : null}
    </li>
  );
}

export function PluginRow(props: PluginRowProps) {
  return props.detail ? <PluginDetail {...props} /> : <PluginCard {...props} />;
}

function PluginDetail({
  catalogDescription,
  detail = false,
  plugin,
  icon,
  pluginId,
  name,
  official,
  releases,
  busy,
  canManage,
  canManageAgentAccess,
  accessCount,
  onAction,
  onRemove,
  updateVersion,
}: PluginRowProps) {
  return (
    <li className={detail ? "min-w-0" : "min-w-0 px-4 py-3.5"}>
      <div className="flex flex-wrap items-center gap-3">
        <PluginIdentity
          catalogDescription={catalogDescription}
          detail={detail}
          icon={icon}
          name={name}
          official={official}
          plugin={plugin}
          pluginId={pluginId}
          releases={releases}
          updateVersion={updateVersion}
        />
        <PluginRowControls
          busy={busy}
          canManage={canManage}
          canManageAgentAccess={canManageAgentAccess}
          detail={detail}
          name={name}
          official={official}
          onAction={onAction}
          plugin={plugin}
          pluginId={pluginId}
          releases={releases}
          updateVersion={updateVersion}
        />
      </div>
      {plugin?.lastLifecycleError ? (
        <p className="mt-2 break-words text-destructive text-xs" role="alert">
          {plugin.lastLifecycleError}
        </p>
      ) : null}
      {detail ? (
        <PluginRowDetails
          accessCount={accessCount}
          busy={busy}
          onRemove={onRemove}
          plugin={plugin}
          pluginId={pluginId}
          releases={releases}
        />
      ) : null}
    </li>
  );
}

function PluginIdentity({
  catalogDescription,
  detail,
  icon,
  name,
  official,
  plugin,
  pluginId,
  releases,
  updateVersion,
}: Pick<
  PluginRowProps,
  | "catalogDescription"
  | "detail"
  | "icon"
  | "name"
  | "official"
  | "plugin"
  | "pluginId"
  | "releases"
  | "updateVersion"
>) {
  const canOpen = plugin?.lifecycleState === "enabled" && plugin.ui !== null;

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-3">
      {detail ? null : (
        <Link
          aria-label={`${canOpen ? "Open" : "View details for"} ${name}`}
          className="absolute inset-0 rounded-md hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
          to={
            canOpen
              ? pluginPagePath(pluginId)
              : `/customize/plugins/${encodeURIComponent(pluginId)}`
          }
        />
      )}
      <PluginIcon icon={icon} pluginId={pluginId} />
      <div className="min-w-0 flex-1">
        <h2
          className={
            detail
              ? "break-words font-medium text-lg"
              : "break-words font-medium text-sm"
          }
        >
          {name}
          {!detail && plugin?.selectedVersion ? (
            <span className="ml-2 font-mono font-normal text-[11px] text-muted-foreground">
              {plugin.selectedVersion.split("+")[0]}
            </span>
          ) : null}
          {updateVersion ? (
            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-normal text-[10px] text-primary">
              Update {updateVersion}
            </span>
          ) : null}
        </h2>
        {detail ? (
          <PluginStatusLine official={official} plugin={plugin} />
        ) : (
          <p className="mt-0.5 line-clamp-1 break-words text-muted-foreground text-sm">
            {PLUGIN_DESCRIPTIONS.get(pluginId) ||
              plugin?.description ||
              catalogDescription ||
              releases[0]?.manifest.description}
          </p>
        )}
      </div>
    </div>
  );
}

function PluginStatusLine({
  official,
  plugin,
}: Pick<PluginRowProps, "official" | "plugin">) {
  let status = "Not added";

  if (plugin?.lifecycleState === "enabled") {
    status = "On";
  } else if (plugin?.installed && plugin.lifecycleState !== "retained") {
    status = "Off";
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full bg-muted-foreground/40 data-[state=enabled]:bg-emerald-500"
          data-state={plugin?.lifecycleState}
        />
        {status}
      </span>
      {official ? (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
          Built-in
        </span>
      ) : null}
    </div>
  );
}

function PluginRowControls({
  detail,
  plugin,
  pluginId,
  name,
  official,
  busy,
  canManage,
  canManageAgentAccess,
  onAction,
  releases,
  updateVersion,
}: Pick<
  PluginRowProps,
  | "plugin"
  | "detail"
  | "pluginId"
  | "name"
  | "official"
  | "busy"
  | "canManage"
  | "canManageAgentAccess"
  | "onAction"
  | "releases"
  | "updateVersion"
>) {
  const actions = plugin ? pluginRowActions(plugin) : null;
  const canOpen = plugin?.lifecycleState === "enabled" && plugin.ui !== null;

  const canInstall =
    (!plugin?.installed || plugin.lifecycleState === "retained") &&
    (official || Boolean(plugin));

  return (
    <div className="flex shrink-0 items-center gap-1">
      {canOpen && detail ? (
        <Button
          nativeButton={false}
          render={<Link to={pluginPagePath(pluginId)} />}
          size="sm"
          variant="outline"
        >
          Open
        </Button>
      ) : null}
      {plugin?.lifecycleState === "enabled" && !detail ? (
        <span
          aria-label={`${name} enabled`}
          className="inline-flex size-9 items-center justify-center rounded-full border border-foreground text-foreground"
        >
          <Tick02Icon aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      {canManage && (canInstall || actions?.enable) ? (
        <PluginInstallButton
          busy={busy}
          canInstall={canInstall}
          detail={detail}
          name={name}
          onAction={onAction}
        />
      ) : null}
      <PluginRowMenu
        busy={busy}
        canManage={canManage}
        canManageAgentAccess={canManageAgentAccess}
        detail={detail}
        name={name}
        official={official}
        onAction={onAction}
        plugin={plugin}
        pluginId={pluginId}
        releases={releases}
        updateVersion={updateVersion}
      />
    </div>
  );
}

function PluginInstallButton({
  busy,
  canInstall,
  detail,
  name,
  onAction,
}: Pick<PluginRowProps, "busy" | "detail" | "name" | "onAction"> & {
  canInstall: boolean;
}) {
  return (
    <Button
      aria-label={canInstall ? `Add ${name}` : undefined}
      className={canInstall && !detail ? "h-10 rounded-xl" : undefined}
      disabled={busy}
      onClick={(event) =>
        onAction(canInstall ? "install" : "enable", event.currentTarget)
      }
      size="sm"
      variant={canInstall && !detail ? "outline" : "default"}
    >
      {canInstall && !detail ? <>Install</> : canInstall ? "Add" : "Turn on"}
    </Button>
  );
}

function pluginMenuActions({
  official,
  plugin,
  releases,
  updateVersion,
}: Pick<PluginRowProps, "official" | "plugin" | "releases" | "updateVersion">) {
  const actions = plugin ? pluginRowActions(plugin) : null;

  const all = [
    ["disable", "Turn off", actions?.disable],
    ["update", "Update", actions?.update || Boolean(updateVersion)],
    [
      "reinstall",
      "Reinstall",
      official &&
        (plugin?.lifecycleState === "enabled" ||
          plugin?.lifecycleState === "disabled"),
    ],
    ["uninstall", "Remove", actions?.uninstall],
    ["purge", "Delete saved data", actions?.purge],
    [
      "remove-plugin",
      "Delete plugin",
      !(official || plugin?.installed) && releases.length > 0,
    ],
    [
      "force-delete",
      "Force delete",
      !official &&
        plugin?.installed &&
        releases.some(
          (item) => item.source === "local" || item.source === "agent"
        ),
    ],
  ] as const;

  return all.filter(([, , visible]) => visible);
}

function PluginRowMenu({
  detail,
  pluginId,
  plugin,
  name,
  official,
  busy,
  canManage,
  canManageAgentAccess,
  onAction,
  releases,
  updateVersion,
}: Pick<
  PluginRowProps,
  | "plugin"
  | "pluginId"
  | "detail"
  | "name"
  | "official"
  | "busy"
  | "canManage"
  | "canManageAgentAccess"
  | "onAction"
  | "releases"
  | "updateVersion"
>) {
  const menuRef = useRef<HTMLButtonElement | null>(null);

  const { pinned, toggle: togglePin } = usePinnedPlugins();
  const canPin = plugin?.lifecycleState === "enabled" && plugin.ui !== null;

  const canManageAccess =
    canManageAgentAccess && plugin?.lifecycleState === "enabled";

  const visibleSecondaryActions = canManage
    ? pluginMenuActions({ official, plugin, releases, updateVersion })
    : [];

  const hasMenu =
    !detail || canPin || canManageAccess || visibleSecondaryActions.length > 0;

  if (!hasMenu) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${name}`}
            disabled={busy}
            ref={menuRef}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {detail ? null : (
          <DropdownMenuItem
            render={
              <Link to={`/customize/plugins/${encodeURIComponent(pluginId)}`} />
            }
          >
            View details
          </DropdownMenuItem>
        )}
        {canPin ? (
          <DropdownMenuItem onClick={() => togglePin(pluginId)}>
            {pinned.includes(pluginId)
              ? "Unpin from sidebar"
              : "Pin to sidebar"}
          </DropdownMenuItem>
        ) : null}
        {canManageAccess ? (
          <DropdownMenuItem
            disabled={busy}
            onClick={() => onAction("access", menuRef.current)}
          >
            Choose agents
          </DropdownMenuItem>
        ) : null}
        {visibleSecondaryActions.map(([type, label]) => (
          <DropdownMenuItem
            disabled={busy}
            key={type}
            onClick={() => onAction(type, menuRef.current)}
            variant={
              type === "purge" ||
              type === "uninstall" ||
              type === "remove-plugin" ||
              type === "force-delete"
                ? "destructive"
                : "default"
            }
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PluginRowDetails({
  plugin,
  pluginId,
  releases,
  busy,
  accessCount,
  onRemove,
}: Pick<
  PluginRowProps,
  "plugin" | "pluginId" | "releases" | "busy" | "accessCount" | "onRemove"
>) {
  return (
    <div className="mt-4">
      <div className="mt-3 border-border border-t pt-3 text-muted-foreground text-xs">
        <p className="break-all">
          {pluginId}
          {plugin?.selectedVersion ? ` · ${plugin.selectedVersion}` : ""}
        </p>
        {accessCount !== undefined && plugin?.lifecycleState === "enabled" ? (
          <p className="mt-2">
            Used by {accessCount} {accessCount === 1 ? "agent" : "agents"}
          </p>
        ) : null}
        {plugin?.description ? (
          <p className="mt-2">{plugin.description}</p>
        ) : null}
        <PluginReleasesList
          busy={busy}
          onRemove={onRemove}
          plugins={plugin ? [plugin] : []}
          releases={releases}
        />
      </div>
    </div>
  );
}

function PluginIcon({ icon, pluginId }: { icon?: string; pluginId: string }) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const Icon = pluginIcon(pluginId);

  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-foreground">
      {icon && icon !== failedIcon ? (
        <img
          alt=""
          className="size-full object-contain"
          height={40}
          onError={() => setFailedIcon(icon)}
          referrerPolicy="no-referrer"
          src={icon}
          width={40}
        />
      ) : (
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      )}
    </div>
  );
}
