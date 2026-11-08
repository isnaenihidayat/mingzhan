# Compact workbook generation

Use scripts/build_workbook.py with an assigned execution tool and an available Python interpreter with openpyxl. This avoids generating a large Python program for routine multi-sheet workbooks. Resolve the helper and input asset to absolute paths from the active skill directory. Keep the execution tool cwd at the profile workspace:
python ABSOLUTE_SKILL_DIRECTORY/scripts/build_workbook.py ABSOLUTE_STAGING_SPEC.json --output artifacts/WORKBOOK.xlsx --verify

For the OOH Sales/Account Executive KPI and annual gross billing commission request, start from assets/ooh-commission.json. It is a complete editable five-sheet workbook specification with explicit illustrative assumptions, formulas and scenarios around tier boundaries. Run the builder directly against that asset, then validate/recalculate the workbook. Do not read or rewrite the full JSON template or Python helper source for this standard request. Run directly against the bundled template, skipping step 2 below, unless the user supplied different targets, rates or requirements. Change its assumptions in a separate staging copy when needed. Avoid making up market benchmarks.

The helper and template are read-only skill assets. Never write SPEC.json beside the skill. Use a relative workspace path such as staging/ooh-spec.json through write_file, then pass the actual returned absolute path to the helper. The execution tool's default working directory is the profile workspace; do not set cwd to the shared skill directory.

For a new workbook:
1. Send a short progress message and check the interpreter/import with a small tool call. Prefer python from the host's document runtime when available. Reuse the installed runtime. If imports fail, report that dependency or create an isolated environment once; do not loop through global installs.
2. Write a compact JSON specification to a staging file through write_file. Use a few focused sheets instead of a very large first tool call. For larger specs, write one sheet at a time into separate staging files and assemble the JSON locally.
3. Invoke the builder with --verify. It runs document verification, recalculates formulas and replaces its output with the recalculated bytes. Read the returned qa_report; do not copy the uncalculated staging source over it. Read warnings and inspect pages. If the source contains proposed targets or commission rates, clearly label them as editable assumptions rather than verified market benchmarks.
4. Use a fresh output filename under artifacts/ with --verify so the validated file is immediately downloadable. Bare output filenames are also placed under artifacts/. Do not ask the user for permission to publish the requested file there. Verify its ZIP signature. A CSV is a separate format; never treat a CSV export as completion of an XLSX request.

Input:
{"sheets":[{"name":"Assumptions","rows":[["Item","Value"],["Annual target",3000000000]],"formats":{"B":"#,##0"}},{"name":"Calculator","rows":[["Metric","Result"],["Actual",3150000000],["Achievement",{"formula":"=B2/Assumptions!B2","format":"0.0%"}]]}]}

Cells are string/number/boolean/null or {"formula":"=SUM(B2:B5)","format":"#,##0"}. Strings beginning with = remain literal text unless wrapped in a formula object. Preserve account identifiers as strings. Formats can be set per column, widths per column, and freeze per sheet. Charts accept type bar/line, title, value_column, label_column, header_row, last_row and anchor. Indices are 1-based. A chart's range should omit totals unless intentionally included. The builder writes formulas; a spreadsheet engine must recalculate them before claiming computed results.

For tiered commissions specify whether the rate applies to all billing (retroactive) or only the marginal band. Put thresholds, rates, payout basis, timing, caps and clawbacks in editable inputs. Test just below, at and above tier boundaries. Label gross billing versus net revenue and ensure commission units are currency. Validate at least one numerical scenario independently.
