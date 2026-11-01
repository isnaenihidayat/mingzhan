import type { ProfileSummary, SkillSummary } from "@mingzhan/core/contract";
import {
  AVAILABLE_SKILL_PRESETS,
  BUNDLED_SKILL_NAMES,
} from "@mingzhan/core/skills/bundled-names";
import { Button } from "@mingzhan/ui/button";
import { Input } from "@mingzhan/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Search01Icon } from "hugeicons-react";
import { useState } from "react";
import { SkillCatalogCard } from "@/components/SkillCatalogCard";
import { SkillCreateDialog } from "@/components/SkillCreateDialog";
import { useAuth } from "@/context/use-auth";
import {
  useCreateSkillMutation,
  usePatchSkillMutation,
} from "@/hooks/use-resource-mutations";
import { client, formatError } from "@/lib/client";
import { canAccessSystemPage } from "@/lib/navigation";
import { queryKeys } from "@/lib/query-keys";

type CatalogSkill = SkillSummary & {
  preset?: (typeof AVAILABLE_SKILL_PRESETS)[number];
};

const presetNames = new Set<string>(
  AVAILABLE_SKILL_PRESETS.map((item) => item.name)
);

const skillState = (skill: CatalogSkill) =>
  skill.preset ? "Available" : skill.enabled ? "Enabled" : "Disabled";

const bundledNames = new Set<string>(BUNDLED_SKILL_NAMES);

const sourceOrder = new Map([
  ["Agent-created", 1],
  ["Built-in", 0],
  ["User-added", 2],
]);

function sourceLabel(skill: SkillSummary): string {
  if (skill.pluginId) {
    return `Plugin: ${skill.pluginId}`;
  }

  if (skill.createdBy === "agent") {
    return "Agent-created";
  }

  if (
    presetNames.has(skill.name) ||
    (skill.createdBy === "bundled" && bundledNames.has(skill.name))
  ) {
    return "Built-in";
  }

  return "User-added";
}

function useSkillsCatalog() {
  const { activeOrg, user } = useAuth();
  const orgId = activeOrg?.id;
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [invocations, setInvocations] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const patch = usePatchSkillMutation();
  const create = useCreateSkillMutation();

  const canManage = canAccessSystemPage(
    user?.isPlatformAdmin === true,
    activeOrg?.role
  );

  const toggleFilter = (
    value: string,
    values: string[],
    setValues: (values: string[]) => void
  ) =>
    setValues(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );

  const {
    data: skills = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    enabled: Boolean(orgId),
    queryFn: async () => (await client.listSkills(orgId)).skills,
    queryKey: [...queryKeys.skills.all, "organization", orgId],
  });

  const query = search.trim().toLowerCase();

  const {
    data: profiles,
    error: profilesError,
    refetch: refetchProfiles,
  } = useQuery({
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { profiles: summaries } = await client.listProfiles(orgId);

      return Promise.all(
        summaries.map(
          async (profile) =>
            (await client.getProfile(profile.id, orgId)).profile
        )
      );
    },
    queryKey: [...queryKeys.profiles.all, "skill-assignments", orgId],
  });

  const profilesBySkill = new Map<string, ProfileSummary[]>();

  for (const profile of profiles ?? []) {
    for (const skill of profile.skills) {
      const assigned = profilesBySkill.get(skill.id) ?? [];
      assigned.push(profile);
      profilesBySkill.set(skill.id, assigned);
    }
  }

  const installed = skills.filter(
    (skill) => Boolean(orgId) && (skill.orgId === null || skill.orgId === orgId)
  );

  const installedNames = new Set(installed.map((skill) => skill.name));

  const available: CatalogSkill[] = orgId
    ? AVAILABLE_SKILL_PRESETS.filter(
        (preset) => !installedNames.has(preset.name)
      ).map((preset) => ({
        createdAt: "",
        createdBy: "bundled",
        description: preset.description,
        disableModelInvocation: true,
        enabled: false,
        hasTool: false,
        id: `available:${preset.name}`,
        name: preset.name,
        orgId,
        preset,
        sourcePath: "",
        updatedAt: "",
      }))
    : [];

  const scoped: CatalogSkill[] = [...installed, ...available];

  const selectedStates = new Set(states);
  const selectedSources = new Set(sources);
  const selectedInvocations = new Set(invocations);

  const filtered = scoped
    .filter(
      (skill) =>
        Boolean(orgId) && (skill.orgId === null || skill.orgId === orgId)
    )
    .filter((skill) =>
      `${skill.name} ${skill.description} ${sourceLabel(skill)}`
        .toLowerCase()
        .includes(query)
    )
    .filter((skill) => !states.length || selectedStates.has(skillState(skill)))
    .filter(
      (skill) => !sources.length || selectedSources.has(sourceLabel(skill))
    )
    .filter(
      (skill) =>
        !invocations.length ||
        selectedInvocations.has(
          skill.disableModelInvocation ? "Manual" : "Auto-discovery"
        )
    )
    .sort(
      (left, right) =>
        (sourceOrder.get(sourceLabel(left)) ?? 3) -
          (sourceOrder.get(sourceLabel(right)) ?? 3) ||
        left.name.localeCompare(right.name)
    );

  const filters = [
    {
      match: (skill: CatalogSkill, value: string) =>
        skillState(skill) === value,
      selected: states,
      set: setStates,
      title: "State",
      values: ["Available", "Enabled", "Disabled"],
    },
    {
      match: (skill: SkillSummary, value: string) =>
        sourceLabel(skill) === value,
      selected: sources,
      set: setSources,
      title: "Source",
      values: [...new Set(scoped.map(sourceLabel))].sort(),
    },
    {
      match: (skill: SkillSummary, value: string) =>
        (skill.disableModelInvocation ? "Manual" : "Auto-discovery") === value,
      selected: invocations,
      set: setInvocations,
      title: "Invocation",
      values: ["Auto-discovery", "Manual"],
    },
  ];

  return {
    actionError,
    canManage,
    create,
    createOpen,
    error,
    filtered,
    filters,
    filtersOpen,
    invocations,
    isLoading,
    patch,
    profiles,
    profilesBySkill,
    profilesError,
    refetch,
    refetchProfiles,
    scoped,
    search,
    setActionError,
    setCreateOpen,
    setFiltersOpen,
    setInvocations,
    setSearch,
    setSources,
    setStates,
    sources,
    states,
    toggleFilter,
    user,
  };
}

