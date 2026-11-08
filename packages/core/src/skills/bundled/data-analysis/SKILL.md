---
name: data-analysis
description: Analyze CSV and Excel data, missing values, duplicates, group statistics and weighted rates with reproducible calculations. Analisis data, statistik, occupancy rate, bersihkan CSV, laporan Excel.
include-body-on-match: false
---

Use assigned file/search tools to locate the requested source. Read references/workflow.md before running calculations.

1. Confirm the question, population, units, dates and meaning of each denominator. Inspect columns, row counts, missing values and duplicate keys. Preserve identifiers and original inputs.
2. Run scripts/analyze.py with an assigned execution tool for an auditable source profile and explicit numeric summaries. CSV columns are initially read as text; request numeric conversion only for measured columns. Read every warning before interpreting results.
3. Calculate derived metrics with Python, pandas or an available SQL tool. Use ratio of totals for weighted rates when appropriate, handle zero/missing denominators explicitly, and keep percentages in consistent units. Reconcile group totals to the source. Do not treat missing records as zero or present correlation as causation.
4. Clean data only within the user's scope. Record removed rows, duplicate handling, time boundaries and assumptions. For financial or numerical conclusions, compare a key result to an independent calculation.
5. Deliver findings in the user's language with source filenames, period, units and limitations. Save requested data/report files through assigned artifact tools. Use interactive-visualizations for filters, tables or charts, and xlsx for an editable workbook. If no execution runtime is assigned, explain the missing capability rather than inventing computed results.

Execution example (run from this skill directory, using profile-local absolute input/output paths and the selected interpreter):

python scripts/analyze.py INPUT.csv --output staging/analysis.json
