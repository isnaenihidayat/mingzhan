import { expect, spyOn, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { useArtifactAttachmentPreviewPanel } from "@/components/chat/use-artifact-attachment-preview-panel";
import { useArtifactPreviewContent } from "@/components/chat/use-artifact-preview-content";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import {
  type ChatAttachmentPanelConfig,
  ChatAttachmentPanelContext,
} from "@/context/chat-attachment-panel-context-shared";
import { client } from "@/lib/client";

test("Word preview budgets converted content instead of original file size", async () => {
  const root = createRoot(document.createElement("div"));
  const scoped = spyOn(client, "forOrg").mockReturnValue(client);

  const read = spyOn(client, "readProfileArtifactContent").mockResolvedValue({
    contentType: "text/markdown",
    data: new TextEncoder().encode("# Report").buffer,
  });

  function Preview() {
    useArtifactPreviewContent({
      artifact: {
        filename: "report.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        path: "report.docx",
        savedAt: "",
        sizeBytes: 12 * 1024 * 1024,
      },
      canPreview: true,
      isHtml: false,
      isImage: false,
      isPdf: false,
      isVideo: false,
      isWordDocument: true,
      open: true,
      profileId: "profile",
    });

    return null;
  }

  // SAFETY: This hook reads only activeOrg from auth.
  const auth = { activeOrg: null } as AuthContextValue;

  try {
    await act(async () =>
      root.render(
        <AuthContext.Provider value={auth}>
          <Preview />
        </AuthContext.Provider>
      )
    );
    expect(read).toHaveBeenCalledTimes(1);
    expect(read.mock.calls[0]?.[2]?.maxBytes).toBe(8 * 1024 * 1024);
    expect(read.mock.calls[0]?.[2]?.render).toBe("markdown");
  } finally {
    await act(async () => root.unmount());
    read.mockRestore();
    scoped.mockRestore();
  }
});

test("opening an artifact preview does not update the panel on every render", async () => {
  const queryClient = new QueryClient();
  const container = document.createElement("div");
  const root = createRoot(container);
  let openPanel!: () => void;
  let updates = 0;

  function Preview() {
    const [config, setConfig] = useState<ChatAttachmentPanelConfig | null>(
      null
    );

    const show = useCallback((next: ChatAttachmentPanelConfig) => {
      setConfig(next);
    }, []);

    const update = useCallback(
      (id: string, patch: Partial<ChatAttachmentPanelConfig>) => {
        updates += 1;
        setConfig((current) =>
          current?.id === id ? { ...current, ...patch } : current
        );
      },
      []
    );

    return (
      <ChatAttachmentPanelContext.Provider
        value={{
          activeId: config?.id ?? null,
          hide: () => setConfig(null),
          isFullscreen: false,
          isOpen: config !== null,
          requestRestore: () => () => undefined,
          show,
          update,
        }}
      >
        <PreviewHook />
      </ChatAttachmentPanelContext.Provider>
    );
  }

  function PreviewHook() {
    ({ openPanel } = useArtifactAttachmentPreviewPanel({
      artifact: {
        filename: "report.zip",
        mimeType: "application/zip",
        path: "report.zip",
        savedAt: "2026-10-07T00:00:00Z",
        sizeBytes: 12,
      },
      id: "report",
      profileId: "profile",
    }));

    return null;
  }

  // SAFETY: Preview reads only activeOrg and user from this fixture.
  const auth = { activeOrg: null, user: null } as AuthContextValue;

  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <Preview />
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    );
    await act(async () => openPanel());
    expect(updates).toBe(1);
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
  }
});

