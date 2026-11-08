import { expect, mock, spyOn, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { VirtuosoMockContext } from "react-virtuoso";
import {
  AuthContext,
  type AuthContextValue,
} from "@/context/auth-context-shared";
import { ThemeProvider } from "@/context/theme-context";
import { ChatMessageList } from "./chat-message-list";

class TestUtterance {
  onend?: () => void;
  onerror?: () => void;

  constructor(readonly text: string) {}
}

test("chat actions show the local timestamp, copy the prompt, and switch or stop speech", async () => {
  const speechDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "speechSynthesis"
  );

  const utteranceDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "SpeechSynthesisUtterance"
  );

  const spoken: TestUtterance[] = [];
  const cancel = mock(() => {});

  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: TestUtterance,
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel, speak: (item: TestUtterance) => spoken.push(item) },
  });

  const copy = spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // SAFETY: This fixture only reads viewer and active organization information.
  const auth = {
    activeOrg: { id: "org" },
    user: { id: "viewer" },
  } as AuthContextValue;

  const button = (label: string, index = 0) =>
    container.querySelectorAll<HTMLButtonElement>(
      `button[aria-label="${label}"]`
    )[index];

  const createdAt = "2026-11-08T06:26:00";
  const later = "2026-11-08T06:27:00";

  try {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queries}>
          <MemoryRouter>
            <ThemeProvider>
              <AuthContext.Provider value={auth}>
                <VirtuosoMockContext.Provider
                  value={{ itemHeight: 100, viewportHeight: 2000 }}
                >
                  <ChatMessageList
                    messages={[
                      {
                        content: "First prompt",
                        createdAt,
                        historyIndex: 0,
                        id: "u1",
                        role: "user",
                      },
                      {
                        content:
                          "# First reply\n\n[Guide](https://example.test)\n\n```visual\n{}\n```",
                        createdAt: later,
                        historyIndex: 1,
                        id: "a1",
                        role: "assistant",
                      },
                      { content: "Second prompt", id: "u2", role: "user" },
                      { content: "Second reply", id: "a2", role: "assistant" },
                    ]}
                    onBranchMessage={() => {}}
                    onEditMessage={() => {}}
                    onRetryMessage={() => {}}
                    sessionId="chat"
                  />
                </VirtuosoMockContext.Provider>
              </AuthContext.Provider>
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      )
    );

    const labels = (row: Element | null | undefined) =>
      [...(row?.querySelectorAll("button,time") ?? [])].map(
        (control) => control.getAttribute("aria-label") ?? control.textContent
      );

    expect(labels(button("Copy message")?.parentElement)).toEqual([
      "6:26 AM",
      "Copy message",
      "Edit message",
    ]);
    expect(labels(button("Copy response")?.parentElement)).toEqual([
      "Copy response",
      "Try again",
      "Read aloud",
      "Message actions",
      "6:27 AM",
    ]);
    expect(container.querySelectorAll("time")).toHaveLength(2);

    await act(async () => button("Copy message")?.click());
    expect(copy).toHaveBeenCalledWith("First prompt");
    expect(button("Copied")).toBeDefined();

    await act(async () => button("Read aloud")?.click());
    expect(spoken[0]?.text).toBe("First reply Guide");
    expect(button("Stop reading")).toBeDefined();

    await act(async () => button("Read aloud")?.click());
    expect(spoken[1]?.text).toBe("Second reply");
    const stop = button("Stop reading");
    expect(stop).toBeDefined();

    // The old callback can arrive after switching. It must not stop the new speech.
    await act(async () => spoken[0]?.onend?.());
    expect(button("Stop reading")).toBe(stop);
    await act(async () => stop?.click());
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(button("Stop reading")).toBeUndefined();
  } finally {
    await act(async () => root.unmount());
    queries.clear();
    container.remove();
    copy.mockRestore();

    for (const [name, descriptor] of [
      ["speechSynthesis", speechDescriptor],
      ["SpeechSynthesisUtterance", utteranceDescriptor],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(window, name, descriptor);
      } else {
        Reflect.deleteProperty(window, name);
      }
    }
  }
});
