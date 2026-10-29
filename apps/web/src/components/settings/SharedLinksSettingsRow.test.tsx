import { expect, spyOn, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { client } from "@/lib/client";
import { SharedLinksSettingsRow } from "./SharedLinksSettingsRow";

test.each([false, true])(
  "Manage opens shared links and confirms revocation (all: %s)",
  async (all) => {
    const entry = {
      createdAt: "2026-10-29T00:00:00Z",
      id: "share",
      kind: "chat" as const,
      mimeType: null,
      name: "Project discussion",
      profileId: "profile",
      sessionId: "session",
    };

    const list = spyOn(client, "listSharedLinks").mockResolvedValue({
      links: [entry],
    });

    const revoke = spyOn(client, "revokeSharedLinks").mockResolvedValue({
      revoked: 1,
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    const queries = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // SAFETY: This component only reads the current org/user IDs.
    const auth = {
      activeOrg: { id: "org" },
      user: { id: "user" },
    } as AuthContextValue;

    const settle = () =>
      act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

    const find = (text: string) =>
      [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === text
      );

    try {
      await act(async () =>
        root.render(
          <MemoryRouter>
            <AuthContext.Provider value={auth}>
              <QueryClientProvider client={queries}>
                <SharedLinksSettingsRow />
              </QueryClientProvider>
            </AuthContext.Provider>
          </MemoryRouter>
        )
      );
      expect(list).not.toHaveBeenCalled();
      await act(async () => {
        find("Manage")?.click();
      });
      await settle();
      expect(document.body.textContent).toContain("Project discussion");
      expect(
        document.querySelector('a[href="/chat/profile/session"]')
      ).not.toBeNull();
      await act(async () => {
        if (all) {
          find("Delete all shared links")?.click();
        } else {
          document
            .querySelector<HTMLButtonElement>(
              '[aria-label="Delete shared link: Project discussion"]'
            )
            ?.click();
        }
      });
      expect(revoke).not.toHaveBeenCalled();
      await act(async () => {
        find("Delete")?.click();
      });
      await settle();
      expect(revoke).toHaveBeenCalledWith(all ? undefined : entry);
    } finally {
      await act(async () => root.unmount());
      queries.clear();
      container.remove();
      list.mockRestore();
      revoke.mockRestore();
    }
  }
);
