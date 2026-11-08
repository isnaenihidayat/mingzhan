import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const python = process.env.MINGZHAN_DOCUMENT_PYTHON ?? "python3";

const available =
  Bun.spawnSync([python, "-c", "import openpyxl"]).exitCode === 0;

test.skipIf(!available)(
  "OOH workbook remains editable and refuses overwriting an artifact",
  async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "xlsx-builder-"));

    const builder = path.join(
      import.meta.dir,
      "xlsx/scripts/build_workbook.py"
    );

    const template = path.join(
      import.meta.dir,
      "xlsx/assets/ooh-commission.json"
    );

    const output = path.join(workspace, "commission.xlsx");

    try {
      const built = Bun.spawnSync([
        python,
        builder,
        template,
        "--output",
        output,
      ]);

      expect(built.exitCode).toBe(0);
      expect(JSON.parse(built.stdout.toString()).formulas).toBe(37);

      const checked = Bun.spawnSync([
        python,
        "-c",
        `
import sys
from openpyxl import load_workbook
w = load_workbook(sys.argv[1])
assert w.sheetnames == ['Asumsi', 'KPI', 'Tiering', 'Simulasi', 'Ketentuan']
assert sum(w['KPI'].cell(row, 2).value for row in range(2, 7)) == 1
assert len(w['Simulasi']._charts) == 1
for row in range(2, 11):
    assert w['Simulasi'].cell(row, 2).value == f'=VALUE(A{row})*Asumsi!$B$2'
    assert w['Simulasi'].cell(row, 4).data_type == 'f'
    assert w['Simulasi'].cell(row, 5).value == f'=B{row}*D{row}'
w.close()
`,
        output,
      ]);

      expect(checked.exitCode).toBe(0);
      const bytes = await Bun.file(output).bytes();
      expect(bytes.slice(0, 2)).toEqual(new Uint8Array([80, 75]));
      expect(
        Bun.spawnSync([python, builder, template, "--output", output]).exitCode
      ).not.toBe(0);
      expect(await Bun.file(output).bytes()).toEqual(bytes);
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  }
);

const canVerify =
  available &&
  Boolean(Bun.which("soffice") ?? Bun.which("libreoffice")) &&
  Bun.spawnSync([python, "-c", "import pymupdf"]).exitCode === 0;

test.skipIf(!canVerify)(
  "verified builder output contains independently checked commission results",
  async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "xlsx-cached-"));
    const output = path.join(workspace, "commission.xlsx");

    try {
      const built = Bun.spawnSync([
        python,
        path.join(import.meta.dir, "xlsx/scripts/build_workbook.py"),
        path.join(import.meta.dir, "xlsx/assets/ooh-commission.json"),
        "--output",
        output,
        "--verify",
      ]);

      expect(built.exitCode).toBe(0);
      const report = JSON.parse(built.stdout.toString());
      expect(report.recalculated).toBe(true);
      expect(report.warnings).toEqual([]);

      const checked = Bun.spawnSync([
        python,
        "-c",
        `
import sys
from openpyxl import load_workbook
w = load_workbook(sys.argv[1], data_only=True)
assert w['KPI']['B7'].value == 1
s = w['Simulasi']
for row in range(2, 11):
    factor = float(s.cell(row, 1).value)
    rate = 0 if factor < .8 else .03 if factor < 1 else .05 if factor < 1.2 else .07 if factor < 1.5 else .1
    assert abs(s.cell(row, 4).value - rate) < 1e-9
    assert abs(s.cell(row, 5).value - factor * 3000000000 * rate) < .01
w.close()
`,
        output,
      ]);

      expect(checked.exitCode).toBe(0);
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  },
  60_000
);

test.skipIf(!canVerify)(
  "verification rejects invalid formulas with actionable cell locations",
  async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "xlsx-invalid-"));

    try {
      const spec = path.join(workspace, "bad.json");
      await Bun.write(
        spec,
        JSON.stringify({
          sheets: [
            { name: "Calculation", rows: [["Value"], [{ formula: "=1/0" }]] },
          ],
        })
      );

      const built = Bun.spawnSync([
        python,
        path.join(import.meta.dir, "xlsx/scripts/build_workbook.py"),
        spec,
        "--output",
        path.join(workspace, "bad.xlsx"),
        "--verify",
      ]);

      expect(built.exitCode).not.toBe(0);
      expect(built.stderr.toString()).toContain("Calculation!A2");
      expect(built.stdout.toString()).toBe("");
      expect(await Bun.file(path.join(workspace, "bad.xlsx")).exists()).toBe(
        false
      );
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  },
  60_000
);

test.skipIf(!available)(
  "bare output filenames publish into the profile artifacts directory",
  async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "xlsx-publish-"));

    try {
      const built = Bun.spawnSync(
        [
          python,
          path.join(import.meta.dir, "xlsx/scripts/build_workbook.py"),
          path.join(import.meta.dir, "xlsx/assets/ooh-commission.json"),
          "--output",
          "result.xlsx",
        ],
        { cwd: workspace }
      );

      expect(built.exitCode).toBe(0);
      expect(
        await Bun.file(path.join(workspace, "artifacts/result.xlsx")).exists()
      ).toBe(true);
      expect(await Bun.file(path.join(workspace, "result.xlsx")).exists()).toBe(
        false
      );
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  }
);
