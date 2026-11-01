import { expect, test } from "bun:test";
import { once } from "node:events";
import { startDesktopBridge } from "./desktop-mcp-bridge";

test("desktop bridge fails closed without credentials and rejects browser origins", async () => {
  expect(() => startDesktopBridge({ port: 0, token: "short" })).toThrow();
  const token = "a".repeat(48);
  const server = startDesktopBridge({ port: 0, token });
  await once(server, "listening");
  const address = server.address();

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Node returns a socket path or AddressInfo; this test uses TCP.
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP listener");
  }

  const url = `http://127.0.0.1:${address.port}/mcp`;

  try {
    expect((await fetch(url, { method: "POST" })).status).toBe(401);
    expect(
      (
        await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Origin: "https://example.com",
          },
          method: "POST",
        })
      ).status
    ).toBe(403);
    expect(
      (await fetch(url, { headers: { Authorization: `Bearer ${token}` } }))
        .status
    ).toBe(405);
    expect(
      (
        await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "mcp-session-id": "unknown",
          },
          method: "POST",
        })
      ).status
    ).toBe(404);
  } finally {
    server.close();
  }
});
