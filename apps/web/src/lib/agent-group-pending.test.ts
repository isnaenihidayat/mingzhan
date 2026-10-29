import { describe, expect, test } from "bun:test";
import {
  sharedFileMentions,
  shortenSharedPaths,
  withPanel,
} from "./agent-group-panels";

describe("shared file mentions", () => {
  const full =
    "/Users/me/.mingzhan/orgs/org_1/groups/0cee5bc1-efcf/shared/launch-plan.md";

  test("a full path reads as shared/…", () => {
    expect(shortenSharedPaths(`plan is at ${full}.`)).toBe(
      "plan is at shared/launch-plan.md."
    );
  });

  test("full and short paths name files relative to the folder, once each", () => {
    expect(
      sharedFileMentions(
        `see ${full}, and \`shared/notes/draft-v2.md\` plus shared/notes/a.md. again shared/launch-plan.md`
      )
    ).toEqual(["launch-plan.md", "notes/draft-v2.md", "notes/a.md"]);
  });

  test("a folder or a word ending in shared is not a file", () => {
    expect(sharedFileMentions("overshared/x.md and shared/notes/")).toEqual([]);
  });

  test("opening a file closes the other panels", () => {
    const next = withPanel(
      new URLSearchParams("thread=4&memory=1&x=y"),
      "files",
      "notes/a.md"
    );

    expect(next.toString()).toBe("x=y&files=notes%2Fa.md");
  });
});
