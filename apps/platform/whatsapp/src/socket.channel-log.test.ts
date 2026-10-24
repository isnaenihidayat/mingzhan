import { afterEach, describe, expect, test } from "bun:test";
import { isChannelDebugEnabled } from "./socket";

describe("isChannelDebugEnabled", () => {
  const previousDebug = process.env.MINGZHAN_CH_DEBUG;

  afterEach(() => {
    if (previousDebug === undefined) {
      delete process.env.MINGZHAN_CH_DEBUG;
    } else {
      process.env.MINGZHAN_CH_DEBUG = previousDebug;
    }
  });

  test("is off by default", () => {
    delete process.env.MINGZHAN_CH_DEBUG;
    expect(isChannelDebugEnabled()).toBe(false);
  });

  test("is on when MINGZHAN_CH_DEBUG=1", () => {
    process.env.MINGZHAN_CH_DEBUG = "1";
    expect(isChannelDebugEnabled()).toBe(true);
  });
});
