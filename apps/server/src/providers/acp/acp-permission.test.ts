import { describe, expect, test } from "bun:test";
import type * as acp from "@agentclientprotocol/sdk";
import type { ToolContext, ToolDefinition } from "@mingzhan/core";
import { isMíngZhànToolPermission, setAcpToolAccess } from "./acp-mcp-tools";

const echoTool: ToolDefinition = {
  description: "Echo",
  name: "echo_tool",
  run: async () => ({}),
};

const context: ToolContext = {};

function permissionFor(toolName: string): acp.ToolCallUpdate {
  return {
    _meta: { claudeCode: { toolName } },
    toolCallId: "call-1",
  };
}

describe("ACP permission requests", () => {
  test("approves a MíngZhàn tool the chat was given", () => {
    const key = `permission-${crypto.randomUUID()}`;
    setAcpToolAccess(key, [echoTool], context);

    expect(
      isMíngZhànToolPermission(key, permissionFor("mcp__mingzhan__echo_tool"))
    ).toBe(true);
  });

  test("does not approve a MíngZhàn tool the chat was not given", () => {
    const key = `permission-${crypto.randomUUID()}`;
    setAcpToolAccess(key, [echoTool], context);

    expect(
      isMíngZhànToolPermission(key, permissionFor("mcp__mingzhan__delete_all"))
    ).toBe(false);
  });

  test("does not approve shell or file requests", () => {
    const key = `permission-${crypto.randomUUID()}`;
    setAcpToolAccess(key, [echoTool], context);

    expect(isMíngZhànToolPermission(key, permissionFor("Bash"))).toBe(false);
    expect(
      isMíngZhànToolPermission(key, permissionFor("mcp__other__echo_tool"))
    ).toBe(false);
  });

  test("does not approve for a chat without tool access", () => {
    expect(
      isMíngZhànToolPermission(
        `unknown-${crypto.randomUUID()}`,
        permissionFor("mcp__mingzhan__echo_tool")
      )
    ).toBe(false);
  });
});
