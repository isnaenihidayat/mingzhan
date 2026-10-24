import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MíngZhànClient } from "@mingzhan/client";
import type { ProfileSummary } from "@mingzhan/core";
import { loadSavedCliProfileId, saveCliProfileId } from "./cli-config";
import {
  parseCliProfileArgs,
  resolveProfileInput,
  resolveStartupProfile,
  sortProfilesForPicker,
} from "./profile";

function profile(
  overrides: Partial<ProfileSummary> & Pick<ProfileSummary, "id" | "name">
): ProfileSummary {
  return {
    createdAt: "",
    hasAvatar: false,
    isSuper: false,
    mcpServerCount: 0,
    model: null,
    soulActive: false,
    toolCount: 0,
    updatedAt: "",
    ...overrides,
  };
}

const sampleProfiles = [
  profile({ id: "super_mingzhan", isSuper: true, name: "Super MíngZhàn" }),
  profile({ id: "profile_default", isDefault: true, name: "Default Bot" }),
  profile({ id: "profile_custom", name: "Research Bot" }),
];

test("startup defaults to Super MíngZhàn and respects saved and explicit choices", async () => {
  const configDir = await mkdtemp(join(tmpdir(), "mingzhan-cli-profile-"));
  const previous = process.env.MINGZHAN_CONFIG_DIR;
  process.env.MINGZHAN_CONFIG_DIR = configDir;

  // SAFETY: resolveStartupProfile only reads listProfiles from this fixture.
  const client = {
    listProfiles: async () => ({ profiles: sampleProfiles }),
  } as MíngZhànClient;

  try {
    expect((await resolveStartupProfile(client, {})).profileId).toBe(
      "super_mingzhan"
    );
    expect(await loadSavedCliProfileId()).toBe("super_mingzhan");
    await saveCliProfileId("profile_custom");
    expect((await resolveStartupProfile(client, {})).profileId).toBe(
      "profile_custom"
    );
    expect(
      (await resolveStartupProfile(client, { profileId: "profile_default" }))
        .profileId
    ).toBe("profile_default");
    await saveCliProfileId("deleted_profile");
    expect((await resolveStartupProfile(client, {})).profileId).toBe(
      "super_mingzhan"
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MINGZHAN_CONFIG_DIR;
    } else {
      process.env.MINGZHAN_CONFIG_DIR = previous;
    }

    await rm(configDir, { force: true, recursive: true });
  }
});

describe("parseCliProfileArgs", () => {
  test("reads --profile and -p", () => {
    expect(parseCliProfileArgs(["--profile", "profile_custom"])).toEqual({
      profileId: "profile_custom",
    });
    expect(parseCliProfileArgs(["-p", "super_mingzhan"])).toEqual({
      profileId: "super_mingzhan",
    });
  });

  test("reads --profile=value", () => {
    expect(parseCliProfileArgs(["--profile=profile_default"])).toEqual({
      profileId: "profile_default",
    });
  });
});

describe("sortProfilesForPicker", () => {
  test("puts default profile first", () => {
    const sorted = sortProfilesForPicker(sampleProfiles);
    expect(sorted[0]?.id).toBe("profile_default");
  });
});

describe("resolveProfileInput", () => {
  test("resolves id, name, and index", () => {
    expect(resolveProfileInput(sampleProfiles, "profile_custom")?.name).toBe(
      "Research Bot"
    );
    expect(resolveProfileInput(sampleProfiles, "Super MíngZhàn")?.id).toBe(
      "super_mingzhan"
    );
    expect(resolveProfileInput(sampleProfiles, "1")?.id).toBe(
      "profile_default"
    );
  });

  test("returns undefined for unknown input", () => {
    expect(resolveProfileInput(sampleProfiles, "missing")).toBeUndefined();
  });
});
