---
name: docx
description: Word DOCX documents, proposal documents, SOP documents and editable Word templates. Dokumen Word, proposal DOCX, surat DOCX.
include-body-on-match: false
---

Produce editable Word documents, or make targeted edits to an existing DOCX. Read [references/python.md](references/python.md) before generating a file.

1. Identify audience, document purpose, required template and existing document structure. Keep the user's chosen format and language.
2. Use python-docx for paragraphs, runs, named styles, headings, tables, headers, footers and sections. Use real paragraph/list styles instead of simulated headings or repeated spaces. Set page size, margins and table widths intentionally.
3. Editing: preserve styles, section breaks, links, comments and revision markup not involved in the change. Replacing a paragraph's entire text can destroy run formatting. For tracked changes, comments or complex OOXML, inspect the relevant XML and relationships; do not claim python-docx preserves every unsupported feature.
4. Reopen the saved document and verify headings, paragraphs, table dimensions and required content. If LibreOffice or another renderer is available, render a separate PDF preview and inspect pagination, clipping and table breaks. Never claim a visual check based only on successful saving.
5. Return the actual DOCX artifact. State any unsupported editing operation before applying a lossy workaround.
