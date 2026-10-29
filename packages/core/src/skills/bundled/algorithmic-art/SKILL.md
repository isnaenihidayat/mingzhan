---
name: algorithmic-art
description: Generative art, seeded p5.js sketches, flow fields and particle systems. Seni generatif, visual algoritmik, animasi partikel.
include-body-on-match: false
---

Create original reproducible art through code.

1. Translate the subject into a few visual rules, then choose a deterministic random seed and bounded parameters. Preserve the seed with the output so a result can be reproduced.
2. Use canvas, SVG or p5.js when available. A self-contained canvas implementation avoids mandatory CDN dependencies; if using p5.js, disclose its network dependency or bundle it when practical.
3. Separate simulation state from drawing. Clamp particle counts and time steps, stop background animation when hidden, and provide reduced-motion or pause controls for animated pieces.
4. Expose only useful controls such as seed, density, palette and speed. Keep reset deterministic. Test edge parameter values and export at the requested dimensions using a real exporter.
5. Save the working HTML/source through save_artifact. Do not call a still image a running simulation or claim a video was exported without an encoder.
