import { expect, test } from "bun:test";
import { unregisteredPopularServers } from "@/components/soul-tools/mcp-tab/popular-mcp-servers";

test("keeps the MingZhan MCP library and excludes already registered names", () => {
  const available = unregisteredPopularServers();
  expect(available.some(({ name }) => name === "Notion")).toBe(true);
  expect(available.some(({ name }) => name === "GitHub")).toBe(true);
  const filtered = unregisteredPopularServers([{ name: "nOtIoN" }]);
  expect(filtered.some(({ name }) => name === "Notion")).toBe(false);
  expect(filtered.some(({ name }) => name === "GitHub")).toBe(true);
});
