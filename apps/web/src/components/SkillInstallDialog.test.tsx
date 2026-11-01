import { afterEach, expect, spyOn, test } from "bun:test";
import type {
  InstallSkillRequest,
  SkillSummary,
} from "@mingzhan/core/contract";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AddSkillDialog } from "@/components/SkillInstallDialog";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { client } from "@/lib/client";

const now = "2026-10-04T00:00:00Z";

const skills: SkillSummary[] = ["One", "Two", "Three"].map((name) => ({
  createdAt: now,
  createdBy: "human",
  description: `Skill ${name}`,
  disableModelInvocation: false,
  enabled: true,
  hasTool: false,
  id: name.toLowerCase(),
  name,
  orgId: "org-a",
  sourcePath: `/tmp/${name}`,
  updatedAt: now,
}));

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
});

test("keeps only unadded skills selected after a partial failure", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const assigned: string[] = [];
  let failSecond = true;
  let open = true;
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });

  // SAFETY: AddSkillDialog reads only user.isPlatformAdmin from this fixture.
  const auth = { user: { isPlatformAdmin: true } } as AuthContextValue;

  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthContext.Provider value={auth}>
          <AddSkillDialog
            assignedSkillIds={new Set()}
            bashAssigned
            busy={false}
            onAssign={async (id) => {
              if (id === "two" && failSecond) {
                throw new Error("Assignment failed");
              }

              assigned.push(id);
            }}
            onAssignBash={async () => {}}
            onInstall={async () => {}}
            onOpenChange={(value) => {
              open = value;
            }}
            open
            orgId="org-a"
            profileId="profile-a"
            skills={skills}
            skillsError={null}
            skillsLoading={false}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  });

  const checkbox = (name: string) =>
    document.querySelector<HTMLInputElement>(`input[aria-label="Add ${name}"]`);

  await act(async () => {
    for (const name of ["One", "Two", "Three"]) {
      checkbox(name)?.click();
    }
  });

  const addButton = () =>
    [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Add 3 skills")
    );

  await act(async () => {
    addButton()?.click();
  });

  expect(assigned).toEqual(["one"]);
  expect(open).toBe(true);
  expect(checkbox("One")?.disabled).toBe(true);
  expect(checkbox("Two")?.checked).toBe(true);
  expect(checkbox("Three")?.checked).toBe(true);
  expect(document.body.textContent).toContain("Assignment failed");

  failSecond = false;
  await act(async () => {
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Add 2 skills"))
      ?.click();
  });
  expect(assigned).toEqual(["one", "two", "three"]);
  expect(open).toBe(false);
});

test("installs a skill picked from skills.sh with the npx command", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const installs: InstallSkillRequest[] = [];

  const search = spyOn(client, "searchSkillsMarketplace").mockResolvedValue({
    skills: [
      {
        installs: 1200,
        name: "pdf",
        skillId: "pdf",
        source: "anthropics/skills",
      },
    ],
  });

  const preview = spyOn(client, "previewSkillInstall").mockResolvedValue({
    description: "Work with PDFs",
    estimatedTokens: 900,
    files: [{ executable: true, path: "scripts/fill.py" }],
    name: "pdf",
  });

  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
    search.mockRestore();
    preview.mockRestore();
  });

  // SAFETY: AddSkillDialog reads only user.isPlatformAdmin from this fixture.
  const auth = { user: { isPlatformAdmin: true } } as AuthContextValue;

  await act(async () => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthContext.Provider value={auth}>
          <AddSkillDialog
            assignedSkillIds={new Set()}
            bashAssigned
            busy={false}
            onAssign={async () => {}}
            onAssignBash={async () => {}}
            onInstall={async (request) => {
              installs.push(request);
            }}
            onOpenChange={() => {}}
            open
            orgId="org-a"
            profileId="profile-a"
            skills={skills}
            skillsError={null}
            skillsLoading={false}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  });

  const button = (text: string) =>
    [...document.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(text)
    );

  await act(async () => button("Install new")?.click());

  const input = document.querySelector<HTMLInputElement>(
    "#skill-marketplace-search"
  )!;

  await act(async () => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, "pdf");
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));
  });

  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

  expect(search).toHaveBeenCalledWith("pdf");
  await settle();

  await act(async () => button("anthropics/skills")?.click());
  await settle();

  expect(preview).toHaveBeenCalledWith(
    "npx skills add anthropics/skills --skill pdf"
  );
  expect(document.body.textContent).toContain("scripts/fill.py");
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);

  await act(async () => button("Install skill")?.click());

  expect(installs).toEqual([
    {
      command: "npx skills add anthropics/skills --skill pdf",
      profileId: "profile-a",
    },
  ]);
});

