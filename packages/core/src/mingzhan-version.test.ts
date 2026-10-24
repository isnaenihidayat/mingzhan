import { describe, expect, test } from "bun:test";
import { getMíngZhànVersion } from "./mingzhan-version";

describe("getMíngZhànVersion", () => {
  test("prefers MINGZHAN_VERSION and strips a leading v", () => {
    expect(getMíngZhànVersion({ MINGZHAN_VERSION: "v9.9.9" })).toBe("9.9.9");
  });
});
