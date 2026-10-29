---
name: web-artifacts-builder
description: Interactive HTML artifacts, React prototypes, stateful dashboards and browser mini-apps. Artefak interaktif, prototipe React, dashboard interaktif.
include-body-on-match: false
---

Build a working browser artifact with the complexity the task needs.

1. Use a self-contained HTML/CSS/JS artifact for small interactions. Use React or a build tool only when dependencies, state or routing justify it, and only when the execution runtime is available.
2. Follow artifact-design for MíngZhàn storage and visual conventions. For package-based work, build in a profile workspace subdirectory, then produce a browser-loadable deliverable. Do not deliver uncompiled JSX as a working HTML page.
3. Keep local state coherent and show loading/error states for actual requests. Clearly distinguish mock data from connected data. Do not embed credentials, access private APIs directly from a shared artifact, or imply a demo is production-connected.
4. Use relative assets or inline resources when possible; explain required network resources. A static artifact must not depend on a development server running on the user's host.
5. Verify build output, interactions when a browser is authorized/available, and that referenced assets exist. Save the final text artifact through save_artifact and report any server-side capability it still needs.
