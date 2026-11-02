import { describe, expect, test } from "bun:test";
import { loadUserWebPublicUrl, saveUserWebPublicUrl } from "@mingzhan/core";
import { resolveComposioCallbackBaseUrl } from "../services/composio-callback-url";
import { setupTestConfigDir, withTestEnv } from "../test-config-dir";
import { createMinimalHonoApp } from "./test-app-helpers";
import { buildSetupAuthBody } from "./test-org-helpers";
import {
  type AppFetch,
  loginPlatformAdminSession,
  loginUserSession,
  seedOrgAdmin,
  setupFreshInstallSession,
  type TestBrowserSession,
} from "./test-session-helpers";

setupTestConfigDir("mingzhan-web-public-url-test-");

const API_URL = "http://localhost:4310/v1/system/web-public-url";

function putRequest(
  session: TestBrowserSession,
  body: { webPublicUrl?: string },
  orgId?: string,
  extraHeaders: Record<string, string> = {}
): Request {
  return new Request(API_URL, {
    body: JSON.stringify(body),
    headers: session.headers(
      {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrfToken,
        ...extraHeaders,
      },
      orgId
    ),
    method: "PUT",
  });
}

async function readSavedBaseUrl(
  app: AppFetch,
  session: TestBrowserSession,
  orgId?: string
): Promise<string | null> {
  const response = await app.fetch(
    new Request(API_URL, { headers: session.headers({}, orgId) })
  );

  expect(response.status).toBe(200);

  // SAFETY: The test checks this response against the endpoint contract asserted below.
  return ((await response.json()) as { webPublicUrl: string | null })
    .webPublicUrl;
}

