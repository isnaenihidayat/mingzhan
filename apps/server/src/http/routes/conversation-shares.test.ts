import { describe, expect, test } from "bun:test";
import { createInMemoryDatabaseAdapter } from "@mingzhan/db";
import { ConversationShareService } from "../../services/conversation-share-service";
import { setupTestConfigDir } from "../../test-config-dir";
import { isPublicRouteRequest } from "../public-routes";
import { createMinimalHonoApp } from "../test-app-helpers";
import { setupFreshInstallSession } from "../test-session-helpers";

setupTestConfigDir("mingzhan-conversation-shares-test-");

describe("conversation share routes", () => {
  test("public conversation share GET is allowlisted", () => {
    expect(
      isPublicRouteRequest("GET", "/v1/public/conversation-shares/tok123")
    ).toBe(true);
    expect(
      isPublicRouteRequest("POST", "/v1/public/conversation-shares/tok123")
    ).toBe(false);
  });

  test("member can publish conversation and visitor can read it publicly", async () => {
    const { app, databaseAdapter, authService } = createMinimalHonoApp({
      databaseAdapter: createInMemoryDatabaseAdapter(),
    });

    const session = await setupFreshInstallSession(app, databaseAdapter);
    const orgId = session.orgId!;

    const ownerId = (await databaseAdapter.listPlatformAdminUsers())[0]!.id;
    const profileId = (await databaseAdapter.listProfilesForOrg(orgId))[0]!.id;

    // Create a session in DB with messages
    const sessionId = "test-session-123";
    await databaseAdapter.upsertSession({
      agentQuestionnaire: null,
      agentTodos: [],
      channel: "web",
      createdAt: new Date().toISOString(),
      id: sessionId,
      model: "test-model",
      profileId,
      title: "Diskusi Arsitektur MíngZhàn",
      userId: ownerId,
    });
    await databaseAdapter.renameSessionTitle(
      sessionId,
      "Diskusi Arsitektur MíngZhàn"
    );

    await databaseAdapter.appendMessagesForSession(sessionId, [
      {
        id: "msg-1",
        sessionId,
        seq: 1,
        payload: { role: "user", content: "Halo, apa rencana kita?" },
        createdAt: new Date().toISOString(),
      },
      {
        id: "msg-2",
        sessionId,
        seq: 2,
        payload: {
          role: "assistant",
          content: "Kita akan mengadopsi fitur Projects dan Share Chat.",
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    const service = new ConversationShareService(databaseAdapter, authService);
    await expect(
      service.publishConversationShare({
        orgId,
        sessionId,
        userId: "not-the-owner",
      })
    ).rejects.toThrow();
    await expect(
      service.publishConversationShare({
        orgId: "another-org",
        sessionId,
        userId: ownerId,
      })
    ).rejects.toThrow();
    await databaseAdapter.appendMessagesForSession(sessionId, [
      {
        id: "private-system",
        sessionId,
        seq: 3,
        createdAt: new Date().toISOString(),
        payload: { role: "system", content: "INTERNAL_ONLY_TEST_MARKER" },
      },
    ]);

    // 1. Publish share
    const publishRes = await app.request(
      `http://localhost:4310/v1/sessions/${sessionId}/share`,
      {
        method: "POST",
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        body: JSON.stringify({}),
      }
    );

    expect(publishRes.status).toBe(201);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const published = (await publishRes.json()) as {
      sharePath: string;
      token: string;
      status: { title: string; active: boolean };
    };

    expect(published.token).toBeDefined();
    expect(published.sharePath).toBe(`/c/${published.token}`);
    expect(published.status.title).toBe("Diskusi Arsitektur MíngZhàn");

    // 2. Visitor reads public share without any auth headers
    const publicRes = await app.request(
      `http://localhost:4310/v1/public/conversation-shares/${encodeURIComponent(published.token)}`,
      {
        method: "GET",
      }
    );

    expect(publicRes.status).toBe(200);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const publicData = (await publicRes.json()) as {
      id: string;
      title: string;
      messages: Array<{ role: string; content: string }>;
    };

    expect(publicData.title).toBe("Diskusi Arsitektur MíngZhàn");
    expect(publicData.messages.length).toBe(2);
    expect(publicData.messages[0]?.role).toBe("user");
    expect(publicData.messages[0]?.content).toBe("Halo, apa rencana kita?");
    expect(publicData.messages[1]?.role).toBe("assistant");
    expect(publicData.messages[1]?.content).toBe(
      "Kita akan mengadopsi fitur Projects dan Share Chat."
    );

    const userId = (await databaseAdapter.getActiveConversationShareBySession(
      orgId,
      sessionId
    ))!.created_by_user_id;

    await databaseAdapter.createArtifactShare({
      id: "artifact-link",
      orgId,
      profileId,
      sourcePath: "artifacts/report.md",
      filename: "Report",
      mimeType: "text/markdown",
      sizeBytes: 3,
      tokenHash: "artifact-token-hash",
      storagePath: "/tmp/shared-test",
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    });

    const list = await app.request("/v1/shared-links", {
      headers: session.headers({}, orgId),
    });

    expect(list.status).toBe(200);
    const listed = await list.json();
    expect(listed.links).toHaveLength(2);
    expect(JSON.stringify(listed)).not.toContain("token_hash");
    expect(JSON.stringify(listed)).not.toContain("snapshot_payload");
    expect(
      await databaseAdapter.listOwnedSharedLinks(orgId, "another-user")
    ).toHaveLength(0);
    expect(
      await databaseAdapter.revokeOwnedSharedLinks(orgId, "another-user")
    ).toBe(0);
    expect(
      await databaseAdapter.listOwnedSharedLinks("another-org", userId)
    ).toHaveLength(0);

    const headers = session.headers(
      { "X-CSRF-Token": session.csrfToken },
      orgId
    );

    const removed = await app.request(
      `/v1/shared-links/chat/${publicData.id}`,
      { method: "DELETE", headers }
    );

    expect(removed.status).toBe(200);
    expect((await removed.json()).revoked).toBe(1);
    expect(
      (await app.request(`/v1/public/conversation-shares/${published.token}`))
        .status
    ).toBe(404);
    expect(await databaseAdapter.getSession(sessionId)).not.toBeNull();
    expect(
      await databaseAdapter.listMessagesForSession(sessionId)
    ).toHaveLength(3);

    const all = await app.request("/v1/shared-links", {
      method: "DELETE",
      headers,
    });

    expect((await all.json()).revoked).toBe(1);
    expect(
      await databaseAdapter.listOwnedSharedLinks(orgId, userId)
    ).toHaveLength(0);
  });
});
