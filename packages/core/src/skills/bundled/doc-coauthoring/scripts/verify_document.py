"""Structural checks, separate recalculation, and page previews for document skills."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile


def office_convert(source, target_dir, extension):
    executable = shutil.which("soffice") or shutil.which("libreoffice")
    if not executable:
        raise RuntimeError("LibreOffice is unavailable")
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / (source.stem + "." + extension)
    if target.exists():
        raise RuntimeError("Output already exists; use a fresh QA directory")
    with tempfile.TemporaryDirectory(prefix="office-profile-") as profile:
        result = subprocess.run(
            [executable, "-env:UserInstallation=" + Path(profile).as_uri(),
             "--headless", "--convert-to", extension, "--outdir",
             str(target_dir), str(source)],
            capture_output=True, text=True, timeout=120, check=False,
        )
    if result.returncode or not target.is_file():
        raise RuntimeError("Office conversion did not produce the requested output")
    return target


def verify(source, output, render=False, recalculate=False):
    report = {"format": source.suffix.lower(), "errors": [], "warnings": [],
              "rendered_pages": [], "recalculated": False, "visual_review": "pending"}
    extension = source.suffix.lower()
    if extension == ".docx":
        from docx import Document
        document = Document(source)
        report["paragraphs"] = len(document.paragraphs)
        report["tables"] = len(document.tables)
        for section in document.sections:
            if section.left_margin + section.right_margin >= section.page_width:
                report["errors"].append("Margins leave no printable page width")
    elif extension == ".pptx":
        from pptx import Presentation
        presentation = Presentation(source)
        report["slides"] = len(presentation.slides)
        for index, slide in enumerate(presentation.slides, 1):
            for shape in slide.shapes:
                if (shape.left < 0 or shape.top < 0 or
                    shape.left + shape.width > presentation.slide_width or
                    shape.top + shape.height > presentation.slide_height):
                    report["warnings"].append(f"Slide {index}: shape outside slide bounds")
    elif extension == ".xlsx":
        from openpyxl import load_workbook
        workbook = load_workbook(source, data_only=False)
        formulas = [(sheet.title, cell.coordinate)
                    for sheet in workbook for row in sheet for cell in row
                    if cell.data_type == "f"]
        report["sheets"] = workbook.sheetnames
        report["formula_count"] = len(formulas)
        workbook.close()
        checked_path = source
        if recalculate:
            try:
                checked_path = office_convert(source, output / "recalculated", "xlsx")
                report["recalculated"] = True
                report["recalculated_copy"] = str(checked_path)
                updated = load_workbook(checked_path, data_only=False)
                for name, coordinate in formulas:
                    if name not in updated.sheetnames or updated[name][coordinate].data_type != "f":
                        report["errors"].append(f"Formula lost: {name}!{coordinate}")
                updated.close()
            except (RuntimeError, subprocess.TimeoutExpired) as error:
                report["warnings"].append(str(error))
        cached = load_workbook(checked_path, data_only=True)
        report["formula_values"] = []
        for name, coordinate in formulas:
            if name not in cached.sheetnames:
                continue
            cell = cached[name][coordinate]
            report["formula_values"].append(
                {"sheet": name, "cell": coordinate, "value": cell.value})
            if cell.data_type == "e":
                report["errors"].append(f"Formula error: {name}!{coordinate} = {cell.value}")
            elif cell.value is None:
                report["warnings"].append(f"No cached result: {name}!{coordinate}")
        cached.close()
        if formulas and not report["recalculated"]:
            report["warnings"].append("Formula evaluation has not been verified")
    elif extension != ".pdf":
        raise ValueError("Supported formats: DOCX, PPTX, XLSX, PDF")

    pdf = source if extension == ".pdf" else None
    if render and pdf is None:
        try:
            pdf = office_convert(source, output / "preview", "pdf")
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            report["warnings"].append(str(error))
    if pdf is not None:
        try:
            import pymupdf
        except ImportError:
            import fitz as pymupdf
        with pymupdf.open(pdf) as document:
            if document.needs_pass:
                raise ValueError("Encrypted PDF requires a password")
            report["pages"] = len(document)
            report["text_characters"] = sum(len(page.get_text()) for page in document)
            if not report["text_characters"]:
                report["warnings"].append("No selectable text; inspect images or use OCR")
            if render:
                preview_dir = output / "pages"
                preview_dir.mkdir(parents=True, exist_ok=True)
                for number, page in enumerate(document, 1):
                    target = preview_dir / f"page-{number:03d}.png"
                    page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(target)
                    report["rendered_pages"].append(str(target))
    report["structural_ok"] = not report["errors"]
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--recalculate", action="store_true")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    output = args.output.resolve()
    if source.is_relative_to(output):
        parser.error("Use an output directory separate from the source")
    if (output / "verification.json").exists():
        parser.error("Output already contains a verification report; use a fresh QA directory")
    output.mkdir(parents=True, exist_ok=True)
    try:
        report = verify(source, output, args.render, args.recalculate)
    except Exception as error:
        report = {"structural_ok": False, "errors": [str(error)],
                  "visual_review": "pending", "rendered_pages": []}
    (output / "verification.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, default=str))
    raise SystemExit(0 if report["structural_ok"] else 1)


if __name__ == "__main__":
    main()