describe("web public url settings", () => {
  test("platform admin can read and persist the deployment's public web URL", async () => {
    const { app, databaseAdapter } = createMinimalHonoApp();
    const session = await setupFreshInstallSession(app, databaseAdapter);

    expect(await readSavedBaseUrl(app, session)).toBeNull();

    const putResponse = await app.fetch(
      putRequest(
        session,
        { webPublicUrl: "http://localhost:4310" },
        session.orgId
      )
    );

    expect(putResponse.status).toBe(200);
    // SAFETY: The test checks this response against the endpoint contract asserted below.
    const saved = (await putResponse.json()) as { webPublicUrl: string };
    expect(saved.webPublicUrl).toBe("http://localhost:4310");
    expect(await readSavedBaseUrl(app, session)).toBe("http://localhost:4310");

    const headerAttempt = await app.fetch(
      putRequest(session, {}, session.orgId, { Origin: "https://evil.example" })
    );

    expect(headerAttempt.status).toBe(400);
    expect(await readSavedBaseUrl(app, session)).toBe("http://localhost:4310");
  });

  test("a host other than the deployment's own origin is refused", async () => {
    const { app, databaseAdapter } = createMinimalHonoApp();
    const session = await setupFreshInstallSession(app, databaseAdapter);

    const foreign = await app.fetch(
      putRequest(
        session,
        { webPublicUrl: "https://attacker.example" },
        session.orgId
      )
    );

    expect(foreign.status).toBe(400);
    expect(await readSavedBaseUrl(app, session)).toBeNull();

    // A forwarded header is caller-controlled: without MINGZHAN_TRUST_PROXY it
    // cannot pin the base an OAuth code is delivered to.
    const forgedForward = await app.fetch(
      putRequest(
        session,
        { webPublicUrl: "https://attacker.example" },
        session.orgId,
        { "X-Forwarded-Host": "attacker.example" }
      )
    );

    expect(forgedForward.status).toBe(400);
    expect(await readSavedBaseUrl(app, session)).toBeNull();

    // The origin a trusted proxy forwards is the deployment's own.
    await withTestEnv({ MINGZHAN_TRUST_PROXY: "true" }, async () => {
      const forwarded = await app.fetch(
        putRequest(
          session,
          { webPublicUrl: "https://mingzhan.example.com" },
          session.orgId,
          // No X-Forwarded-Proto: the check compares hosts, and the header would
          // make the server look for the `__Host-` cookie this http session
          // does not hold.
          { "X-Forwarded-Host": "mingzhan.example.com" }
        )
      );

      expect(forwarded.status).toBe(200);
    });

    expect(await readSavedBaseUrl(app, session)).toBe(
      "https://mingzhan.example.com"
    );
  });

  test.each([
    "http://192.168.1.2:4310",
    "http://203.0.113.12:4310",
    "http://[fd00::2]:4310",
    "https://mingzhan.example.test",
  ])("first-run setup saves its direct origin %s", async (origin) => {
    await withTestEnv(
      {
        MINGZHAN_PUBLIC_URL: undefined,
        MINGZHAN_TRUST_PROXY: undefined,
        MINGZHAN_WEB_PUBLIC_URL: undefined,
      },
      async () => {
        const { app, databaseAdapter } = createMinimalHonoApp();

        const response = await app.fetch(
          new Request(`${origin}/v1/auth/setup`, {
            body: JSON.stringify({
              ...buildSetupAuthBody(),
              webPublicUrl: origin,
            }),
            headers: {
              "Content-Type": "application/json",
              Origin: origin,
              Referer: `${origin}/setup`,
            },
            method: "POST",
          })
        );

        expect(response.status).toBe(201);
        expect(response.headers.has("set-cookie")).toBe(true);
        expect(await databaseAdapter.countHumanUsers()).toBe(1);
        expect(await loadUserWebPublicUrl()).toBe(origin);
      }
    );
  });

  test.each([
    {
      origin: "http://192.168.1.2:4310",
      publicUrl: "https://attacker.example",
    },
    {
      origin: "https://attacker.example",
      publicUrl: "http://192.168.1.2:4310",
    },
    {
      origin: "https://attacker.example",
      publicUrl: "https://attacker.example",
    },
    { origin: "http://192.168.1.2:4311", publicUrl: "http://192.168.1.2:4311" },
    {
      origin: "https://192.168.1.2:4310",
      publicUrl: "https://192.168.1.2:4310",
    },
  ])(
    "first-run setup rejects conflicting or foreign origins: %j",
    async ({ origin, publicUrl }) => {
      await withTestEnv(
        {
          MINGZHAN_PUBLIC_URL: undefined,
          MINGZHAN_TRUST_PROXY: undefined,
          MINGZHAN_WEB_PUBLIC_URL: undefined,
        },
        async () => {
          const { app, databaseAdapter } = createMinimalHonoApp();

          const response = await app.fetch(
            new Request("http://192.168.1.2:4310/v1/auth/setup", {
              body: JSON.stringify({
                ...buildSetupAuthBody(),
                webPublicUrl: publicUrl,
              }),
              headers: {
                "Content-Type": "application/json",
                Origin: origin,
                "X-Forwarded-Host": "attacker.example",
                "X-Forwarded-Proto": "https",
              },
              method: "POST",
            })
          );

          expect(response.status).toBe(400);
          expect(await databaseAdapter.countHumanUsers()).toBe(0);
          expect(await loadUserWebPublicUrl()).toBeNull();
        }
      );
    }
  );

  test("first-run setup accepts a direct browser origin without an explicit public URL", async () => {
    await withTestEnv(
      {
        MINGZHAN_PUBLIC_URL: undefined,
        MINGZHAN_TRUST_PROXY: undefined,
        MINGZHAN_WEB_PUBLIC_URL: undefined,
      },
      async () => {
        const origin = "http://192.168.1.2:4310";
        const { app } = createMinimalHonoApp();

        const response = await app.fetch(
          new Request(`${origin}/v1/auth/setup`, {
            body: JSON.stringify(buildSetupAuthBody()),
            headers: { "Content-Type": "application/json", Origin: origin },
            method: "POST",
          })
        );

        expect(response.status).toBe(201);
        expect(await loadUserWebPublicUrl()).toBe(origin);
      }
    );
  });

  test("an explicit matching public URL enables direct VPS setup on existing images", async () => {
    const origin = "http://192.168.1.2:4310";
    await withTestEnv(
      {
        MINGZHAN_PUBLIC_URL: undefined,
        MINGZHAN_TRUST_PROXY: undefined,
        MINGZHAN_WEB_PUBLIC_URL: origin,
      },
      async () => {
        const { app } = createMinimalHonoApp();

        const response = await app.fetch(
          new Request(`${origin}/v1/auth/setup`, {
            body: JSON.stringify({
              ...buildSetupAuthBody(),
              webPublicUrl: origin,
            }),
            headers: { "Content-Type": "application/json", Origin: origin },
            method: "POST",
          })
        );

        expect(response.status).toBe(201);
        expect(response.headers.has("set-cookie")).toBe(true);
        expect(await loadUserWebPublicUrl()).toBe(origin);
      }
    );
  });

  test("first-run direct access cannot replace an operator-provisioned public URL", async () => {
    await withTestEnv(
      {
        MINGZHAN_PUBLIC_URL: undefined,
        MINGZHAN_TRUST_PROXY: undefined,
        MINGZHAN_WEB_PUBLIC_URL: "https://mingzhan.example.com",
      },
      async () => {
        const origin = "http://192.168.1.2:4310";
        const { app, databaseAdapter } = createMinimalHonoApp();

        const response = await app.fetch(
          new Request(`${origin}/v1/auth/setup`, {
            body: JSON.stringify({
              ...buildSetupAuthBody(),
              webPublicUrl: origin,
            }),
            headers: { "Content-Type": "application/json", Origin: origin },
            method: "POST",
          })
        );

        expect(response.status).toBe(400);
        expect(await databaseAdapter.countHumanUsers()).toBe(0);
        expect(await loadUserWebPublicUrl()).toBeNull();
      }
    );
  });

  test("first-run setup accepts the origin a trusted proxy forwards", async () => {
    await withTestEnv(
      {
        MINGZHAN_PUBLIC_URL: undefined,
        MINGZHAN_TRUST_PROXY: "true",
        MINGZHAN_WEB_PUBLIC_URL: undefined,
      },
      async () => {
        const { app } = createMinimalHonoApp();

        const response = await app.fetch(
          new Request("http://mingzhan-internal:4310/v1/auth/setup", {
            body: JSON.stringify({
              ...buildSetupAuthBody(),
              webPublicUrl: "https://mingzhan.example.com",
            }),
            headers: {
              "Content-Type": "application/json",
              "X-Forwarded-Host": "mingzhan.example.com",
              "X-Forwarded-Proto": "https",
            },
            method: "POST",
          })
        );

        expect(response.status).toBe(201);
        expect(await loadUserWebPublicUrl()).toBe(
          "https://mingzhan.example.com"
        );
      }
    );
  });

  test("an org admin cannot rewrite the install-wide callback base", async () => {
    const { app, authService, databaseAdapter } = createMinimalHonoApp();
    await seedOrgAdmin(databaseAdapter, {
      authService,
      email: "acme-admin@example.com",
      orgId: "org_acme",
      userId: "user_acme_admin",
    });

    const adminSession = await loginUserSession(
      app,
      "acme-admin@example.com",
      "password123",
      "org_acme"
    );

    const toAttacker = await app.fetch(
      putRequest(
        adminSession,
        { webPublicUrl: "https://attacker.example" },
        "org_acme"
      )
    );

    expect(toAttacker.status).toBe(403);

    // The origin allowlist is not the boundary: a value the deployment would
    // happily store is still refused for an org admin.
    const toOwnOrigin = await app.fetch(
      putRequest(
        adminSession,
        { webPublicUrl: "http://localhost:4310" },
        "org_acme"
      )
    );

    expect(toOwnOrigin.status).toBe(403);

    // The base an OAuth callback is built from still points at the deployment
    // rather than the attacker's host, and nothing was persisted.
    expect(
      resolveComposioCallbackBaseUrl({
        request: new Request("http://localhost:4310/v1/composio/callback"),
      })
    ).toBe("http://localhost:4310");

    const platformSession = await loginPlatformAdminSession(
      app,
      authService,
      databaseAdapter
    );

    expect(await readSavedBaseUrl(app, platformSession, "org_acme")).toBeNull();
    expect(
      (
        await app.fetch(
          new Request(API_URL, {
            headers: adminSession.headers({}, "org_acme"),
          })
        )
      ).status
    ).toBe(403);
  });

  test("first-run setup keeps a base provisioned in the config file when a proxy hides the public host", async () => {
    await withTestEnv(
      { MINGZHAN_PUBLIC_URL: undefined, MINGZHAN_WEB_PUBLIC_URL: undefined },
      async () => {
        await saveUserWebPublicUrl("https://mingzhan.example.com");
        const { app } = createMinimalHonoApp();

        const setup = (webPublicUrl: string) =>
          app.fetch(
            new Request("http://mingzhan-internal:4310/v1/auth/setup", {
              body: JSON.stringify({ ...buildSetupAuthBody(), webPublicUrl }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            })
          );

        expect((await setup("https://attacker.example")).status).toBe(400);
        expect((await setup("https://mingzhan.example.com")).status).toBe(201);
        expect(await loadUserWebPublicUrl()).toBe(
          "https://mingzhan.example.com"
        );
      }
    );
  });
});
