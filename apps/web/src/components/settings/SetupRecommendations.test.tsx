import { afterEach, beforeEach, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { client } from "@/lib/client";
import { queryKeys } from "@/lib/query-keys";
import {
  readSetupChecklist,
  setupChecklistStorageKey,
} from "@/lib/setup-checklist";
import { SetupRecommendations } from "./SetupRecommendations";

let container: HTMLDivElement;

let root: Root;

let queries: QueryClient;

let calls = 0;

const originalChecklist = client.getSetupChecklist;

const profile = {
  id: "setup-agent",
  isSuper: false,
  name: "Reports",
  ownerUserId: "setup-user",
  skills: [],
};

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  calls = 0;
  queries = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  queries.setQueryData(queryKeys.profiles.all, [profile]);
  queries.setQueryData(queryKeys.profiles.detail(profile.id), profile);
  client.getSetupChecklist = async (profileId) => {
    calls++;
    expect(profileId).toBe(profile.id);

    return {
      goal: "Reports",
      items: [
        { kind: "enable_skill", skillId: "report", title: "Enable reports" },
      ],
    };
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  queries.clear();
  client.getSetupChecklist = originalChecklist;
});

async function render() {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <QueryClientProvider client={queries}>
          <AuthContext.Provider
            value={
              // SAFETY: This component only reads the active org and user from auth.
              {
                activeOrg: { id: "setup-org", role: "admin" },
                user: { id: "setup-user" },
              } as AuthContextValue
            }
          >
            <SetupRecommendations />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    )
  );
}

async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (item) => item.textContent === label
  );

  expect(button).toBeDefined();
  await act(async () => {
    button!.click();
  });
}

test("opening setup does not generate until requested and skipped progress survives reopening", async () => {
  await render();
  expect(calls).toBe(0);
  await click("View recommendations");
  expect(calls).toBe(0);
  await click("Generate recommendations");
  expect(calls).toBe(1);
  await click("Skip");
  const key = setupChecklistStorageKey("setup-org", "setup-user", profile.id);
  expect(readSetupChecklist(key)?.skipped).toEqual(["skill:report"]);
  await act(async () => root.unmount());
  root = createRoot(container);
  await render();
  await click("View recommendations");
  expect(calls).toBe(1);
  await click("Restore");
  expect(readSetupChecklist(key)?.skipped).toEqual([]);
});

test("generation errors allow retry without discarding saved recommendations", async () => {
  await render();
  await click("View recommendations");
  await click("Generate recommendations");
  client.getSetupChecklist = async () => {
    throw new Error("Offline");
  };

  await click("Refresh recommendations");
  expect(document.querySelector('[role="alert"]')).not.toBeNull();
  expect(
    readSetupChecklist(
      setupChecklistStorageKey("setup-org", "setup-user", profile.id)
    )?.items
  ).toHaveLength(1);
});
