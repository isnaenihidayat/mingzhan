export { MíngZhànApiError, MíngZhànAuthExpiredError } from "@mingzhan/core/api-error";

export { MíngZhànClient } from "./client";

export type {
  RemoteChatSession,
  SendMessageArg,
  StreamHandlers,
} from "./types";

import type { ProfileSummary } from "@mingzhan/core/contract";

export function getProfileAvatarUrl(
  profile: Pick<ProfileSummary, "id" | "hasAvatar" | "updatedAt">,
  orgId?: string
): string | null {
  if (!profile.hasAvatar) {
    return null;
  }

  const query = new URLSearchParams({ v: profile.updatedAt });

  if (orgId) {
    query.set("orgId", orgId);
  }

  return `/v1/profiles/${encodeURIComponent(profile.id)}/avatar?${query.toString()}`;
}
