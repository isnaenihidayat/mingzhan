import { expect, spyOn, test } from "bun:test";
import { copyText } from "./copy-text";

test("copies from an HTTP-style dialog when the Clipboard API is denied", async () => {
  const clipboard = spyOn(navigator.clipboard, "writeText").mockRejectedValue(
    new Error("Clipboard unavailable")
  );

  const savedCommand = Object.getOwnPropertyDescriptor(document, "execCommand");
  const dialog = document.createElement("div");
  const trigger = document.createElement("button");

  dialog.setAttribute("role", "dialog");
  dialog.append(trigger);
  document.body.append(dialog);
  trigger.focus();

  let copied = "";

  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: (command: string) => {
      expect(command).toBe("copy");

      const field = dialog.querySelector("textarea");

      expect(document.activeElement).toBe(field);
      copied = field?.value ?? "";

      return true;
    },
  });

  try {
    await copyText("https://example.test/c/shared");
    expect(copied).toBe("https://example.test/c/shared");
    expect(dialog.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  } finally {
    clipboard.mockRestore();
    dialog.remove();

    if (savedCommand) {
      Object.defineProperty(document, "execCommand", savedCommand);
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }
  }
});
