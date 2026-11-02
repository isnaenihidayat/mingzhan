import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { convertHtmlToPdf, resolveChromeBin } from "./html-pdf";

const hasChrome = resolveChromeBin() !== null;

let dir: string;

let artifactsDir: string;

function mediaBoxes(pdf: Buffer): string[] {
  return [...pdf.toString("latin1").matchAll(/\/MediaBox\s*\[([^\]]+)\]/g)].map(
    (match) => match[1].trim().split(/\s+/).map(Number).join(" ")
  );
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "mingzhan-html-pdf-"));
  artifactsDir = path.join(dir, "artifacts");
  await mkdir(artifactsDir);
});

afterEach(async () => {
  await rm(dir, { force: true, recursive: true });
});

test("reports 501 when the server has no Chrome", async () => {
  await expect(
    convertHtmlToPdf("<p>Deck</p>", "deck.html", artifactsDir, null)
  ).rejects.toMatchObject({ status: 501 });
});

test("reports 501 when the configured Chrome does not exist", async () => {
  await expect(
    convertHtmlToPdf(
      "<p>Deck</p>",
      "deck.html",
      artifactsDir,
      path.join(dir, "no-chrome")
    )
  ).rejects.toMatchObject({ status: 501 });
});

test.skipIf(process.platform === "win32")(
  "starts Chrome without its sandbox when MINGZHAN_CHROME_NO_SANDBOX is true",
  async () => {
    const chrome = path.join(dir, "chrome");
    const argsFile = path.join(dir, "args");
    await writeFile(chrome, `#!/bin/sh\necho "$@" > "${argsFile}"\n`);
    await chmod(chrome, 0o755);
    const original = process.env.MINGZHAN_CHROME_NO_SANDBOX;
    process.env.MINGZHAN_CHROME_NO_SANDBOX = "true";

    try {
      await expect(
        convertHtmlToPdf("<p>Deck</p>", "deck.html", artifactsDir, chrome)
      ).rejects.toMatchObject({ status: 501 });
    } finally {
      if (original === undefined) {
        delete process.env.MINGZHAN_CHROME_NO_SANDBOX;
      } else {
        process.env.MINGZHAN_CHROME_NO_SANDBOX = original;
      }
    }

    expect((await readFile(argsFile, "utf8")).split(" ")).toContain(
      "--no-sandbox"
    );
  }
);

test.skipIf(!hasChrome)(
  "prints each slide of a deck as its own page with print CSS",
  async () => {
    const html = `<style>
      .slide{display:none}
      body{margin:0}
      @media print{@page{size:16in 9in;margin:0}.slide{display:block;height:9in;break-after:page}.slide:last-child{break-after:auto}}
    </style>
    <section class="slide">One</section>
    <section class="slide">Two</section>
    <section class="slide">Three</section>`;

    const pdf = await convertHtmlToPdf(html, "deck.html", artifactsDir);

    expect(mediaBoxes(pdf)).toEqual([
      "0 0 1152 648",
      "0 0 1152 648",
      "0 0 1152 648",
    ]);
  },
  60_000
);

test.skipIf(!hasChrome)(
  "loads assets from the artifacts folder and blocks files outside it",
  async () => {
    await mkdir(path.join(artifactsDir, "decks"));
    await writeFile(
      path.join(artifactsDir, "decks", "page.css"),
      "@page{size:4in 3in;margin:0}"
    );
    await writeFile(
      path.join(dir, "outside.css"),
      "@page{size:2in 2in;margin:0}"
    );

    const inside = await convertHtmlToPdf(
      '<link rel="stylesheet" href="page.css"><p>Deck</p>',
      "decks/deck.html",
      artifactsDir
    );

    const outside = await convertHtmlToPdf(
      '<style>@page{size:4in 3in;margin:0}</style><link rel="stylesheet" href="../../outside.css"><p>Deck</p>',
      "decks/deck.html",
      artifactsDir
    );

    expect(mediaBoxes(inside)).toEqual(["0 0 288 216"]);
    expect(mediaBoxes(outside)).toEqual(["0 0 288 216"]);
  },
  60_000
);

test("finds Chrome in the Windows installation directory without PATH", async () => {
  const originalRoot = process.env.ProgramFiles;
  const originalChrome = process.env.MINGZHAN_CHROME_PATH;
  const binary = path.join(
    dir,
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  );
  await mkdir(path.dirname(binary), { recursive: true });
  await writeFile(binary, "installed Chrome fixture");
  const which = spyOn(Bun, "which").mockReturnValue(null);

  try {
    delete process.env.MINGZHAN_CHROME_PATH;
    process.env.ProgramFiles = dir;
    expect(resolveChromeBin("win32")).toBe(binary);
  } finally {
    which.mockRestore();
    if (originalRoot === undefined) {
      delete process.env.ProgramFiles;
    } else {
      process.env.ProgramFiles = originalRoot;
    }
    if (originalChrome === undefined) {
      delete process.env.MINGZHAN_CHROME_PATH;
    } else {
      process.env.MINGZHAN_CHROME_PATH = originalChrome;
    }
  }
});
