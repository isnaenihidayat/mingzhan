import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  parseUserContext,
  renderUserContext,
} from "@mingzhan/core/user-context";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { UserContextForm } from "./UserContextForm";

let container: HTMLDivElement;

let root: Root;

let changed = "";

beforeEach(() => {
  container = document.createElement("div");
  root = createRoot(container);
  changed = "";
});

afterEach(async () => {
  await act(async () => root.unmount());
});

function Editor() {
  const [value, setValue] = useState(
    renderUserContext(
      { help: "Writing code", role: "Developer" },
      "Keep this introduction"
    )
  );

  return (
    <UserContextForm
      onChange={(next) => {
        changed = next;
        setValue(next);
      }}
      value={value}
    />
  );
}

test("goal choices preserve existing goals and other personal context", async () => {
  await act(async () => root.render(<Editor />));

  const oldGoal = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Writing code"
  )!;

  expect(oldGoal.getAttribute("aria-pressed")).toBe("true");

  const goal = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Write content"
  )!;

  await act(async () => goal.click());
  const parsed = parseUserContext(changed);
  expect(parsed.answers.help).toBe("Writing code, Write content");
  expect(parsed.answers.role).toBe("Developer");
  expect(parsed.extra.trim()).toBe("Keep this introduction");
  await act(async () => oldGoal.click());
  expect(parseUserContext(changed).answers.help).toBe("Write content");
});

test("a blank profile offers goals and a custom goal field", async () => {
  await act(async () =>
    root.render(<UserContextForm onChange={() => {}} value="" />)
  );
  expect(container.querySelector('[role="group"]')).not.toBeNull();

  const custom = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Something else"
  )!;

  await act(async () => custom.click());
  expect(
    container.querySelector('input[aria-label="What is your goal?"]')
  ).not.toBeNull();
});
