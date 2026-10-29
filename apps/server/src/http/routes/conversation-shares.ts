import { z } from "@hono/zod-openapi";
import { MíngZhànApiError } from "@mingzhan/core";
import type {
  ConversationShareStatusResponse,
  PublicConversationShareResponse,
  PublishConversationShareResponse,
  RevokeConversationShareResponse,
} from "@mingzhan/core/contract";
import { resolveRequestClientOrigin } from "../../services/composio-callback-url";
import { ConversationShareService } from "../../services/conversation-share-service";
import type { ServerOptions } from "../context";
import {
  requireActiveOrgIdFromContext,
  requireOrgMemberFromContext,
} from "../org-guards";
import { json, readJson } from "../shared";
import type { HonoApp } from "../types";

export function registerConversationShareRoutes(
  app: HonoApp,
  options: ServerOptions
): void {
  if (!(options.databaseAdapter && options.authService)) {
    return;
  }

  const service = new ConversationShareService(
    options.databaseAdapter,
    options.authService
  );

  app.get("/v1/shared-links", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);

    return json({
      links: await options.databaseAdapter!.listOwnedSharedLinks(
        orgId,
        auth.user.id
      ),
    });
  });

  app.delete("/v1/shared-links", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);

    return json({
      revoked: await options.databaseAdapter!.revokeOwnedSharedLinks(
        orgId,
        auth.user.id
      ),
    });
  });

  app.delete("/v1/shared-links/:kind/:id", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const kind = c.req.param("kind");

    if (kind !== "chat" && kind !== "artifact") {
      return json({ error: "Invalid link type" }, 400);
    }

    const revoked = await options.databaseAdapter!.revokeOwnedSharedLinks(
      orgId,
      auth.user.id,
      kind,
      c.req.param("id")
    );

    return json({ revoked });
  });

  app.post("/v1/sessions/:sessionId/share", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const sessionId = decodeURIComponent(c.req.param("sessionId"));

    let clientOrigin: string | undefined;

    try {
      const body = await readJson(
        c.req.raw,
        z.object({ clientOrigin: z.string().optional() }).strict()
      );

      clientOrigin = resolveRequestClientOrigin(c.req.raw, body.clientOrigin);
    } catch {
      clientOrigin = resolveRequestClientOrigin(c.req.raw);
    }

    return json<PublishConversationShareResponse>(
      await service.publishConversationShare({
        orgId,
        sessionId,
        userId: auth.user.id,
        clientOrigin,
        request: c.req.raw,
      }),
      201
    );
  });

  app.get("/v1/sessions/:sessionId/share/status", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const sessionId = decodeURIComponent(c.req.param("sessionId"));

    const status = await service.getConversationShareStatus({
      orgId,
      userId: auth.user.id,
      sessionId,
      request: c.req.raw,
    });

    return json<ConversationShareStatusResponse | null>(status);
  });

  app.delete("/v1/sessions/:sessionId/share/:shareId", async (c) => {
    const auth = requireOrgMemberFromContext(c);
    const orgId = requireActiveOrgIdFromContext(c);
    const shareId = decodeURIComponent(c.req.param("shareId"));

    return json<RevokeConversationShareResponse>(
      await service.revokeConversationShare({
        orgId,
        shareId,
        userId: auth.user.id,
        sessionId: c.req.param("sessionId"),
      })
    );
  });

  app.get("/v1/public/conversation-shares/:token", async (c) => {
    const token = decodeURIComponent(c.req.param("token"));

    try {
      const data = await service.readPublicConversationShare(token);

      return json<PublicConversationShareResponse>(data);
    } catch (error) {
      if (error instanceof MíngZhànApiError && error.status === 404) {
        return json({ error: "Share not found" }, 404);
      }

      throw error;
    }
  });
}
