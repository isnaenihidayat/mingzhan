/** The legacy path also supports LAN installs served over plain HTTP. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);

      return;
    } catch {
      // Some browsers expose the API but deny access.
    }
  }

  const previousFocus = document.activeElement;
  const selection = document.getSelection();

  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange()
      )
    : [];

  const field = document.createElement("textarea");

  field.value = text;
  field.readOnly = true;
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  (previousFocus?.closest('[role="dialog"]') ?? document.body).append(field);

  try {
    field.focus({ preventScroll: true });
    field.select();

    if (!document.execCommand("copy")) {
      throw new Error("Could not copy to the clipboard.");
    }
  } finally {
    field.remove();

    if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({ preventScroll: true });
    }

    if (selection && ranges.length > 0) {
      selection.removeAllRanges();

      for (const range of ranges) {
        selection.addRange(range);
      }
    }
  }
}
