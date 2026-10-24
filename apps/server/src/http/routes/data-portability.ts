import { createRoute, z } from "@hono/zod-openapi";
import type {
  DataImportPreviewResponse,
  PreviewDataImportRequest,
  RestoreDataImportRequest,
  RestoreDataImportResponse,
} from "@mingzhan/core";
import {
  createMíngZhànDataExport,
  createMíngZhànOrgDataExport,
  createMíngZhànUserDataExport,
  decodeArchiveRequestData,
  previewMíngZhànDataImport,
  restoreMíngZhànDataImport,
} from "../../services/data-portability";
import { runWithPluginExportBarrier } from "../../services/plugin-service";
import type { ServerOptions } from "../context";
import { requirePlatformAdminFromContext } from "../org-guards";
import { errorResponse, json, readJson } from "../shared";
import type { HonoApp } from "../types";

export function registerDataPortabilityRoutes(
  app: HonoApp,
  options: ServerOptions
): void {
  const databaseAdapter = options.databaseAdapter;

  if (!databaseAdapter) {
    return;
  }

  const errorSchema = z
    .object({ error: z.string() })
    .openapi("ApiErrorResponse");

  const importRequestSchema = z
    .object({
      data: z.string(),
    })
    .openapi("PreviewDataImportRequest");

  const restoreRequestSchema = z
    .object({
      confirm: z.boolean(),
      data: z.string(),
    })
    .openapi("RestoreDataImportRequest");

  const previewResponseSchema = z
    .object({})
    .passthrough()
    .openapi("DataImportPreviewResponse");

  const restoreResponseSchema = z
    .object({})
    .passthrough()
    .openapi("RestoreDataImportResponse");

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "get",
      operationId: "exportPlatformOrganizationData",
      path: "/v1/platform/orgs/{orgId}/data/export",
      request: {
        params: z.object({
          orgId: z.string().openapi({ param: { in: "path", name: "orgId" } }),
        }),
      },
      responses: {
        200: {
          content: {
            "application/zip": {
              schema: z.string().openapi({ format: "binary", type: "string" }),
            },
          },
          description: "Organization data export ZIP",
        },
        403: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        404: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        500: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
      },
      summary: "Export one organization's portable data",
      tags: ["Platform"],
    })
  );

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "get",
      operationId: "exportPlatformUserData",
      path: "/v1/platform/users/{userId}/data/export",
      request: {
        params: z.object({
          userId: z.string().openapi({ param: { in: "path", name: "userId" } }),
        }),
      },
      responses: {
        200: {
          content: {
            "application/zip": {
              schema: z.string().openapi({ format: "binary", type: "string" }),
            },
          },
          description: "User data export ZIP",
        },
        403: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        404: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        500: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
      },
      summary: "Export one user's portable data",
      tags: ["Platform"],
    })
  );

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "get",
      operationId: "exportPlatformData",
      path: "/v1/platform/data/export",
      responses: {
        200: {
          content: {
            "application/zip": {
              schema: z.string().openapi({ format: "binary", type: "string" }),
            },
          },
          description: "MíngZhàn data export ZIP",
        },
        403: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        500: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
      },
      summary: "Export MíngZhàn data",
      tags: ["Platform"],
    })
  );

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "post",
      operationId: "previewPlatformDataImport",
      path: "/v1/platform/data/import/preview",
      request: {
        body: {
          content: { "application/json": { schema: importRequestSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: previewResponseSchema } },
          description: "Import preview",
        },
        400: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        403: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        413: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        500: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
      },
      summary: "Preview MíngZhàn data import",
      tags: ["Platform"],
    })
  );

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "post",
      operationId: "restorePlatformDataImport",
      path: "/v1/platform/data/import/restore",
      request: {
        body: {
          content: { "application/json": { schema: restoreRequestSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { "application/json": { schema: restoreResponseSchema } },
          description: "Import restored",
        },
        400: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        403: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        413: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
        500: {
          content: { "application/json": { schema: errorSchema } },
          description: "Error",
        },
      },
      summary: "Restore MíngZhàn data import",
      tags: ["Platform"],
    })
  );

  app.get("/v1/platform/orgs/:orgId/data/export", async (c) => {
    requirePlatformAdminFromContext(c);
    const orgId = decodeURIComponent(c.req.param("orgId"));

    const result = await createMíngZhànOrgDataExport(databaseAdapter, orgId);

    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Type": "application/zip",
      },
    });
  });

  app.get("/v1/platform/users/:userId/data/export", async (c) => {
    requirePlatformAdminFromContext(c);
    const userId = decodeURIComponent(c.req.param("userId"));

    const result = await createMíngZhànUserDataExport(databaseAdapter, userId);

    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Type": "application/zip",
      },
    });
  });

  app.get("/v1/platform/data/export", async (c) => {
    requirePlatformAdminFromContext(c);

    const result = options.googleMeetService
      ? await options.googleMeetService.withSnapshot(() =>
          createMíngZhànDataExport()
        )
      : await createMíngZhànDataExport();

    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Type": "application/zip",
      },
    });
  });

  app.post("/v1/platform/data/import/preview", async (c) => {
    requirePlatformAdminFromContext(c);

    const body = await readJson<PreviewDataImportRequest>(
      c.req.raw,
      importRequestSchema
    );

    // Decoded outside the catch so an oversized archive keeps its 413.
    const archive = decodeArchiveRequestData(body.data);

    try {
      const preview = await previewMíngZhànDataImport(archive);

      return json<DataImportPreviewResponse>(preview);
    } catch (error) {
      return errorResponse(formatImportError(error), 400);
    }
  });

  app.post("/v1/platform/data/import/restore", async (c) => {
    requirePlatformAdminFromContext(c);

    const body = await readJson<RestoreDataImportRequest>(
      c.req.raw,
      restoreRequestSchema
    );

    const archive = decodeArchiveRequestData(body.data);

    let restore;

    try {
      const restoreOperation = () =>
        runWithPluginExportBarrier(async () => {
          const { onBeforeDataRestore } = options;
          let databaseReleased = false;

          const result = await restoreMíngZhànDataImport(archive, {
            afterFailedReplace: options.onDataRestored,
            beforeReplace: onBeforeDataRestore
              ? async () => {
                  databaseReleased = true;
                  await onBeforeDataRestore();
                }
              : undefined,
            confirm: body.confirm,
          });

          // Drop registrations before reloading restored data; restored plugins stay disabled.
          try {
            await options.workerManager.clearPluginWorkers?.();
          } catch (error) {
            // The restore committed with the database released; reopen it before failing.
            if (databaseReleased) {
              await options.onDataRestored?.().catch(() => undefined);
            }

            throw error;
          }

          await options.onDataRestored?.();

          return result;
        });

      restore = options.googleMeetService
        ? await options.googleMeetService.withSnapshot(restoreOperation)
        : await restoreOperation();
    } catch (error) {
      return errorResponse(formatImportError(error), 400);
    }

    return json<RestoreDataImportResponse>(restore);
  });
}

function formatImportError<T>(error: T): string {
  return error instanceof Error ? error.message : String(error);
}
