---
name: pdf
description: PDF extraction, merging, splitting, forms and printable PDF reports. Dokumen PDF, gabung PDF, pisah PDF, formulir PDF.
include-body-on-match: false
---

Work with PDF files in the user's profile workspace. Read [references/python.md](references/python.md) before producing or transforming a PDF.

1. Inspect the input: page count, encryption, selectable text, forms and scanned pages. Use pypdf for page operations and text; use OCR only when an OCR runtime is actually available. Do not describe an image-only scan as empty content.
2. For reports, use ReportLab with explicit page size, margins, paragraph styles and table headers. Escape user text before feeding it to markup-aware paragraph APIs. Embed an available Unicode font when the content needs it; never silently drop unsupported characters.
3. Preserve source files. Merge or split in requested order, retaining orientation and reporting intentional annotation/form changes. For forms, inspect field names and types before filling; retain editability unless the user asks for flattening. Do not promise digital signatures survive modification.
4. Validate by reopening the file, checking page count and extracted text, and checking populated fields where applicable. Render and inspect pages when a renderer is available; otherwise state that visual validation was not performed.
5. Deliver the verified PDF through the artifact path returned by MíngZhàn. A Markdown explanation is not a generated PDF.
