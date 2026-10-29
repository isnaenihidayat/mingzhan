---
name: xlsx
description: Excel XLSX workbooks, spreadsheet formulas, workbook charts and financial spreadsheets. File Excel, rumus Excel, grafik XLSX.
include-body-on-match: false
---

Create or edit real Excel workbooks. Use Data View for its connected-sheet workflows when that plugin is available; use this skill for an editable XLSX deliverable. Read [references/python.md](references/python.md).

1. Inspect sheets, dimensions, named ranges, styles, formulas and source units. Preserve workbook structure, formulas, charts and macros that are outside the requested edit. Open macro-enabled workbooks with keep_vba=True and retain their correct extension.
2. Use openpyxl. Keep inputs, assumptions and computed results distinct. Use formulas for derived values, formats for dates/currency/percentages, and explicit units. Preserve identifiers such as account numbers as text. Treat imported text beginning with a formula marker as text unless the user intends a formula.
3. Build tables/charts from actual data, with meaningful ranges and labels. Do not invent values to fill gaps; mark missing data and distinguish estimates from measured figures.
4. openpyxl writes formulas but does not calculate them. Validate formula expressions/ranges, and recalculate with an available spreadsheet engine when required. Do not claim fresh cached results or complete formula evaluation without that engine. Preserve the editable formula workbook when making a recalculated copy.
5. Reopen the output to check sheet names, types, number formats, totals and formulas. Deliver the verified workbook and state any recalculation limit. Never rename a CSV to XLSX.
