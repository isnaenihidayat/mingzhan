import { beforeEach, expect, test } from "bun:test";
import {
  readSetupChecklist,
  type StoredSetupChecklist,
  setupChecklistRows,
  setupChecklistStorageKey,
  writeSetupChecklist,
} from "./setup-checklist";

const checklist: StoredSetupChecklist = {
  goal: "Sales reports",
  items: [
    { kind: "connect_toolkit", title: "Connect mail", toolkitSlug: "gmail" },
    { kind: "enable_skill", skillId: "report", title: "Enable reporting" },
    { kind: "write_context", scope: "org", title: "Business context" },
  ],
  skipped: ["toolkit:gmail"],
};

beforeEach(() => window.localStorage.clear());

test("progress survives reopening and is isolated by user, org and agent", () => {
  const key = setupChecklistStorageKey("org-a", "user-a", "agent-a");
  writeSetupChecklist(key, checklist);
  expect(readSetupChecklist(key)).toEqual(checklist);

  for (const scope of [
    ["org-b", "user-a", "agent-a"],
    ["org-a", "user-b", "agent-a"],
    ["org-a", "user-a", "agent-b"],
  ] as const) {
    expect(
      readSetupChecklist(setupChecklistStorageKey(scope[0], scope[1], scope[2]))
    ).toBeNull();
  }
});

test("bad browser state does not prevent setup from opening", () => {
  for (const value of ["{", "null", '"wrong"', '{"items":false}']) {
    window.localStorage.setItem("setup", value);
    expect(readSetupChecklist("setup")).toBeNull();
  }

  window.localStorage.setItem(
    "setup",
    JSON.stringify({
      items: [null, { kind: "unknown", title: "Bad" }, checklist.items[0]],
      skipped: [1, "toolkit:gmail"],
    })
  );
  expect(readSetupChecklist("setup")).toEqual({
    goal: null,
    items: [checklist.items[0]],
    skipped: ["toolkit:gmail"],
  });
});

test("completion follows current connections, skills and business facts", () => {
  const facts = {
    assignedSkillIds: [],
    connectedToolkits: [],
    orgMemory: "# Business\n",
  };

  expect(setupChecklistRows(checklist, facts).map((row) => row.status)).toEqual(
    ["skipped", "open", "open"]
  );
  expect(
    setupChecklistRows(checklist, {
      assignedSkillIds: ["report"],
      connectedToolkits: ["gmail"],
      orgMemory: "# Business\n- Sells software",
    }).map((row) => row.status)
  ).toEqual(["done", "done", "done"]);
  expect(
    setupChecklistRows({ ...checklist, skipped: [] }, facts).map(
      (row) => row.status
    )
  ).toEqual(["open", "open", "open"]);
});