test("a card asks to restore its panel on mount and opens it when told to", async () => {
  const queryClient = new QueryClient();
  const root = createRoot(document.createElement("div"));
  const requests: { id: string; restoreKey: string }[] = [];
  let shown: ChatAttachmentPanelConfig | null = null;

  function Card() {
    useArtifactAttachmentPreviewPanel({
      artifact: {
        filename: "bakso.html",
        mimeType: "text/html",
        path: "artifacts/bakso.html",
        savedAt: "2026-10-07T00:00:00Z",
        sizeBytes: 12,
      },
      id: "turn-1:profile:artifacts/bakso.html",
      profileId: "profile",
    });

    return null;
  }

  // SAFETY: Preview reads only activeOrg and user from this fixture.
  const auth = { activeOrg: null, user: null } as AuthContextValue;

  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <ChatAttachmentPanelContext.Provider
              value={{
                activeId: null,
                hide: () => undefined,
                isFullscreen: false,
                isOpen: false,
                requestRestore: (restoreKey, id, open) => {
                  requests.push({ id, restoreKey });
                  open();

                  return () => undefined;
                },
                show: (config) => {
                  shown = config;
                },
                update: () => undefined,
              }}
            >
              <Card />
            </ChatAttachmentPanelContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    );

    expect(requests).toEqual([
      {
        id: "turn-1:profile:artifacts/bakso.html",
        restoreKey: "profile:artifacts/bakso.html",
      },
    ]);
    expect(shown).toMatchObject({
      id: "turn-1:profile:artifacts/bakso.html",
      restoreKey: "profile:artifacts/bakso.html",
    });
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
  }
});

test("file card previews by filename and downloads from its owning profile", async () => {
  const { spyOn } = await import("bun:test");

  const { ArtifactAttachmentPreview } = await import(
    "./artifact-attachment-preview"
  );

  const { client } = await import("@/lib/client");
  const { extractTurnArtifacts } = await import("@/lib/chat-artifacts");

  const [created] = extractTurnArtifacts([
    {
      content: "",
      id: "created",
      role: "tool",
      tool: "bash",
      toolResult: {
        exitCode: 0,
        stdout: JSON.stringify({ bytes: 100, path: "artifacts/report.xlsx" }),
      },
      toolStatus: "done",
    },
    {
      content: "File report.xlsx built and verified.",
      id: "reply",
      role: "assistant",
    },
  ]);

  expect(created?.filename).toBe("report.xlsx");

  const reads = spyOn(client, "readProfileArtifactContent").mockResolvedValue({
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    data: new Uint8Array([80, 75, 3, 4]).buffer,
  });

  const clicks = spyOn(
    window.HTMLAnchorElement.prototype,
    "click"
  ).mockImplementation(() => {});

  const queryClient = new QueryClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const shown: ChatAttachmentPanelConfig[] = [];
  // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
  const auth = { activeOrg: null, user: null } as AuthContextValue;

  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <ChatAttachmentPanelContext.Provider
              value={{
                activeId: null,
                hide: () => undefined,
                isFullscreen: false,
                isOpen: false,
                requestRestore: () => () => undefined,
                show: (config) => {
                  shown.push(config);
                },
                update: () => undefined,
              }}
            >
              <ArtifactAttachmentPreview
                artifact={{ ...created!, ownerProfileId: "owner" }}
                id="report"
                profileId="chat-profile"
              />
            </ChatAttachmentPanelContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>
      )
    );
    expect(reads).not.toHaveBeenCalled();
    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    await act(async () =>
      (
        container.querySelector(
          '[aria-label="Preview report.xlsx"]'
        ) as HTMLButtonElement
      ).click()
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]?.bodyClassName).toContain("overflow-hidden");
    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    await act(async () =>
      (
        container.querySelector(
          '[aria-label="Open in: report.xlsx"]'
        ) as HTMLButtonElement
      ).click()
    );
    const menu = Array.from(document.querySelectorAll('[role="menuitem"]'));
    expect(menu.some((item) => item.textContent?.includes("Preview"))).toBe(
      true
    );

    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    const download = menu.find((item) =>
      item.textContent?.includes("Download")
    ) as HTMLButtonElement;

    expect(download).toBeDefined();
    await act(async () => download.click());
    expect(reads).toHaveBeenCalledWith("owner", "report.xlsx", {
      maxBytes: 100 * 1024 * 1024,
    });
    expect(clicks).toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    reads.mockRestore();
    clicks.mockRestore();
    queryClient.clear();
  }
});
