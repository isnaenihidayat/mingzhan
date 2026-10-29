---
name: slack-gif-creator
description: Slack-compatible animated GIF creation, GIF loops and animation optimization. GIF animasi Slack, stiker animasi.
include-body-on-match: false
---

Produce a real animated GIF, with a clear small-scale motion idea.

1. Confirm intended display size, subject, duration and whether a loop/transparency is needed. Use current workspace/upload requirements when available instead of assuming one fixed Slack limit.
2. Use an available image/animation runtime, such as Pillow or FFmpeg. Draw frames at consistent dimensions, keep movement readable at the final size, and choose frame durations deliberately.
3. Use a palette and disposal mode that avoid trails and flicker. Test the last-to-first transition. Optimize by reducing unnecessary frames, palette size or dimensions while retaining the intended motion.
4. Reopen the GIF to verify animation frame count, dimensions, duration, loop behavior and byte size. Preview when a viewer is available; do not claim visual validation from byte size alone.
5. Return the actual GIF and optional source. Creating the GIF does not authorize posting it to Slack. If no encoder is available, state the dependency rather than delivering a renamed still image.
