# Built-in productivity and development skills — 2026-10-25

Added 17 independently authored MíngZhàn skills. No Anthropic document-skill prompts, scripts, assets or restricted packages were copied. MíngZhàn's built-in registry now contains 37 skills; plugin-provided skills remain separate.

## Assignment

Default agents automatically receive 12 productivity skills: pdf, docx, xlsx, pptx, doc-coauthoring, internal-comms, brand-guidelines, theme-factory, web-artifacts-builder, canvas-design, algorithmic-art and slack-gif-creator.

Super MíngZhàn additionally receives frontend-design, mcp-builder, webapp-testing, skill-creator and claude-api. The existing organization skill assignment UI can assign these specialist skills to other agents when desired. No tools, accounts or external permissions are granted by this update.

Instructions are discovered normally and read when selected. New skills use include-body-on-match=false so keyword matches do not eagerly inject 17 long procedures into a chat. Explicit `/skill <name>` invocation remains supported, and Indonesian request phrases are included in discovery descriptions.

## Document execution

PDF/DOCX/XLSX/PPTX include self-contained Python recipes in references/python.md. They cover dependency checks, a profile-local virtual environment, original-input preservation, structural validation and delivery through the existing artifact ownership flow. Python 3.10+ and an assigned execution tool are required; supported newer Python is preferred. Dependencies are checked/prepared for the requested task, not installed into system Python or included as a new universal runtime dependency. A skill is an instruction package, not an independent binary conversion engine.

The document path reserves an owned output with a nonempty pending marker through save_artifact, generates and validates in profile-local staging, then replaces the reserved file with binary bytes. Its database ownership is retained. Failure must never be reported as a completed document. Added XLSX/XLSM/PPTX MIME types for downloads.

Specialist skills preserve existing permissions: no automatic publishing, account connection, messaging, deployment, browser installation or production mutation. brand-guidelines uses the user's organization's identity, not Anthropic's brand. skill-creator routes mutations through existing skill_manage and review behavior.

## Verification

- 252 passed, 3 platform-specific skips, 0 failed across 21 core, database, service and artifact test files.
- Complete web suite: 905 passed, 0 failed across 105 files after the existing language-context test fixture was updated.
- Tests cover startup installation, reference copying, discovery for all 17 skills, Indonesian requests, existing-profile backfill, specialist scope, idempotence and binary artifact ownership/downloads.
- Independently executed all four document recipes using Python 3.12 in a temporary validation environment; each output was reopened and checked. This validates structural generation, not visual Office rendering, formula recalculation, OCR or every advanced edit operation.
- Server and TypeScript/web production builds passed. Scoped Ultracite, Oxlint and git diff --check passed.
- No existing production web source/assets were modified. The existing rail test fixture was wrapped in LanguageProvider to support the language context already present at task start; production language behavior was not changed. All other working tree edits present at task start were preserved.

## Activation

Restarted the local instance on port 4310; health passed. All 17 new records are enabled. Database verification confirms 12 new skills on the regular agent class and all 17 on Super agents. User, organization, profile, session and message counts are unchanged. References were copied alongside the installed skills.

Pre-update data backup: /Users/isdev/.mingzhan-backups/before-bundled-skills-20261025-161637.

Start a new chat to load the updated skill catalog. Examples: `/skill pdf`, `/skill docx`, `/skill xlsx`, `/skill pptx` followed by the task. For binary generation choose an agent with the required execution tool, such as an equipped Super MíngZhàn.

No commit or push was made.
