import { expect, mock, test } from "bun:test";
import type { SessionSummary } from "@mingzhan/core/contract";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { RecentChatRow } from "@/components/SidebarRecentChatRow";

test.each([false, true])(
  "chat actions render and dispatch optional sharing (enabled: %s)",
  async (sharing) => {
    const onTogglePin = mock(() => {});
    const onShare = mock(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecentChatRow
            onDelete={() => {}}
            onRename={() => {}}
            onShare={sharing ? onShare : undefined}
            onTogglePin={onTogglePin}
            profileId="profile-1"
            // SAFETY: The row reads only these session fields.
            session={{ id: "session-1", title: "Trip plan" } as SessionSummary}
          />
        </MemoryRouter>
      );
    });

    const link = container.querySelector("a");

    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
    });

    await act(async () => {
      link?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);

    const items = [...document.querySelectorAll('[role="menuitem"]')].map(
      (item) => item.textContent
    );

    expect(items).toEqual([
      "Open in new tab",
      "Copy link",
      ...(sharing ? ["Bagikan"] : []),
      "Rename",
      "Pin",
      "Delete",
    ]);

    if (sharing) {
      const share = [
        ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ].find((item) => item.textContent === "Bagikan");

      await act(async () => {
        share?.click();
      });
      expect(onShare).toHaveBeenCalledWith({
        id: "session-1",
        title: "Trip plan",
      });
      await act(async () => {
        link?.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: 10,
            clientY: 10,
          })
        );
      });
    }

    const pin = [
      ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ].find((item) => item.textContent === "Pin");

    await act(async () => {
      pin?.click();
    });

    expect(onTogglePin).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
);
