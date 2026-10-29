import { MíngZhànApiError } from "@mingzhan/core";
import type {
  AgentGroup,
  AgentGroupMessage,
} from "@mingzhan/core/agent-groups";
import {
  getAgentGroup,
  getAgentGroupMessage,
  getGroupSession,
  type StoredGroupSession,
} from "./agent-group-store";

/** A thread opens on an agent's message in the main chat. */
export function requireThreadRoot(
  orgId: string,
  sessionId: string,
  rootId: number
): AgentGroupMessage {
  const root = getAgentGroupMessage(orgId, sessionId, rootId);

  if (!root?.authorProfileId) {
    throw new MíngZhànApiError("Message not found", 404);
  }

  return root;
}

export function requireGroup(
  orgId: string,
  userId: string,
  groupId: string
): AgentGroup {
  const group = getAgentGroup(orgId, userId, groupId);

  if (!group) {
    throw new MíngZhànApiError("Group not found", 404);
  }

  return group;
}

export function requireSession(
  orgId: string,
  userId: string,
  groupId: string,
  sessionId: string
): StoredGroupSession {
  const session = getGroupSession(orgId, userId, groupId, sessionId);

  if (!session) {
    throw new MíngZhànApiError("Session not found", 404);
  }

  return session;
}
