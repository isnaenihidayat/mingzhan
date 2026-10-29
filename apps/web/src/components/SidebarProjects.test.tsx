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
import { SidebarProjects } from "./SidebarProjects";

test("projects show five initially, expand their own chats and reveal all with Show more", async () => {
  const projects = Array.from({ length: 6 }, (_, index) => ({
    createdAt: "2026-10-29",
    createdByUserId: "user",
    customInstructions: "",
    defaultProfileId: null,
    description: "",
    id: `project-${index}`,
    name: `Project ${index}`,
    orgId: "org",
    updatedAt: "2026-10-29",
  }));

  const list = spyOn(client, "listProjects").mockResolvedValue({ projects });

  const sessions = spyOn(client, "listProjectSessions").mockResolvedValue({
    sessions: [
      {
        active: false,
        branchMessageIndex: null,
        channel: "web",
        createdAt: "2026-10-29",
        id: "chat-1",
        messageCount: 2,
        parentSessionId: null,
        pinned: false,
        preview: null,
        profileId: "agent-1",
        sortPosition: null,
        title: "Project discussion",
        updatedAt: "2026-10-29",
      },
    ],
  });

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // SAFETY: Project hooks only read isAuthenticated from this fixture.
  const auth = { isAuthenticated: true } as AuthContextValue;

  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  const button = (label: string) =>
    [...container.querySelectorAll("button")].find(
      (item) => item.textContent?.trim() === label
    );

  try {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AuthContext.Provider value={auth}>
            <QueryClientProvider client={queryClient}>
              <SidebarProjects />
            </QueryClientProvider>
          </AuthContext.Provider>
        </MemoryRouter>
      );
    });
    await settle();
    expect(button("Project 4")).toBeDefined();
    expect(button("Project 5")).toBeUndefined();
    expect(sessions).not.toHaveBeenCalled();
    await act(async () => {
      button("Project 0")?.click();
    });
    await settle();
    expect(button("Project 0")?.getAttribute("aria-expanded")).toBe("true");
    expect(sessions).toHaveBeenCalledWith("project-0");
    expect(
      container.querySelector('a[href="/chat/agent-1/chat-1"]')?.textContent
    ).toBe("Project discussion");
    await act(async () => {
      button("Project 0")?.click();
    });
    expect(
      container.querySelector('a[href="/chat/agent-1/chat-1"]')
    ).toBeNull();
    await act(async () => {
      button("Show more")?.click();
    });
    expect(button("Project 5")).toBeDefined();
    await act(async () => {
      button("Show less")?.click();
    });
    expect(button("Project 5")).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    list.mockRestore();
    sessions.mockRestore();
  }
});
