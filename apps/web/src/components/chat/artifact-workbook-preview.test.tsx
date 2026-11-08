import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { WorkbookGrid } from "./artifact-workbook-preview";
import { clampAttachmentPanelWidth } from "./attachment-panel-width";

const workbook = {
  sheets: [
    {
      columns: 2,
      name: "Asumsi",
      rows: [
        { 0: { value: "Item" }, 1: { value: "Nilai" } },
        { 0: { value: "Target tahunan" }, 1: { value: "3,000,000,000" } },
      ],
      truncated: false,
    },
    {
      columns: 2,
      name: "KPI",
      rows: [
        { 0: { value: "Total" }, 1: { formula: "=SUM(B2:B6)", value: "100%" } },
      ],
      truncated: false,
    },
  ],
};

test("switches sheets, shows selected cached values/formulas, and changes zoom without editing", async () => {
  const element = document.createElement("div");
  const root = createRoot(element);

  try {
    await act(async () => root.render(<WorkbookGrid workbook={workbook} />));
    expect(element.textContent).toContain("Target tahunan");
    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    await act(async () =>
      (
        element.querySelector(
          '[aria-label="B2: 3,000,000,000"]'
        ) as HTMLButtonElement
      ).click()
    );
    expect(element.querySelector("output")?.textContent).toBe("3,000,000,000");
    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    await act(async () =>
      (
        Array.from(element.querySelectorAll('[role="tab"]')).find(
          (entry) => entry.textContent === "KPI"
        ) as HTMLButtonElement
      ).click()
    );
    expect(element.querySelector('[aria-selected="true"]')?.textContent).toBe(
      "KPI"
    );
    // SAFETY: The fixture or rendered element supplies the fields consumed at this call site.
    await act(async () =>
      (
        element.querySelector('[aria-label="B1: 100%"]') as HTMLButtonElement
      ).click()
    );
    expect(element.querySelector("output")?.textContent).toBe("=SUM(B2:B6)");
    const select = element.querySelector("select")!;
    await act(async () => {
      select.value = "150";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    expect(element.querySelector("table")?.style.fontSize).toBe("19.5px");
    expect(
      element.querySelector("input,textarea,[contenteditable=true]")
    ).toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});

test("preview uses available mobile width and clamps desktop widths", () => {
  expect(clampAttachmentPanelWidth(768, 390)).toBe(390);
  expect(clampAttachmentPanelWidth(768, 767)).toBe(767);
  expect(clampAttachmentPanelWidth(768, 900)).toBe(450);
  expect(clampAttachmentPanelWidth(1600, 1440)).toBe(1080);
});