export function SkillsPage() {
  const {
    actionError,
    canManage,
    create,
    createOpen,
    error,
    filtered,
    filters,
    filtersOpen,
    invocations,
    isLoading,
    patch,
    profiles,
    profilesBySkill,
    profilesError,
    refetch,
    refetchProfiles,
    scoped,
    search,
    setActionError,
    setCreateOpen,
    setFiltersOpen,
    setInvocations,
    setSearch,
    setSources,
    setStates,
    sources,
    states,
    toggleFilter,
    user,
  } = useSkillsCatalog();

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-semibold text-2xl tracking-tight">Skills</h1>
          <p className="text-muted-foreground text-sm">
            Discover and manage skills for your workspace. Open a skill to view
            its instructions and agent assignments.
          </p>
        </div>
        {canManage ? (
          <Button
            className="shrink-0 rounded-xl"
            onClick={() => setCreateOpen(true)}
            variant="outline"
          >
            Add skill
          </Button>
        ) : null}
      </header>
      <SkillCreateDialog
        busy={create.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={async (input) => {
          await create.mutateAsync(input);
          setCreateOpen(false);
        }}
        open={createOpen}
        profileId={null}
      />
      <div className="relative">
        <Search01Icon
          aria-hidden="true"
          className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search skills"
          className="h-12 rounded-xl bg-muted/30 pl-12"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search skills by name, description, or source"
          type="search"
          value={search}
        />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside aria-label="Filter skills" className="min-w-0">
          <div className="rounded-xl border border-border p-4 xl:border-0 xl:p-0">
            <button
              aria-controls="skills-filters"
              aria-expanded={filtersOpen}
              className="w-full cursor-pointer text-left font-medium text-sm xl:hidden"
              onClick={() => setFiltersOpen(!filtersOpen)}
              type="button"
            >
              Filters
              {states.length + sources.length + invocations.length > 0
                ? ` (${states.length + sources.length + invocations.length})`
                : ""}
            </button>
            <div
              className={`${filtersOpen ? "grid" : "hidden"} mt-4 grid-cols-1 gap-6 sm:grid-cols-2 xl:mt-0 xl:grid xl:grid-cols-1`}
              id="skills-filters"
            >
              {filters.map((group) => (
                <fieldset className="min-w-40 space-y-3" key={group.title}>
                  <legend className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {group.title}
                  </legend>
                  {group.values.map((value) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 text-sm"
                      key={value}
                    >
                      <input
                        checked={group.selected.includes(value)}
                        className="size-4 accent-foreground"
                        onChange={() =>
                          toggleFilter(value, group.selected, group.set)
                        }
                        type="checkbox"
                      />
                      <span className="flex-1">{value}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {
                          scoped.filter((skill) => group.match(skill, value))
                            .length
                        }
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
              {states.length + sources.length + invocations.length > 0 ? (
                <Button
                  onClick={() => {
                    setStates([]);
                    setSources([]);
                    setInvocations([]);
                  }}
                  variant="ghost"
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>
        </aside>
        <section aria-label="Skills results" className="min-w-0 space-y-4">
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {filtered.length} result(s)
          </p>
          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}
          {isLoading ? <p role="status">Loading skills…</p> : null}
          {error ? (
            <div role="alert">
              <p>{formatError(error)}</p>
              <Button onClick={() => void refetch()} variant="outline">
                Retry
              </Button>
            </div>
          ) : null}
          {isLoading || error || filtered.length ? null : (
            <p
              className="rounded-2xl border border-border p-8 text-center text-muted-foreground text-sm"
              role="status"
            >
              No matching skills.
            </p>
          )}
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((skill) => (
              <SkillCatalogCard
                assignedProfiles={profilesBySkill.get(skill.id) ?? []}
                assignmentsError={Boolean(profilesError)}
                canManage={canManage}
                installing={create.isPending}
                isAdmin={user?.isPlatformAdmin === true}
                isBundled={bundledNames.has(skill.name)}
                key={skill.id}
                loadError={Boolean(error)}
                loading={isLoading}
                onInstall={() => {
                  if (!skill.preset) {
                    return;
                  }

                  setActionError(null);
                  void create
                    .mutateAsync({
                      body: skill.preset.body,
                      description: skill.preset.description,
                      disableModelInvocation: true,
                      name: skill.preset.name,
                    })
                    .catch((err) => setActionError(formatError(err)));
                }}
                onRetryProfiles={() => {
                  void refetchProfiles();
                }}
                onToggle={() => {
                  setActionError(null);
                  void patch
                    .mutateAsync({
                      input: {
                        disableModelInvocation: !skill.disableModelInvocation,
                      },
                      skillId: skill.id,
                    })
                    .catch((err) => setActionError(formatError(err)));
                }}
                profilesLoaded={Boolean(profiles)}
                skill={skill}
                source={sourceLabel(skill)}
                updating={patch.isPending}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
