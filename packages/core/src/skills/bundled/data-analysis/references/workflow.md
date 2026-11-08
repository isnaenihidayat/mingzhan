# Reproducible analysis

Run scripts/analyze.py with Python 3.10+ and pandas/openpyxl in a workspace-local environment. Read source files through assigned tools first. Pass interpreter/script/input/output paths as separate arguments. Keep intermediate results in a staging directory within the active profile workspace.

Example arguments:
analyze.py inventory.csv --numeric booked capacity --group-by area --numerator booked --denominator capacity --output staging/analysis.json

For Excel, select a worksheet with --sheet. CSV uses UTF-8 with BOM handling by default; select --encoding if the actual source uses another encoding. Do not join files on approximate names without checking key uniqueness and join cardinality.

The script profiles missing/invalid numeric values and duplicates; it does not silently remove rows, impute missing values, or rewrite sources. Rates exclude rows with an invalid numerator, invalid denominator, or non-positive denominator. Inspect excluded_rows before interpreting a rate. Occupancy may need a different definition, such as booked seconds / sellable seconds; confirm this from the source. Restrict to a requested quarter/year before aggregating; the script does not infer dates.

JSON output contains audit metadata and computed summaries. It is not a finished narrative report. Use numeric calculations instead of rounding displayed percentages and averaging them. Explicitly label sample data.

Never claim live booking/inventory access from a static file. If no records or connector is available, ask for a file or access and the intended year. Preserve confidential rows inside the workspace. Do not send data to external services merely to make a chart.

For requested deliverables, reserve the artifact path with save_artifact before writing validated binary bytes, or save final text/JSON/CSV through that tool. Do not return a staging path as an owned artifact.
