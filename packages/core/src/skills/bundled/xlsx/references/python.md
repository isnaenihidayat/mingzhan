# Python execution and artifact delivery

These are independently written MíngZhàn recipes. They do not require Claude or a Claude subscription.

## Runtime

- File execution requires an assigned `bash` tool (or an equivalent assigned document tool). A skill adds instructions, not tool permissions. If execution is unavailable, ask the user to enable a suitable tool or select an equipped agent; do not claim to generate a binary file from prose.
- Work in `context.workspaceRoot`, the current profile workspace. Never use a fixed host/repository path or another organization's workspace.
- Check the interpreter version and needed imports first. Use Python 3.10 or newer for this document stack (prefer an available supported Python 3.12+); the operating system default may be older. Choose that interpreter explicitly for both venv creation and execution. Reuse an existing suitable environment. If dependencies are missing, use a workspace-local virtual environment and install only the packages needed for the requested output. Do not change system Python, reuse credentials or silently install packages globally. If network/package installation is blocked, report the missing dependency.
- Example isolated environment, after checking its version: `python3 -m venv .document-runtime`; use its `bin/python` (Windows: `Scripts/python.exe`) to run `-m pip install <packages>` and scripts. Paths must be quoted as paths, not interpolated into shell code.

## Preserve artifact ownership

1. When `save_artifact` is assigned, reserve an output with a non-empty UTF-8 placeholder such as `Document generation pending.` and the requested `artifacts/<name>.<extension>` path. Keep its returned path: it resolves name collisions and records ownership in the authenticated context.
2. Generate/validate in a temporary subdirectory of this profile workspace first. Copy the validated binary bytes into the exact reserved path with the execution tool. The server supplies artifact MIME types; do not create private metadata or write its database yourself.
3. Never pass binary bytes or base64 to the text-only `save_artifact` content field. Never call it again on the generated file, as it creates a new named text artifact.
4. If a reservation fails, stop before writing the deliverable. On generation failure, do not present the placeholder reservation as a finished file; clean it up through an authorized file tool if available and state what failed.
5. Reopen the final artifact to verify its signature and format. Give the user the returned artifact path through the normal MíngZhàn attachment/link flow. Sending it to an external channel is a separate authorized action.

The examples below write a local test filename. Replace it with the profile-local staging filename in real use and apply the delivery steps above. For user-supplied input, validate it and preserve the original rather than running embedded macros or executable content.

## Packages

`openpyxl`

## Minimal creation and structural validation

```python
from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, Reference

workbook = Workbook()
sheet = workbook.active
sheet.title = "Sales"
for row in [("Period", "Units"), ("Previous", 100), ("Current", 120), ("Total", "=SUM(B2:B3)")]:
    sheet.append(row)
sheet.freeze_panes = "A2"
sheet.column_dimensions["A"].width = 18
for cell in sheet["B"][1:]:
    cell.number_format = "#,##0"
chart = BarChart()
chart.title = "Sales units"
chart.add_data(Reference(sheet, min_col=2, min_row=1, max_row=3), titles_from_data=True)
chart.set_categories(Reference(sheet, min_col=1, min_row=2, max_row=3))
sheet.add_chart(chart, "D2")
path = "sales.xlsx"
workbook.save(path)
checked = load_workbook(path, data_only=False)
assert checked["Sales"]["B4"].value == "=SUM(B2:B3)"
assert checked["Sales"]["B3"].value == 120
# openpyxl does not calculate B4. Recalculation needs a spreadsheet engine.
```

## Reference

https://openpyxl.readthedocs.io/en/stable/tutorial.html
