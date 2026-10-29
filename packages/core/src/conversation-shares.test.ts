import { describe, expect, it } from "bun:test";
import {
  buildConversationSharePath,
  generateConversationShareToken,
} from "./conversation-shares";

describe("conversation shares", () => {
  it("generates high-entropy token without underscores", () => {
    const token = generateConversationShareToken();
    expect(token).toMatch(/^mzchat[0-9a-f]{64}$/);
    expect(token.includes("_")).toBe(false);
  });

  it("builds /c/ path for token", () => {
    const path = buildConversationSharePath("mzchat12345");
    expect(path).toBe("/c/mzchat12345");
  });
});
