import type { ProfileSummary, SkillSummary } from "@mingzhan/core/contract";
import type { AVAILABLE_SKILL_PRESETS } from "@mingzhan/core/skills/bundled-names";
import { Button } from "@mingzhan/ui/button";
import { Add01Icon, PackageIcon, Tick02Icon } from "hugeicons-react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { profilePath, skillDetailPath } from "@/lib/navigation";

type CatalogSkill = SkillSummary & {
  preset?: (typeof AVAILABLE_SKILL_PRESETS)[number];
};

type SkillCardProps = {
  skill: CatalogSkill;
  source: string;
  canManage: boolean;
  isAdmin: boolean;
  isBundled: boolean;
  installing: boolean;
  updating: boolean;
  loading: boolean;
  loadError: boolean;
  assignmentsError: boolean;
  profilesLoaded: boolean;
  assignedProfiles: ProfileSummary[];
  onInstall: () => void;
  onToggle: () => void;
  onRetryProfiles: () => void;
};

export function SkillCatalogCard(props: SkillCardProps) {
  const { skill, source } = props;

  return (
    <article className="flex min-w-0 gap-4 rounded-2xl bg-muted/40 p-5 sm:p-6">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border">
        <PackageIcon
          aria-hidden="true"
          className="size-5 text-muted-foreground"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words font-semibold text-base">
              {skill.preset ? (
                <span>{skill.name}</span>
              ) : (
                <Link
                  className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  to={`${skillDetailPath(skill.id)}?from=skills`}
                >
                  {skill.name}
                </Link>
              )}
            </h2>
            <p className="mt-1 text-muted-foreground text-sm">{source}</p>
          </div>
          <SkillCardAction {...props} />
        </div>
        {skill.description.trim() ? (
          <p
            className="line-clamp-2 break-words text-muted-foreground text-sm leading-relaxed"
            title={skill.description}
          >
            {skill.description}
          </p>
        ) : null}
        {skill.preset ? (
          <>
            <p className="text-muted-foreground text-xs">
              Requires: {skill.preset.requirements}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                View instructions
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border p-3 text-xs">
                {skill.preset.body}
              </pre>
            </details>
          </>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground text-xs">
            {skill.disableModelInvocation ? "Manual" : "Auto-discovery"}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground text-xs">
            {skill.preset
              ? "Not installed"
              : skill.enabled
                ? "Enabled"
                : "Disabled"}
          </span>
          <SkillAssignments {...props} />
        </div>
      </div>
    </article>
  );
}

function skillActionState(props: SkillCardProps) {
  const {
    skill,
    canManage,
    isAdmin,
    isBundled,
    installing,
    updating,
    loading,
    loadError,
  } = props;

  return {
    autoDiscovery: skill.enabled && !skill.disableModelInvocation,
    installDisabled:
      !(canManage && isAdmin) || installing || loading || loadError,
    managed: Boolean(skill.pluginId) || isBundled,
    toggleDisabled:
      !(canManage && skill.enabled) ||
      Boolean(skill.pluginId) ||
      isBundled ||
      updating,
  };
}

function SkillCardAction(props: SkillCardProps) {
  const { skill, onInstall, onToggle } = props;

  const { installDisabled, autoDiscovery, managed, toggleDisabled } =
    skillActionState(props);

  return skill.preset ? (
    <Button
      aria-label={`Install ${skill.name}`}
      className="shrink-0 rounded-xl"
      disabled={installDisabled}
      onClick={onInstall}
      variant="outline"
    >
      Install
    </Button>
  ) : (
    <Button
      aria-label={`${skill.disableModelInvocation ? "Enable" : "Disable"} auto-discovery for ${skill.name}`}
      aria-pressed={autoDiscovery}
      className={
        autoDiscovery
          ? "shrink-0 rounded-full border border-foreground"
          : "shrink-0 rounded-full bg-muted"
      }
      disabled={toggleDisabled}
      onClick={onToggle}
      size="icon"
      title={
        managed ? "Managed by its plugin or system" : "Toggle auto-discovery"
      }
      variant="ghost"
    >
      {autoDiscovery ? (
        <Tick02Icon aria-hidden="true" className="size-5" />
      ) : (
        <Add01Icon aria-hidden="true" className="size-5" />
      )}
    </Button>
  );
}

function SkillAssignments({
  skill,
  assignmentsError,
  profilesLoaded,
  assignedProfiles,
  onRetryProfiles,
}: SkillCardProps) {
  return skill.preset ? (
    <span className="text-muted-foreground text-xs">
      Install to make available for agent assignment
    </span>
  ) : assignmentsError ? (
    <button
      className="text-destructive text-xs underline"
      onClick={() => onRetryProfiles()}
      type="button"
    >
      Retry profile assignments
    </button>
  ) : profilesLoaded ? (
    assignedProfiles.length > 0 ? (
      <div className="flex -space-x-2">
        {assignedProfiles.map((profile) => (
          <Link
            aria-label={`Open ${profile.name}`}
            className="relative rounded-full ring-2 ring-background hover:z-10"
            key={profile.id}
            title={profile.name}
            to={profilePath(profile.id)}
          >
            <ProfileAvatar profile={profile} size="xxs" />
          </Link>
        ))}
      </div>
    ) : (
      <span className="text-muted-foreground text-xs">
        Not assigned to any profile
      </span>
    )
  ) : (
    <span className="text-muted-foreground text-xs" role="status">
      Loading profile assignments…
    </span>
  );
}
