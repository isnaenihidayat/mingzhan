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

`python-docx`

## Minimal creation and structural validation

```python
from docx import Document
from docx.shared import Inches

document = Document()
section = document.sections[0]
section.top_margin = section.bottom_margin = Inches(0.75)
document.add_heading("Quarterly report", level=0)
document.add_heading("Results", level=1)
document.add_paragraph("Revenue increased from 100 to 120 units.")
table = document.add_table(rows=1, cols=2)
table.rows[0].cells[0].text = "Period"
table.rows[0].cells[1].text = "Units"
for period, value in [("Previous", "100"), ("Current", "120")]:
    cells = table.add_row().cells
    cells[0].text, cells[1].text = period, value
path = "report.docx"
document.save(path)
checked = Document(path)
assert len(checked.tables) == 1
assert checked.tables[0].cell(2, 1).text == "120"
assert any(p.text == "Results" for p in checked.paragraphs)
```

## Reference

https://python-docx.readthedocs.io/en/latest/user/quickstart.html
