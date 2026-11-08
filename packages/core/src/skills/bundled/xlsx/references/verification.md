# Verification workflow

Use the bundled doc-coauthoring/scripts/verify_document.py helper. Locate the installed doc-coauthoring directory from skill metadata, or as the sibling directory of this bundled skill. Use an assigned execution tool, the profile's workspace for staging, and the artifact ownership procedure in python.md.

Run the available Python 3.10+ interpreter with these arguments as separate argv entries:
HELPER STAGED_FILE --output NEW_QA_DIRECTORY --render.
Add --recalculate for XLSX files containing formulas.

Dependencies belong in a workspace-local environment: python-docx for DOCX, python-pptx for PPTX, openpyxl for XLSX, and PyMuPDF for PDF checks/page PNGs. Office-to-PDF conversion and XLSX recalculation require soffice or libreoffice on PATH. Use an isolated Office user profile; the helper does this automatically.

Read verification.json. Correct structural errors and assess every warning. Open all page PNGs using an available image inspection tool. Check missing content, clipping, table breaks, overlapping labels and font substitution at a readable zoom. Fix the source and rerun into a fresh QA directory. The helper leaves visual_review=pending: only actual image inspection establishes visual quality.

For XLSX, retain the original editable workbook, compare the recalculated copy's sheet names, formulas, formats and chart counts, then check formula_values and independent control totals. Missing cached values and formula errors are unresolved checks. LibreOffice can alter unsupported workbook features; verify preservation before replacing a complex original.

Keep QA JSON and PNGs outside artifacts/ unless requested. Copy only the validated deliverable to the reserved artifact path. Report structural validation, recalculation, and visual inspection separately.
