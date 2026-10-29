import type { SetupChecklistItem } from "@mingzhan/core/contract";
import { Button } from "@mingzhan/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@mingzhan/ui/dialog";
import { Spinner } from "@mingzhan/ui/spinner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContextEditorDialog } from "@/components/UserContextCard";
import { useActiveChatProfile } from "@/context/use-active-chat-profile";
import { useAuth } from "@/context/use-auth";
import { useProfileQuery, useProfilesQuery } from "@/hooks/use-app-queries";
import { useComposioToolkits } from "@/hooks/use-composio";
import { useOrgMemory } from "@/hooks/use-org-memory";
import { useAssignSkillMutation } from "@/hooks/use-resource-mutations";
import { client, formatError } from "@/lib/client";
import { pathForPage } from "@/lib/navigation";
import {
  readSetupChecklist,
  type StoredSetupChecklist,
  setupChecklistRows,
  setupChecklistStorageKey,
  writeSetupChecklist,
} from "@/lib/setup-checklist";

export function SetupRecommendations() {
  const { activeOrg, user } = useAuth();
  const { profileId: activeProfileId } = useActiveChatProfile();
  const { data: profiles = [] } = useProfilesQuery(activeOrg?.id);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const profileId = profiles.some((profile) => profile.id === selected)
    ? selected
    : (profiles.find((profile) => profile.id === activeProfileId)?.id ??
      profiles[0]?.id ??
      "");

  if (!(activeOrg && user)) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Setup recommendations
        </p>
        <Button
          disabled={!profileId}
          onClick={() => setOpen(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          View recommendations
        </Button>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        {open ? (
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Setup recommendations</DialogTitle>
            </DialogHeader>
            <label
              className="grid gap-2 font-medium text-sm"
              htmlFor="setup-agent"
            >
              Agent
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                id="setup-agent"
                onChange={(event) => setSelected(event.target.value)}
                value={profileId}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <RecommendationsSession
              key={`${activeOrg.id}:${user.id}:${profileId}`}
              orgId={activeOrg.id}
              profileId={profileId}
              userId={user.id}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function RecommendationsSession({
  orgId,
  profileId,
  userId,
}: {
  orgId: string;
  profileId: string;
  userId: string;
}) {
  const { activeOrg, user } = useAuth();
  const navigate = useNavigate();
  const storageKey = setupChecklistStorageKey(orgId, userId, profileId);
  const [stored, setStored] = useState(() => readSetupChecklist(storageKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const profile = useProfileQuery(profileId);

  const toolkits = useComposioToolkits({
    enabled:
      stored?.items.some((item) => item.kind === "connect_toolkit") ?? false,
  });

  const orgMemory = useOrgMemory(
    activeOrg?.role === "admin" &&
      stored?.items.some((item) => item.kind === "write_context")
      ? orgId
      : null
  );

  const assign = useAssignSkillMutation();

  const canManage =
    user?.isPlatformAdmin ||
    activeOrg?.role === "admin" ||
    (profile.data?.ownerUserId === userId && !profile.data?.isSuper);

  const rows = stored
    ? setupChecklistRows(stored, {
        assignedSkillIds: profile.data?.skills.map((skill) => skill.id) ?? [],
        connectedToolkits:
          toolkits.data?.userConnections
            .filter((connection) => connection.status === "connected")
            .map((connection) => connection.toolkitSlug) ?? [],
        orgMemory: orgMemory.data?.content,
      })
    : [];

  const update = (next: StoredSetupChecklist) => {
    writeSetupChecklist(storageKey, next);
    setStored(next);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.getSetupChecklist(profileId);
      update({ ...response, skipped: [] });
    } catch (cause) {
      setError(formatError(cause));
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (item: SetupChecklistItem) => {
    setError(null);

    if (item.kind === "connect_toolkit") {
      navigate(pathForPage("composio"));
    } else if (item.kind === "write_context") {
      navigate(pathForPage("organization"));
    } else {
      try {
        await assign.mutateAsync({ profileId, skillId: item.skillId });
      } catch (cause) {
        setError(formatError(cause));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={loading || !profileId}
          onClick={() => void generate()}
          type="button"
        >
          {loading ? <Spinner className="mr-2" /> : null}
          {stored ? "Refresh recommendations" : "Generate recommendations"}
        </Button>
        <Button
          disabled={loading}
          onClick={() => setAboutOpen(true)}
          type="button"
          variant="outline"
        >
          Edit goals
        </Button>
      </div>
      {stored?.goal ? (
        <p className="font-medium text-sm">{stored.goal}</p>
      ) : null}
      {stored ? (
        <p className="text-muted-foreground text-sm" role="status">
          {rows.filter((row) => row.status === "done").length} of {rows.length}{" "}
          done
        </p>
      ) : null}
      {stored && rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No recommendations available. You can edit your goals and try again.
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li className="flex flex-wrap items-center gap-2 py-3" key={row.key}>
            <span className="min-w-0 flex-1 text-sm">{row.item.title}</span>
            {row.status === "done" ? (
              <span className="text-emerald-700 text-sm dark:text-emerald-400">
                Done
              </span>
            ) : (
              <>
                {row.status === "skipped" ? (
                  <span className="text-muted-foreground text-sm">Skipped</span>
                ) : (
                  <Button
                    disabled={
                      loading ||
                      assign.isPending ||
                      profile.isLoading ||
                      toolkits.isLoading ||
                      orgMemory.isLoading ||
                      (row.item.kind === "enable_skill" && !canManage)
                    }
                    onClick={() => void runAction(row.item)}
                    size="sm"
                    title={
                      row.item.kind === "enable_skill" && !canManage
                        ? "Only the agent owner or an administrator can enable skills."
                        : undefined
                    }
                    type="button"
                    variant="outline"
                  >
                    {row.item.kind === "enable_skill" ? "Turn on" : "Open"}
                  </Button>
                )}
                <Button
                  disabled={loading}
                  onClick={() =>
                    stored &&
                    update({
                      ...stored,
                      skipped:
                        row.status === "skipped"
                          ? stored.skipped.filter((key) => key !== row.key)
                          : [...stored.skipped, row.key],
                    })
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {row.status === "skipped" ? "Restore" : "Skip"}
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {profile.error || toolkits.error || orgMemory.error ? (
        <p className="text-destructive text-sm" role="alert">
          Some setup statuses could not be loaded. Reopen this dialog to retry.
        </p>
      ) : null}
      <UserContextEditorDialog
        onOpenChange={setAboutOpen}
        onSaved={() => {
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            /* Storage may be blocked. */
          }

          setStored(null);
        }}
        open={aboutOpen}
      />
    </div>
  );
}
