import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { convertDocxToMarkdown, extractDocxText } from "./docx-text";

const SAMPLE_DOCX = readFileSync(
  path.join(import.meta.dir, "__fixtures__", "sample.docx")
);

test("converts a docx to markdown, preserving structure", async () => {
  const markdown = await convertDocxToMarkdown(SAMPLE_DOCX);

  expect(markdown).toContain("Laporan Mingguan");
  expect(markdown).toContain("**teks tebal**");
});

test("extracts plain text from a docx", async () => {
  const text = await extractDocxText(SAMPLE_DOCX);

  expect(text).toContain("Laporan Mingguan");
  expect(text).not.toContain("<");
});

test("falls back to reading HTML that was saved under a .docx name", async () => {
  const html =
    "<html><head><style>body { color: #333; }</style></head><body><h1>Judul</h1><p>Isi</p></body></html>";

  const markdown = await convertDocxToMarkdown(Buffer.from(html, "utf8"));

  expect(markdown).toContain("# Judul");
  expect(markdown).not.toContain("color: #333");
});

test("rejects a genuine legacy OLE .doc payload", async () => {
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  expect(convertDocxToMarkdown(ole)).rejects.toThrow(
    /Convert the file to \.docx/
  );
});

test("reads bare WordprocessingML paragraphs and headings", async () => {
  const xml = [
    '<w:document xmlns:w="x"><w:body>',
    '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>',
    "<w:p/>",
    '<w:p><w:r><w:t xml:space="preserve">Fish &amp; </w:t><w:tab/><w:t>chips</w:t></w:r></w:p>',
    "</w:body></w:document>",
  ].join("");

  expect(await convertDocxToMarkdown(Buffer.from(xml))).toBe(
    "## Title\n\nFish & chips"
  );
});

test("bare WordprocessingML without close tags stays fast", async () => {
  const xml = `<w:document>${"<w:p><w:t>".repeat(50_000)}`;
  const started = performance.now();

  expect(await convertDocxToMarkdown(Buffer.from(xml))).toBe("");
  expect(performance.now() - started).toBeLessThan(1000);
});
