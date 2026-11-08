# Standalone dashboard

Run the installed scripts/build_dashboard.py through an assigned execution tool:
build_dashboard.py staging/chart-data.json --output staging/dashboard.html

The input is:
{"title":"Verified units","source":"inventory.csv, filtered to 2026 Q3","unit":"slots","rows":[{"label":"Sudirman","value":120},{"label":"Gatot Subroto","value":80}]}

These numbers are examples. Supply actual calculated values. Values must be finite numbers, not numeric strings. Use up to 5000 rows; aggregate before generating a larger dataset. This template is for label/value comparisons. For rates, label percentages accurately and do not sum percentages into an occupancy total.

The helper creates an offline HTML page with a text filter, sorting, zero-based diverging bars for negative values, a visible-data table and CSV export. Exports use current filter/sort results and escape formula prefixes in text labels. Text is inserted with textContent; embedded JSON escapes HTML script delimiters. The input source is not changed.

Check source labels, units, matching chart/table values, negative/zero scales, empty results, keyboard focus and phone width. Open HTML in an available authorized browser and actually change filter/sort controls before claiming interaction verification. Browser print hides controls and keeps the full filtered table. Do not claim this helper generates publication-quality scientific plots; use a plotting tool for that request.

Save final HTML through save_artifact rather than returning a staging filename. For a binary chart export use the format skill's staging/reservation procedure.
