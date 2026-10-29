import { z } from "@hono/zod-openapi";
import type {
  CreateProjectRequest,
  ListProjectFilesResponse,
  ListProjectsResponse,
  ProjectFileSummary,
  ProjectSummary,
  SessionSummary,
  UpdateProjectRequest,
  UploadProjectFileRequest,
} from "@mingzhan/core/contract";
import { ProjectService } from "../../services/project-service";
import type { ServerOptions } from "../context";
import {
  requireActiveOrgIdFromContext,
  requireOrgMemberFromContext,
} from "../org-guards";
import { json, readJson } from "../shared";
import type { HonoApp } from "../types";

export function registerProjectRoutes(
  app: HonoApp,
  options: ServerOptions
): void {
  if (!options.databaseAdapter) {
    return;
  }

  const service = new ProjectService(options.databaseAdapter);

  app.get("/v1/projects", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);

    const projects = await service.listProjects(orgId);

    return json<ListProjectsResponse>({ projects });
  });

  app.get("/v1/projects/:id/sessions", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const project = await service.getProject(orgId, c.req.param("id"));

    if (!project) {
      return json({ error: "Project not found" }, 404);
    }

    const sessions: SessionSummary[] = [];
    const { profiles } = await options.agent.listProfiles(orgId);

    for (const profile of profiles) {
      try {
        const result = await options.agent.listSessions(
          orgId,
          profile.id,
          ["web", "cli"],
          auth
        );

        sessions.push(
          ...result.sessions.filter(
            (session) => session.projectId === project.id
          )
        );
      } catch (error) {
        if (
          !(error instanceof Error && "status" in error && error.status === 403)
        ) {
          throw error;
        }
      }
    }

    return json({
      sessions: sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    });
  });

  app.post("/v1/projects", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);

    const body = await readJson(
      c.req.raw,
      z
        .object({
          color: z.string().optional(),
          customInstructions: z.string().optional(),
          defaultProfileId: z.string().nullable().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          name: z.string().min(1),
        })
        .strict()
    );

    // SAFETY: Zod schema matches CreateProjectRequest.
    const project = await service.createProject(
      orgId,
      auth.user.id,
      body as CreateProjectRequest
    );

    return json<ProjectSummary>(project, 201);
  });

  app.get("/v1/projects/:id", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));

    const project = await service.getProject(orgId, id);

    if (!project) {
      return json({ error: "Project not found" }, 404);
    }

    return json<ProjectSummary>(project);
  });

  app.patch("/v1/projects/:id", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));

    const body = await readJson(
      c.req.raw,
      z
        .object({
          color: z.string().optional(),
          customInstructions: z.string().optional(),
          defaultProfileId: z.string().nullable().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          name: z.string().min(1).optional(),
        })
        .strict()
    );

    // SAFETY: Zod schema matches UpdateProjectRequest.
    const project = await service.updateProject(
      orgId,
      id,
      body as UpdateProjectRequest
    );

    await options.agent.invalidateProjectSessions?.(orgId, id);

    return json<ProjectSummary>(project);
  });

  app.delete("/v1/projects/:id", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));

    await service.deleteProject(orgId, id);

    return json({ ok: true });
  });

  // --- Project Files ---

  app.get("/v1/projects/:id/files", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));

    const files = await service.listProjectFiles(orgId, id);

    return json<ListProjectFilesResponse>({ files });
  });

  app.post("/v1/projects/:id/files", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));

    const contentType = c.req.header("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return json({ error: "No file provided" }, 400);
      }

      const arrayBuf = await file.arrayBuffer();
      const bytes = Buffer.from(arrayBuf);

      const saved = await service.uploadProjectFile(orgId, id, auth.user.id, {
        bytes,
        filename: file.name,
        mediaType: file.type || "application/octet-stream",
      });

      await options.agent.invalidateProjectSessions?.(orgId, id);

      return json<ProjectFileSummary>(saved, 201);
    }

    const body = await readJson(
      c.req.raw,
      z
        .object({
          data: z.string().min(1),
          filename: z.string().min(1),
          mediaType: z.string().optional(),
        })
        .strict()
    );

    // SAFETY: Zod schema matches UploadProjectFileRequest.
    const req = body as UploadProjectFileRequest;
    const bytes = Buffer.from(req.data, "base64");

    const saved = await service.uploadProjectFile(orgId, id, auth.user.id, {
      bytes,
      filename: req.filename,
      mediaType: req.mediaType || "application/octet-stream",
    });

    await options.agent.invalidateProjectSessions?.(orgId, id);

    return json<ProjectFileSummary>(saved, 201);
  });

  app.get("/v1/projects/:id/files/:fileId/download", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));
    const fileId = decodeURIComponent(c.req.param("fileId"));

    const { summary, bytes } = await service.getProjectFile(orgId, id, fileId);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Disposition": `attachment; filename="${summary.filename}"`,
        "Content-Type": summary.mediaType || "application/octet-stream",
      },
    });
  });

  app.delete("/v1/projects/:id/files/:fileId", async (c) => {
    requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const id = decodeURIComponent(c.req.param("id"));
    const fileId = decodeURIComponent(c.req.param("fileId"));

    await service.deleteProjectFile(orgId, id, fileId);
    await options.agent.invalidateProjectSessions?.(orgId, id);

    return json({ ok: true });
  });
}
