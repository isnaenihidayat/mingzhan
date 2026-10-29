---
name: pptx
description: PowerPoint PPTX presentations, editable slides, pitch decks and presentation templates. Presentasi PowerPoint, slide PPTX.
include-body-on-match: false
---

Build editable PowerPoint presentations rather than HTML slides when PPTX is requested. Read [references/python.md](references/python.md) before generating the deck.

1. Establish audience, decision/message, slide count and any supplied template. Build a short narrative outline, then give each slide one clear takeaway.
2. Use python-pptx. Preserve a supplied template's master/layout relationships, slide size and existing content. Set widescreen or the requested page size explicitly. Use native text, shapes, tables and charts where practical so recipients can edit them.
3. Keep title/body hierarchies consistent. Bound each shape to the slide, allow room for labels, and avoid shrinking text to conceal overflow. Provide source labels for data and speaker notes when requested.
4. Reopen the deck to inspect slide count, text, shape bounds and required charts. Render through an available Office/LibreOffice runtime to inspect clipping and readability. If rendering is unavailable, report structural checks separately from visual checks.
5. Return the actual PPTX file, and a PDF preview only if one was successfully rendered. Do not present a raster image of each slide as a fully editable deck.
