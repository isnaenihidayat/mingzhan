import crypto from "node:crypto";
import {
  buildConversationSharePath,
  generateConversationShareToken,
  MíngZhànApiError,
} from "@mingzhan/core";
import type {
  ConversationShareStatusResponse,
  PublicConversationShareMessage,
  PublicConversationShareResponse,
  PublishConversationShareResponse,
  RevokeConversationShareResponse,
} from "@mingzhan/core/contract";
import type { DatabaseAdapter } from "@mingzhan/db";
import { z } from "zod";
import type { AuthService } from "./auth-service";
import {
  isLoopbackComposioCallbackBaseUrl,
  resolveComposioCallbackBaseUrl,
} from "./composio-callback-url";

function resolveConversationShareBaseUrl(options: {
  clientOrigin?: string;
  request?: Request;
}): string {
  return resolveComposioCallbackBaseUrl({
    clientOrigin: options.clientOrigin,
    request: options.request,
  });
}

const publicMessagePayloadSchema = z.object({
  content: z
    .union([
      z.string(),
      z
        .array(
          z.union([
            z.string(),
            z
              .object({ text: z.string().optional() })
              .transform((part) => part.text ?? ""),
          ])
        )
        .transform((parts) => parts.filter(Boolean).join("\n")),
    ])
    .optional(),
  role: z.enum(["user", "assistant"]),
  text: z.string().optional(),
});

export class ConversationShareService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly authService: AuthService
  ) {}

  async publishConversationShare(input: {
    orgId: string;
    sessionId: string;
    userId: string;
    clientOrigin?: string;
    request?: Request;
  }): Promise<PublishConversationShareResponse> {
    const session = await this.db.getSession(input.sessionId);

    const profile = session
      ? await this.db.getProfile(session.profileId)
      : null;

    if (
      !session ||
      session.userId !== input.userId ||
      profile?.orgId !== input.orgId
    ) {
      throw new MíngZhànApiError("Session not found", 404);
    }

    const rawMessages = await this.db.listMessagesForSession(input.sessionId);

    const sanitizedMessages: PublicConversationShareMessage[] =
      rawMessages.flatMap((message) => {
        const parsed = publicMessagePayloadSchema.safeParse(message.payload);

        if (!parsed.success) {
          return [];
        }

        return [
          {
            content: parsed.data.text ?? parsed.data.content ?? "",
            createdAt: message.createdAt,
            id: message.id,
            role: parsed.data.role,
          },
        ];
      });

    const existing = await this.db.getActiveConversationShareBySession(
      input.orgId,
      input.sessionId
    );

    let token: string | null = null;
    let shareId: string;
    let createdAt: string;

    if (existing) {
      shareId = existing.id;
      createdAt = existing.created_at;
      // When publishing again, we revoke previous or generate a fresh token to guarantee link possession
      token = generateConversationShareToken();
      await this.db.revokeConversationShare(
        input.orgId,
        existing.id,
        new Date().toISOString()
      );
    }

    token = generateConversationShareToken();
    shareId = crypto.randomUUID();
    createdAt = new Date().toISOString();

    await this.db.createConversationShare({
      created_at: createdAt,
      created_by_user_id: input.userId,
      id: shareId,
      org_id: input.orgId,
      revoked_at: null,
      session_id: input.sessionId,
      snapshot_payload: JSON.stringify(sanitizedMessages),
      title: session.title || "Percakapan MíngZhàn",
      token_hash: this.authService.hashToken(token),
    });

    const baseUrl = resolveConversationShareBaseUrl({
      clientOrigin: input.clientOrigin,
      request: input.request,
    });

    const sharePath = buildConversationSharePath(token);
    const shareUrl = `${baseUrl}${sharePath}`;

    return {
      sharePath,
      shareUrl,
      status: {
        active: true,
        createdAt,
        id: shareId,
        sharePath,
        shareUrl,
        title: session.title || "Percakapan MíngZhàn",
        webPublicUrlConfigured: !isLoopbackComposioCallbackBaseUrl(baseUrl),
      },
      token,
    };
  }

  async getConversationShareStatus(input: {
    orgId: string;
    userId: string;
    sessionId: string;
    request?: Request;
  }): Promise<ConversationShareStatusResponse | null> {
    const existing = await this.db.getActiveConversationShareBySession(
      input.orgId,
      input.sessionId
    );

    if (!existing || existing.created_by_user_id !== input.userId) {
      return null;
    }

    const baseUrl = resolveConversationShareBaseUrl({
      request: input.request,
    });

    return {
      active: true,
      createdAt: existing.created_at,
      id: existing.id,
      sharePath: "",
      shareUrl: null,
      title: existing.title,
      webPublicUrlConfigured: !isLoopbackComposioCallbackBaseUrl(baseUrl),
    };
  }

  async revokeConversationShare(input: {
    orgId: string;
    userId: string;
    sessionId: string;
    shareId: string;
  }): Promise<RevokeConversationShareResponse> {
    const share = await this.db.getActiveConversationShareBySession(
      input.orgId,
      input.sessionId
    );

    const revoked =
      share?.id === input.shareId && share.created_by_user_id === input.userId
        ? (await this.db.revokeOwnedSharedLinks(
            input.orgId,
            input.userId,
            "chat",
            input.shareId
          )) > 0
        : false;

    return {
      id: input.shareId,
      revoked,
    };
  }

  async readPublicConversationShare(
    token: string
  ): Promise<PublicConversationShareResponse> {
    const trimmed = token.trim();

    if (!trimmed) {
      throw new MíngZhànApiError("Share not found", 404);
    }

    const tokenHash = this.authService.hashToken(trimmed);
    const share = await this.db.getConversationShareByTokenHash(tokenHash);

    if (!share || share.revoked_at) {
      throw new MíngZhànApiError("Share not found", 404);
    }

    let messages: PublicConversationShareMessage[] = [];

    try {
      messages = JSON.parse(share.snapshot_payload);
    } catch {
      messages = [];
    }

    return {
      createdAt: share.created_at,
      id: share.id,
      messages,
      title: share.title,
    };
  }
}
