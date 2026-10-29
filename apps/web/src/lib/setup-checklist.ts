import type { SetupChecklistItem } from "@mingzhan/core/contract";

export interface StoredSetupChecklist {
  goal: string | null;
  items: SetupChecklistItem[];
  skipped: string[];
}

function setupItemKey(item: SetupChecklistItem): string {
  switch (item.kind) {
    case "connect_toolkit":
      return `toolkit:${item.toolkitSlug}`;
    case "enable_skill":
      return `skill:${item.skillId}`;
    case "write_context":
      return `context:${item.scope}`;
    default:
      throw new Error("Unknown setup checklist item.");
  }
}

export function setupChecklistStorageKey(
  orgId: string,
  userId: string,
  profileId: string
): string {
  return `mingzhan:setup-checklist:${orgId}:${userId}:${profileId}`;
}

/** A stored item as it may come back from storage: any field can be wrong. */
interface UncheckedSetupItem {
  kind?: string;
  scope?: string;
  skillId?: string;
  title?: string;
  toolkitSlug?: string;
}

/** Stored state before checks; each field is verified in readSetupChecklist. */
interface UncheckedSetupChecklist {
  done?: string[];
  goal?: string | null;
  items?: UncheckedSetupItem[];
  skipped?: string[];
}

function isText(value: string | undefined): value is string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- This guard validates decoded external data before the caller uses the domain value.
  return typeof value === "string";
}

function toSetupChecklistItem(
  item: UncheckedSetupItem | null
): SetupChecklistItem | null {
  if (!(item && isText(item.title))) {
    return null;
  }

  if (item.kind === "connect_toolkit" && isText(item.toolkitSlug)) {
    return {
      kind: item.kind,
      title: item.title,
      toolkitSlug: item.toolkitSlug,
    };
  }

  if (item.kind === "enable_skill" && isText(item.skillId)) {
    return { kind: item.kind, skillId: item.skillId, title: item.title };
  }

  if (item.kind === "write_context" && item.scope === "org") {
    return { kind: item.kind, scope: item.scope, title: item.title };
  }

  return null;
}

function storedStrings(list: string[] | undefined): string[] {
  return Array.isArray(list) ? list.filter(isText) : [];
}

export function readSetupChecklist(key: string): StoredSetupChecklist | null {
  try {
    // SAFETY: Every field read from storage is validated below.
    const parsed = JSON.parse(
      window.localStorage.getItem(key) ?? "null"
    ) as UncheckedSetupChecklist | null;

    if (!(parsed && Array.isArray(parsed.items))) {
      return null;
    }

    return {
      goal: isText(parsed.goal ?? undefined) ? (parsed.goal ?? null) : null,
      items: parsed.items
        .map(toSetupChecklistItem)
        .filter((item) => item !== null)
        .slice(0, 5),
      skipped: storedStrings(parsed.skipped),
    };
  } catch {
    return null;
  }
}

export function writeSetupChecklist(
  key: string,
  value: StoredSetupChecklist
): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The checklist remains usable for this visit when storage is blocked.
  }
}

export function setupChecklistRows(
  stored: StoredSetupChecklist,
  facts: {
    assignedSkillIds: readonly string[];
    connectedToolkits: readonly string[];
    orgMemory: string | undefined;
  }
) {
  const assigned = new Set(facts.assignedSkillIds);
  const connected = new Set(facts.connectedToolkits);

  const orgHasFacts = (facts.orgMemory ?? "")
    .split("\n")
    .some((line) => /^\s*[-*]\s+\S/.test(line));

  return stored.items.map((item) => {
    const key = setupItemKey(item);

    const done =
      (item.kind === "connect_toolkit" && connected.has(item.toolkitSlug)) ||
      (item.kind === "enable_skill" && assigned.has(item.skillId)) ||
      (item.kind === "write_context" && orgHasFacts);

    return {
      item,
      key,
      status: done
        ? ("done" as const)
        : stored.skipped.includes(key)
          ? ("skipped" as const)
          : ("open" as const),
    };
  });
}