test("skills page filters results and changes auto-discovery through the supported API", async () => {
  const { MemoryRouter } = await import("react-router-dom");
  const { SkillsPage } = await import("@/pages/CustomizePage");

  const catalog = skills.map((skill, index) => ({
    ...skill,
    enabled: index !== 2,
  }));

  const install = spyOn(client, "createSkill").mockImplementation(
    async (input) => {
      const skill: SkillSummary = {
        ...skills[0]!,
        description: input.description,
        disableModelInvocation: input.disableModelInvocation ?? false,
        id: input.name,
        name: input.name,
        orgId: null,
      };

      catalog.push(skill);

      return { skill: { ...skill, body: input.body ?? "", scriptIssues: [] } };
    }
  );

  const list = spyOn(client, "listSkills").mockResolvedValue({
    skills: catalog,
  });

  const profiles = spyOn(client, "listProfiles").mockResolvedValue({
    profiles: [],
  });

  const patch = spyOn(client, "patchSkill").mockResolvedValue({
    skill: {
      ...catalog[0]!,
      body: "",
      disableModelInvocation: true,
      scriptIssues: [],
    },
  });

  // SAFETY: SkillsPage reads only the active organization id/role and platform admin flag from this auth fixture.
  const auth = {
    activeOrg: { id: "org-a", role: "admin" },
    user: { isPlatformAdmin: true },
  } as AuthContextValue;

  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
    queries.clear();
    list.mockRestore();
    profiles.mockRestore();
    patch.mockRestore();
    install.mockRestore();
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queries}>
        <MemoryRouter>
          <AuthContext.Provider value={auth}>
            <SkillsPage />
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await Bun.sleep(30);
  });
  await act(async () => {
    await Bun.sleep(30);
  });
  expect(container.querySelectorAll("article").length).toBe(9);
  expect(install).not.toHaveBeenCalled();

  const availableFilter = [...container.querySelectorAll("label")]
    .find((label) => label.textContent?.includes("Available"))!
    .querySelector("input")!;

  await act(async () => availableFilter.click());
  expect(container.querySelectorAll("article").length).toBe(6);
  expect(container.textContent).toContain("Not installed");
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Install mingzhan-visuals"]'
      )!
      .click()
  );
  await act(async () => {
    await Bun.sleep(30);
  });
  expect(install).toHaveBeenCalledTimes(1);
  expect(install.mock.calls[0]![0]).toMatchObject({
    disableModelInvocation: true,
    name: "mingzhan-visuals",
  });
  expect(install.mock.calls[0]![0].profileId).toBeUndefined();
  expect(container.querySelectorAll("article").length).toBe(5);
  await act(async () => availableFilter.click());

  const disabledFilter = [...container.querySelectorAll("label")]
    .find((label) => label.textContent?.includes("Disabled"))!
    .querySelector("input")!;

  await act(async () => disabledFilter.click());
  expect(container.querySelectorAll("article").length).toBe(1);
  expect(container.querySelector("article")?.textContent).toContain("Three");
  await act(async () => disabledFilter.click());
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Disable auto-discovery for One"]'
      )!
      .click()
  );
  expect(patch).toHaveBeenCalledWith(
    "one",
    { disableModelInvocation: true },
    undefined
  );
});

test("available presets are excluded from automatic bundled installation and assignment", async () => {
  const { AVAILABLE_SKILL_PRESETS, BUNDLED_SKILL_NAMES } = await import(
    "@mingzhan/core/skills/bundled-names"
  );

  expect(AVAILABLE_SKILL_PRESETS).toHaveLength(6);

  for (const preset of AVAILABLE_SKILL_PRESETS) {
    expect(
      BUNDLED_SKILL_NAMES.some((name) => name === String(preset.name))
    ).toBe(false);
    expect(preset.disableModelInvocation).toBe(true);
    expect(preset.name).toMatch(/^mingzhan-/);
    expect(preset.body.length).toBeGreaterThan(100);
  }
});
