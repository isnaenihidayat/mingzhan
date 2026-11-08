"""Build a real XLSX from a compact JSON specification without generating Python code."""
import argparse
import json
from pathlib import Path
import math
import shutil
import subprocess
import sys
import tempfile
from openpyxl import Workbook, load_workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


def build(spec, output):
    if not isinstance(spec, dict):
        raise ValueError("Workbook specification must be a JSON object")
    sheets = spec.get("sheets")
    if not isinstance(sheets, list) or not 1 <= len(sheets) <= 30:
        raise ValueError("Provide between 1 and 30 sheets")
    workbook = Workbook()
    workbook.remove(workbook.active)
    for definition in sheets:
        name = definition["name"]
        if not isinstance(name, str) or not name or len(name) > 31 or any(c in name for c in "[]:*?/\\"):
            raise ValueError("Invalid worksheet name")
        if name.lower() in [entry.lower() for entry in workbook.sheetnames]:
            raise ValueError("Duplicate worksheet name")
        sheet = workbook.create_sheet(name)
        rows = definition.get("rows", [])
        if not isinstance(rows, list) or len(rows) > 10000:
            raise ValueError("Limit each sheet to 10000 rows")
        for number, row in enumerate(rows, 1):
            if not isinstance(row, list) or len(row) > 100:
                raise ValueError("Limit each row to 100 columns")
            for column, value in enumerate(row, 1):
                cell = sheet.cell(number, column)
                if isinstance(value, dict):
                    formula = value.get("formula")
                    if not isinstance(formula, str) or not formula.startswith("="):
                        raise ValueError("Formula objects need a formula beginning with =")
                    cell.value = formula
                    if value.get("format"):
                        cell.number_format = value["format"]
                else:
                    if not isinstance(value, (str, int, float, bool, type(None))):
                        raise ValueError("Cells must be primitives or formula objects")
                    if isinstance(value, float) and not math.isfinite(value):
                        raise ValueError("Numbers must be finite")
                    cell.value = value
                    if isinstance(value, str):
                        cell.data_type = "s"
                cell.alignment = Alignment(vertical="top", wrap_text=True)
        sheet.freeze_panes = definition.get("freeze", "A2")
        for cell in sheet[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="243746")
        for column in range(1, sheet.max_column + 1):
            letter = get_column_letter(column)
            sheet.column_dimensions[letter].width = min(60, max(16, max(
                (len(str(cell.value or "")) for cell in sheet[letter] if cell.data_type != "f"),
                default=16,
            ) + 2))
        for column, width in definition.get("widths", {}).items():
            sheet.column_dimensions[column].width = float(width)
        for column, number_format in definition.get("formats", {}).items():
            for cell in sheet[column][1:]:
                cell.number_format = number_format
        for index, chart_spec in enumerate(definition.get("charts", [])):
            chart = LineChart() if chart_spec.get("type") == "line" else BarChart()
            chart.title = chart_spec.get("title", "Comparison")
            chart.add_data(Reference(
                sheet, min_col=chart_spec["value_column"],
                min_row=chart_spec.get("header_row", 1),
                max_row=chart_spec.get("last_row", sheet.max_row)),
                titles_from_data=True)
            chart.set_categories(Reference(
                sheet, min_col=chart_spec.get("label_column", 1),
                min_row=chart_spec.get("header_row", 1) + 1,
                max_row=chart_spec.get("last_row", sheet.max_row)))
            sheet.add_chart(chart, chart_spec.get("anchor", f"H{2 + index * 16}"))
        sheet.sheet_properties.pageSetUpPr.fitToPage = True
        sheet.page_setup.orientation = "landscape"
        sheet.page_setup.paperSize = sheet.PAPERSIZE_A4
        sheet.page_setup.fitToWidth = 1
        sheet.page_setup.fitToHeight = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    checked = load_workbook(output, data_only=False)
    if checked.sheetnames != [definition["name"] for definition in sheets]:
        raise ValueError("Workbook verification failed")
    result = {"path": str(output), "sheets": checked.sheetnames,
              "bytes": output.stat().st_size,
              "formulas": sum(cell.data_type == "f" for sheet in checked for row in sheet for cell in row)}
    checked.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("spec", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--verify", action="store_true", help="Recalculate and render before delivering this workbook")
    args = parser.parse_args()
    if args.output.parent == Path("."):
        args.output = Path("artifacts") / args.output
    if args.output.suffix.lower() != ".xlsx":
        parser.error("Output must end in .xlsx")
    if args.output.exists():
        parser.error("Output already exists; use a fresh staging filename")
    try:
        spec = json.loads(args.spec.read_text(encoding="utf-8"))
        result = build(spec, args.output)
        if args.verify:
            helper = Path(__file__).resolve().parents[2] / "doc-coauthoring/scripts/verify_document.py"
            qa_parent = args.output.resolve().parent
            if qa_parent.name == "artifacts":
                qa_parent = qa_parent.parent
            qa_dir = Path(tempfile.mkdtemp(prefix=args.output.stem + "-qa-", dir=qa_parent))
            check = subprocess.run(
                [sys.executable, str(helper), str(args.output.resolve()),
                 "--output", str(qa_dir), "--recalculate", "--render"],
                capture_output=True, text=True, timeout=300, check=False,
            )
            report_file = qa_dir / "verification.json"
            if not report_file.is_file():
                raise ValueError("Workbook verification did not produce a report: " + check.stderr[-600:])
            report = json.loads(report_file.read_text(encoding="utf-8"))
            if check.returncode or not report.get("recalculated") or report.get("errors") or report.get("warnings"):
                issues = report.get("errors", []) + report.get("warnings", [])
                raise ValueError(f"Workbook verification failed ({report_file}): " + "; ".join(issues[:8]) + ". Correct the source spec and retry with a fresh output filename.")
            if report.get("recalculated_copy"):
                shutil.copyfile(report["recalculated_copy"], args.output)
            result.update(bytes=args.output.stat().st_size, qa_report=str(report_file),
                          recalculated=report.get("recalculated", False),
                          warnings=report.get("warnings", []),
                          rendered_pages=report.get("rendered_pages", []))
    except json.JSONDecodeError as error:
        parser.error(
            f"Invalid JSON at line {error.lineno}, column {error.colno}. "
            "Use numeric fractions such as 0.85 for 85%, and formula objects "
            "such as {\"formula\":\"=SUM(B2:B5)\"}."
        )
    except (ValueError, KeyError, TypeError, subprocess.TimeoutExpired) as error:
        if args.verify:
            args.output.unlink(missing_ok=True)
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
