import { describe, expect, test } from "bun:test";
import { findExplicitSkill } from "./match";
import type { DiscoveredSkill } from "./types";

const weatherSkill: DiscoveredSkill = {
  body: "Use the weather tool.",
  description: "Get weather forecasts. Use when the user asks about weather.",
  directory: "/tmp/weather",
  disableModelInvocation: false,
  hasTool: true,
  name: "weather",
  scriptIssues: [],
  scriptTools: [],
  skillFilePath: "/tmp/weather/SKILL.md",
  toolPath: "/tmp/weather/tool.ts",
};

const privateSkill: DiscoveredSkill = {
  ...weatherSkill,
  description: "Deploy the app to production.",
  disableModelInvocation: true,
  name: "deploy",
};

describe("findExplicitSkill", () => {
  test("finds the skill a /skill message names", () => {
    expect(
      findExplicitSkill(
        [weatherSkill, privateSkill],
        "Please /skill deploy now"
      )
    ).toBe(privateSkill);
    expect(
      findExplicitSkill([weatherSkill], "use skill weather for Jakarta")
    ).toBe(weatherSkill);
  });

  test("does not pick a skill from words in the message", () => {
    expect(
      findExplicitSkill([weatherSkill], "What's the weather in Jakarta?")
    ).toBeNull();
    expect(
      findExplicitSkill([privateSkill], "deploy the app to production")
    ).toBeNull();
  });

  test("returns null for a skill the profile does not have", () => {
    expect(findExplicitSkill([weatherSkill], "/skill deploy")).toBeNull();
  });

  test("loads create-workflow through explicit invocation", () => {
    const createWorkflow: DiscoveredSkill = {
      ...weatherSkill,
      description:
        "Create and run user-triggered workflows with declared steps. Use when the user asks about a workflow or wants a verifiable recipe (fetch, compare, summarize) they can run on demand from chat or the dashboard.",
      hasTool: false,
      name: "create-workflow",
    };

    expect(
      findExplicitSkill([createWorkflow], "/skill create-workflow")?.name
    ).toBe("create-workflow");
  });
});
