---
name: xlsx
description: Excel XLSX workbooks, spreadsheet formulas, workbook charts and financial spreadsheets. File Excel, rumus Excel, grafik XLSX.
include-body-on-match: false
---

Create or edit real Excel workbooks. Treat the common extension typo xlxs as xlsx; save a real .xlsx file. Do not substitute CSV, Markdown or a Python script for a requested workbook. Use Data View for its connected-sheet workflows when that plugin is available; use this skill for an editable XLSX deliverable. For Sales/Account Executive KPI and commission workbooks, start from the bundled assets/ooh-commission.json template and adapt only the requested assumptions. The template is a proposed design, not verified market data. For new workbooks read [references/workbook-builder.md](references/workbook-builder.md) first and use the compact JSON builder when it fits. For editing existing workbooks read [references/python.md](references/python.md).

1. Inspect sheets, dimensions, named ranges, styles, formulas and source units. Preserve workbook structure, formulas, charts and macros that are outside the requested edit. Open macro-enabled workbooks with keep_vba=True and retain their correct extension.
2. Use openpyxl. Keep inputs, assumptions and computed results distinct. Use formulas for derived values, formats for dates/currency/percentages, and explicit units. Preserve identifiers such as account numbers as text. Treat imported text beginning with a formula marker as text unless the user intends a formula.
3. Build tables/charts from actual data, with meaningful ranges and labels. Do not invent values to fill gaps; mark missing data and distinguish estimates from measured figures.
4. openpyxl writes formulas but does not calculate them. Validate formula expressions/ranges, and recalculate with an available spreadsheet engine when required. Do not claim fresh cached results or complete formula evaluation without that engine. Preserve the editable formula workbook when making a recalculated copy.
5. Reopen the output to check sheet names, types, number formats, totals and formulas. Deliver the verified workbook and state any recalculation limit. Never rename a CSV to XLSX.

## Delivery gate

Before delivery, follow [references/verification.md](references/verification.md). Run structural checks, render page previews when supported, and inspect the rendered pages. For Excel, evaluate formulas with a real spreadsheet engine and compare key totals to an independent calculation. Report a missing renderer or formula engine as an unverified check; a script returning success alone is not proof of visual quality.

Creation command (replace every ABSOLUTE placeholder with the resolved skill/workspace path; keep cwd in the profile workspace):

python ABSOLUTE_SKILL_DIRECTORY/scripts/build_workbook.py ABSOLUTE_STAGING_SPEC.json --output artifacts/WORKBOOK.xlsx --verify
