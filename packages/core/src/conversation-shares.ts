import crypto from "node:crypto";
import { assertConfigPathSegment } from "./soul/resolve";

export function generateConversationShareToken(): string {
  return `mzchat${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function buildConversationSharePath(token: string): string {
  return `/c/${assertConfigPathSegment(token, "shareToken")}`;
}
