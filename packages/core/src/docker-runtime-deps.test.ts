import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

const RUNTIME_DEPS = ".docker/runtime-deps";

type Manifest = { dependencies?: Record<string, string> };

type Lockfile = {
  workspaces: Record<string, Manifest>;
  packages: Record<string, string[]>;
};

async function readCommittedJsonc<T>(relativePath: string): Promise<T> {
  const path = join(REPO_ROOT, relativePath);
  const file = Bun.file(path);
  expect(
    await file.exists(),
    `${relativePath} must be committed for the image build to be reproducible`
  ).toBe(true);
  // bun.lock is JSONC: the same tree bun writes, minus its trailing commas.
  const text = await file.text();

  // SAFETY: Callers supply a type whose fields are checked against committed fixture data.
  return JSON.parse(text.replaceAll(/,(\s*[}\]])/g, "$1")) as T;
}

function dockerStage(dockerfile: string, stage: string): string {
  const start = dockerfile.search(new RegExp(`^FROM .* AS ${stage}$`, "m"));
  expect(
    start,
    `Dockerfile no longer declares the ${stage} stage`
  ).toBeGreaterThan(-1);
  // Skip the stage's own FROM line so the next stage is the only cut point.
  const body = dockerfile.slice(dockerfile.indexOf("\n", start));
  const nextStage = body.search(/^FROM /m);

  return nextStage === -1 ? body : body.slice(0, nextStage);
}

const FROZEN_INSTALL =
  /bun install --frozen-lockfile --production --ignore-scripts/;

describe("production image dependency sets", () => {
  test("the runtime-deps stage installs the committed manifest and lockfile", async () => {
    const dockerfile = await Bun.file(join(REPO_ROOT, "Dockerfile")).text();
    const stage = dockerStage(dockerfile, "runtime-deps");

    expect(stage).toContain(
      "COPY .docker/runtime-deps/package.json .docker/runtime-deps/bun.lock ./"
    );
    expect(stage).toMatch(FROZEN_INSTALL);
    expect(stage).toContain("ARG INSTALL_CODING_AGENTS=false");
  });

  test("runtime keeps Chromium and FFmpeg for artifact and recording processing", async () => {
    const dockerfile = await Bun.file(join(REPO_ROOT, "Dockerfile")).text();
    const stage = dockerStage(dockerfile, "runtime");

    expect(stage).toMatch(/\bchromium\b/);
    expect(stage).toContain("COPY --from=ffmpeg-binaries /ffmpeg /ffprobe");
    expect(stage).not.toContain(".docker/meet-deps");
  });

  // `bun add` re-resolves whatever the registry serves that day, which is how a
  // rebuild of one commit could change the image without a repository change.
  test("no stage resolves packages against the registry", async () => {
    const dockerfile = await Bun.file(join(REPO_ROOT, "Dockerfile")).text();

    expect(dockerfile).not.toContain("bun add");
  });

  // The frozen install only pins bytes if the manifest itself is exact, and the
  // image ships whatever the lockfile resolves — so the two have to agree.
  test("every runtime dependency is exact and locked to the declared version", async () => {
    const manifest = await readCommittedJsonc<Manifest>(
      `${RUNTIME_DEPS}/package.json`
    );

    const lockfile = await readCommittedJsonc<Lockfile>(
      `${RUNTIME_DEPS}/bun.lock`
    );

    const declared = manifest.dependencies ?? {};

    expect(Object.keys(declared).length).toBeGreaterThan(0);
    expect(lockfile.workspaces[""]?.dependencies ?? {}).toEqual(declared);

    for (const [dependency, version] of Object.entries(declared)) {
      expect(version).toMatch(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
      expect(lockfile.packages[dependency]?.[0]).toStartWith(
        `${dependency}@${version}`
      );
    }
  });
});
