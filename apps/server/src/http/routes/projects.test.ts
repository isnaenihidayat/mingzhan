import { describe, expect, test } from "bun:test";
import { createInMemoryDatabaseAdapter } from "@mingzhan/db";
import { AgentService } from "../../services/agent-service";
import { ProjectService } from "../../services/project-service";
import { setupTestConfigDir } from "../../test-config-dir";
import { createMinimalHonoApp } from "../test-app-helpers";
import { setupFreshInstallSession } from "../test-session-helpers";

setupTestConfigDir("mingzhan-projects-test-");

describe("project routes", () => {
  test("member can create, list, update, and delete projects with icon and color", async () => {
    const { app, databaseAdapter } = createMinimalHonoApp({
      databaseAdapter: createInMemoryDatabaseAdapter(),
    });

    const session = await setupFreshInstallSession(app, databaseAdapter);
    const orgId = session.orgId!;

    // 1. Create project with icon and color
    const createRes = await app.request("http://localhost:4310/v1/projects", {
      body: JSON.stringify({
        color: "#00b2be",
        customInstructions:
          "Gunakan bahasa Indonesia baku dan sertakan tipe data.",
        description: "Riset dan Pengembangan",
        icon: "rocket",
        name: "Proyek Alpha",
      }),
      headers: session.headers(
        {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrfToken,
        },
        orgId
      ),
      method: "POST",
    });

    expect(createRes.status).toBe(201);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const created = (await createRes.json()) as {
      color?: string;
      customInstructions: string;
      description: string;
      icon?: string;
      id: string;
      name: string;
    };

    expect(created.id).toMatch(/^prj_/);
    expect(created.name).toBe("Proyek Alpha");
    expect(created.icon).toBe("rocket");
    expect(created.color).toBe("#00b2be");
    expect(created.customInstructions).toBe(
      "Gunakan bahasa Indonesia baku dan sertakan tipe data."
    );

    // 2. List projects
    const listRes = await app.request("http://localhost:4310/v1/projects", {
      headers: session.headers({}, orgId),
      method: "GET",
    });

    expect(listRes.status).toBe(200);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const listData = (await listRes.json()) as {
      projects: Array<{ id: string; name: string }>;
    };

    expect(listData.projects.length).toBe(1);
    expect(listData.projects[0]?.name).toBe("Proyek Alpha");

    // 3. Upload project file
    const fileContent = "Ini adalah dokumen panduan proyek.";
    const base64Data = Buffer.from(fileContent).toString("base64");

    const uploadRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}/files`,
      {
        body: JSON.stringify({
          data: base64Data,
          filename: "panduan.txt",
          mediaType: "text/plain",
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "POST",
      }
    );

    expect(uploadRes.status).toBe(201);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const uploadedFile = (await uploadRes.json()) as {
      filename: string;
      id: string;
      mediaType: string;
      sizeBytes: number;
    };

    expect(uploadedFile.id).toMatch(/^prjfile_/);
    expect(uploadedFile.filename).toBe("panduan.txt");
    expect(uploadedFile.sizeBytes).toBe(Buffer.byteLength(fileContent));

    const context = await new ProjectService(
      databaseAdapter
    ).buildSourceContext(orgId, created.id);

    expect(context).toContain(fileContent);
    expect(context).toContain("panduan.txt");

    // 4. List project files
    const listFilesRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}/files`,
      {
        headers: session.headers({}, orgId),
        method: "GET",
      }
    );

    expect(listFilesRes.status).toBe(200);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const filesData = (await listFilesRes.json()) as {
      files: Array<{ filename: string; id: string }>;
    };

    expect(filesData.files.length).toBe(1);
    expect(filesData.files[0]?.filename).toBe("panduan.txt");

    // 5. Download project file
    const downloadRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}/files/${encodeURIComponent(uploadedFile.id)}/download`,
      {
        headers: session.headers({}, orgId),
        method: "GET",
      }
    );

    expect(downloadRes.status).toBe(200);
    const downloadedText = await downloadRes.text();

    expect(downloadedText).toBe(fileContent);

    // 6. Delete project file
    const deleteFileRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}/files/${encodeURIComponent(uploadedFile.id)}`,
      {
        headers: session.headers(
          {
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "DELETE",
      }
    );

    expect(deleteFileRes.status).toBe(200);

    // 7. Update project (change icon & color)
    const updateRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}`,
      {
        body: JSON.stringify({
          color: "#ff007f",
          description: "Deskripsi diperbarui",
          icon: "code",
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "PATCH",
      }
    );

    expect(updateRes.status).toBe(200);

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const updated = (await updateRes.json()) as {
      color: string;
      description: string;
      icon: string;
    };

    expect(updated.description).toBe("Deskripsi diperbarui");
    expect(updated.icon).toBe("code");
    expect(updated.color).toBe("#ff007f");

    // 8. Delete project
    const deleteRes = await app.request(
      `http://localhost:4310/v1/projects/${encodeURIComponent(created.id)}`,
      {
        headers: session.headers(
          {
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "DELETE",
      }
    );

    expect(deleteRes.status).toBe(200);

    // 9. Verify deleted
    const verifyListRes = await app.request(
      "http://localhost:4310/v1/projects",
      {
        headers: session.headers({}, orgId),
        method: "GET",
      }
    );

    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const verifyListData = (await verifyListRes.json()) as {
      projects: unknown[];
    };

    expect(verifyListData.projects.length).toBe(0);
  });

  test("can move an existing chat session into a project and remove it", async () => {
    const databaseAdapter = createInMemoryDatabaseAdapter();

    const agent = new AgentService(
      {
        defaultProviderId: "provider-1",
        providers: [
          {
            apiKey: "",
            baseUrl: "https://api.example.com/v1",
            createdAt: new Date().toISOString(),
            customModels: [{ default: true, id: "chat-model" }],
            id: "provider-1",
            label: "Test provider",
            type: "openai_compatible",
          },
        ],
      },
      null,
      databaseAdapter
    );

    const { app } = createMinimalHonoApp({
      agent,
      databaseAdapter,
    });

    const session = await setupFreshInstallSession(app, databaseAdapter);
    const orgId = session.orgId!;

    // Create a project
    const createPrjRes = await app.request(
      "http://localhost:4310/v1/projects",
      {
        body: JSON.stringify({
          name: "Proyek Beta",
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "POST",
      }
    );

    expect(createPrjRes.status).toBe(201);
    // SAFETY: Successful HTTP status and field assertions below verify this response fixture.
    const prj = (await createPrjRes.json()) as { id: string };

    for (const [projectId, cognito, expected] of [
      ["missing-project", false, 404],
      [prj.id, true, 400],
    ] as const) {
      const response = await app.request("http://localhost:4310/v1/sessions", {
        method: "POST",
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        body: JSON.stringify({
          channel: "web",
          profileId: session.defaultProfileId,
          projectId,
          cognito,
        }),
      });

      expect(response.status).toBe(expected);
    }

    // Create a session
    const createSessionRes = await app.request(
      "http://localhost:4310/v1/sessions",
      {
        body: JSON.stringify({
          channel: "web",
          profileId: session.defaultProfileId,
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "POST",
      }
    );

    expect(createSessionRes.status).toBe(201);

    // SAFETY: The successful create-session response provides the session ID asserted below.
    const { sessionId } = (await createSessionRes.json()) as {
      sessionId: string;
    };

    // Verify session initially has no projectId
    const getSession1 = await databaseAdapter.getSession(sessionId);
    expect(getSession1?.projectId).toBeNull();

    // Move session into project
    const moveRes = await app.request(
      `http://localhost:4310/v1/sessions/${encodeURIComponent(sessionId)}`,
      {
        body: JSON.stringify({
          projectId: prj.id,
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "PATCH",
      }
    );

    expect(moveRes.status).toBe(204);

    // Verify session now has projectId
    const getSession2 = await databaseAdapter.getSession(sessionId);
    expect(getSession2?.projectId).toBe(prj.id);
    await databaseAdapter.replaceMessagesForSession(sessionId, [
      {
        id: "project-chat-msg",
        sessionId,
        seq: 0,
        createdAt: new Date().toISOString(),
        payload: { role: "user", content: "Project planning" },
      },
    ]);

    const projectChats = await app.request(
      `http://localhost:4310/v1/projects/${prj.id}/sessions`,
      { headers: session.headers({}, orgId) }
    );

    expect(projectChats.status).toBe(200);
    expect(
      (await projectChats.json()).sessions.map(
        (item: { id: string }) => item.id
      )
    ).toContain(sessionId);

    // Move session out of project (remove from project back to general)
    const removeRes = await app.request(
      `http://localhost:4310/v1/sessions/${encodeURIComponent(sessionId)}`,
      {
        body: JSON.stringify({
          projectId: null,
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "PATCH",
      }
    );

    expect(removeRes.status).toBe(204);

    const getSession3 = await databaseAdapter.getSession(sessionId);
    expect(getSession3?.projectId).toBeNull();

    // Moving with empty string also safely normalizes to null
    const moveEmptyRes = await app.request(
      `http://localhost:4310/v1/sessions/${encodeURIComponent(sessionId)}`,
      {
        body: JSON.stringify({
          projectId: "",
        }),
        headers: session.headers(
          {
            "Content-Type": "application/json",
            "X-CSRF-Token": session.csrfToken,
          },
          orgId
        ),
        method: "PATCH",
      }
    );

    expect(moveEmptyRes.status).toBe(204);

    const getSession4 = await databaseAdapter.getSession(sessionId);
    expect(getSession4?.projectId).toBeNull();
  });
});
