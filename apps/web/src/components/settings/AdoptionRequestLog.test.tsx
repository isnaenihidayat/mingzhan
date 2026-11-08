import { expect, spyOn, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { client } from "@/lib/client";
import { AdoptionRequestLog } from "./AdoptionRequestLog";

test("request log reads the selected account and loads the next page", async () => {
  const scoped = client.forOrg("org_one");
  const scope = spyOn(client, "forOrg").mockReturnValue(scoped);

  const entry = {
    agentName: "Sales agent",
    chat: { profileId: "sales", sessionId: "chat one" },
    durationMs: 240,
    estimatedCostUsd: null,
    id: 12,
    inputTokens: 30,
    modelId: "fixture-model",
    outputTokens: 4,
    profileId: "sales",
    provider: "openai",
    startedAt: "2026-11-08T12:00:00.000Z",
    status: "success" as const,
  };

  const list = spyOn(scoped, "listLlmRequestLog").mockImplementation(
    async (_id, filters) => ({
      entries: filters.before
        ? [{ ...entry, agentName: "Earlier agent", chat: undefined, id: 11 }]
        : [entry],
      nextCursor: filters.before ? null : entry.id,
      recordedSince: entry.startedAt,
    })
  );

  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  // SAFETY: The dialog only reads the viewer ID from the auth context.
  const auth = { user: { id: "viewer" } } as AuthContextValue;

  try {
    await act(async () =>
      root.render(
        <AuthContext.Provider value={auth}>
          <QueryClientProvider client={queries}>
            <AdoptionRequestLog
              account={{
                estimatedCostUsd: 0,
                id: "user_one",
                inputTokens: 30,
                name: "Test Account",
                outputTokens: 4,
                requestCount: 2,
                totalTokens: 34,
                trackedSince: entry.startedAt,
              }}
              onClose={() => {}}
              orgId="org_one"
              userId="user_one"
            />
          </QueryClientProvider>
        </AuthContext.Provider>
      )
    );
    await settle();
    expect(scope).toHaveBeenCalledWith("org_one");
    expect(list).toHaveBeenCalledWith("user_one", { before: undefined });
    expect(document.body.textContent).toContain("Sales agent");
    expect(
      document
        .querySelector('a[href="/chat/sales/chat%20one"]')
        ?.getAttribute("target")
    ).toBe("_blank");

    await act(async () => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Load more")
        ?.click();
    });
    await settle();
    expect(list).toHaveBeenCalledWith("user_one", { before: 12 });
    expect(document.body.textContent).toContain("Earlier agent");
    expect(document.querySelectorAll("tbody a")).toHaveLength(1);
  } finally {
    await act(async () => root.unmount());
    queries.clear();
    container.remove();
    list.mockRestore();
    scope.mockRestore();
  }
});
