---
name: doc-coauthoring
description: Coauthor proposals, specifications, decision records and structured documentation. Kolaborasi dokumen, spesifikasi teknis, dokumen keputusan.
include-body-on-match: false
---

Help the user turn their context into a document readers can act on.

1. Identify the reader, required decision/action, source material and requested format. Ask only for missing context that changes the result; otherwise draft with stated assumptions.
2. Build the outline around the reader's questions. Separate evidence, proposals, decisions and unresolved questions. Preserve links to sources and keep invented examples explicitly labeled.
3. Draft the highest-value section first, then revise with user feedback. Preserve approved wording and organization-specific terminology; avoid repeatedly regenerating unrelated sections.
4. Review from the intended reader's perspective: can they identify the purpose, evidence, owner, next action and open decisions without the chat history? Fix ambiguous references and unsupported claims.
5. Deliver the requested document. For a file, use an assigned DOCX/PDF skill or save text through save_artifact; do not treat approval to draft as permission to publish or message colleagues.

## Document QA helper

For DOCX, XLSX, PPTX or PDF deliverables, the corresponding format skill can run scripts/verify_document.py through an assigned execution tool. It reopens files, checks structure, optionally recalculates a separate XLSX copy, and renders page PNGs. Read the JSON report and inspect page images before claiming visual validation. Rendering requires LibreOffice for Office inputs and PyMuPDF for page images; dependencies must exist on the execution host.

Execution example (run from this skill directory, using profile-local absolute input/output paths and the selected interpreter):

python scripts/verify_document.py STAGED_FILE --output NEW_QA_DIRECTORY --render
