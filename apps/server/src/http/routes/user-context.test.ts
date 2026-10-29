import { expect, test } from "bun:test";
import type { OrgRole, SetupChecklistResponse } from "@mingzhan/core";
import { createInMemoryDatabaseAdapter } from "@mingzhan/db";
import { AgentService } from "../../services/agent-service";
import { SkillsService } from "../../services/skills-service";
import { setupTestConfigDir } from "../../test-config-dir";
import { createMinimalHonoApp } from "../test-app-helpers";
import { loginUserSession, seedOrgAdmin } from "../test-session-helpers";

setupTestConfigDir("mingzhan-user-context-routes-test-");

const ORG_ID = "org_checklist";

const PROFILE_ID = "profile_checklist";

async function loginMember(role: OrgRole = "member") {
  const db = createInMemoryDatabaseAdapter();
  const agent = new AgentService(null, null, db);
  agent.setSkillsService(new SkillsService(db));

  const { app, authService } = createMinimalHonoApp({
    agent,
    databaseAdapter: db,
  });

  const seeded = await seedOrgAdmin(db, {
    authService,
    orgId: ORG_ID,
    profileId: PROFILE_ID,
    role,
  });

  const session = await loginUserSession(
    app,
    seeded.email,
    seeded.password,
    ORG_ID
  );

  const call = (method: string, path: string, body: Record<string, string>) =>
    app.fetch(
      new Request(`http://localhost:4310${path}`, {
        body: JSON.stringify(body),
        headers: session.headers({
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrfToken,
        }),
        method,
      })
    );

  return { call, agent, db, seeded };
}

test("setup checklist returns the saved goal for a member", async () => {
  const { call } = await loginMember();

  await call("PUT", "/v1/user/context", {
    content: "# About Me\n\n- Help with: Manage my Meta Ads\n",
  });

  const response = await call("POST", "/v1/user/setup-checklist", {
    profileId: PROFILE_ID,
  });

  expect(response.status).toBe(200);

  // SAFETY: A 200 from this route is a SetupChecklistResponse.
  const body = (await response.json()) as SetupChecklistResponse;

  // No provider in tests, so the model picks nothing.
  expect(body).toEqual({ goal: "Manage my Meta Ads", items: [] });
});

test("setup checklist rejects an agent outside the org", async () => {
  const { call } = await loginMember();

  const response = await call("POST", "/v1/user/setup-checklist", {
    profileId: "profile_elsewhere",
  });

  expect(response.status).toBe(404);
});

test("setup checklist rejects invalid request fields", async () => {
  const { call } = await loginMember();

  for (const body of [
    { profileId: "" },
    { profileId: PROFILE_ID, userId: "another-user" },
  ]) {
    expect((await call("POST", "/v1/user/setup-checklist", body)).status).toBe(
      400
    );
  }
});

test("members do not receive organization-admin setup actions", async () => {
  const { call, agent } = await loginMember();
  agent.getSetupChecklist = async () => ({
    goal: "Reports",
    items: [
      { kind: "write_context", scope: "org", title: "Business context" },
      { kind: "enable_skill", skillId: "report", title: "Reporting" },
    ],
  });

  const response = await call("POST", "/v1/user/setup-checklist", {
    profileId: PROFILE_ID,
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    goal: "Reports",
    items: [{ kind: "enable_skill", skillId: "report", title: "Reporting" }],
  });
});

test("administrators can receive business context steps", async () => {
  const { call, agent } = await loginMember("admin");

  const checklist: SetupChecklistResponse = {
    goal: "Reports",
    items: [{ kind: "write_context", scope: "org", title: "Business context" }],
  };

  agent.getSetupChecklist = async () => checklist;

  const response = await call("POST", "/v1/user/setup-checklist", {
    profileId: PROFILE_ID,
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(checklist);
});
