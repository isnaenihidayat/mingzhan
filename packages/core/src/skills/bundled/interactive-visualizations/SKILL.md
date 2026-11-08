---
name: interactive-visualizations
description: Create interactive charts, filterable tables, scenario explorers and self-contained data dashboards. Grafik interaktif, tabel filter, visualisasi data, dashboard analisis.
include-body-on-match: false
---

Turn verified data into a visualization the user can inspect.

1. Establish the question, actual source, units and period. Use data-analysis or an assigned calculation tool for aggregation. Distinguish observed values, estimates and scenarios; never invent intermediate points or missing records.
2. Use a native visual block for a small chart or table with the schema in references/native.md. For filters, sorting, downloads or scenarios, create a self-contained HTML artifact. Do not invent unsupported native renderer parameters.
3. For a filterable bar chart and table, run scripts/build_dashboard.py with a JSON input containing title, source, unit, and rows of label/value. The helper has no external dependencies. Use references/dashboard.md for the data contract and validation. Adapt the artifact only when the question needs a different visual.
4. Verify chart values against source calculations, including negative/zero values and empty filters. Test keyboard controls, search and sorting, responsive width and print output. Open the artifact in an available authorized browser for interaction checks; state when browser verification was unavailable.
5. Save the final HTML with save_artifact and follow artifact-design's ownership and delivery rules. Include the actual source and limitations. Keep raw private data inside the artifact/workspace unless external sharing was authorized.

Execution example (run from this skill directory, using profile-local absolute input/output paths and the selected interpreter):

python scripts/build_dashboard.py staging/chart-data.json --output staging/dashboard.html
