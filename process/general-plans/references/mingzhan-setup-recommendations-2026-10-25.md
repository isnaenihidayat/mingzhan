# Optional setup recommendations — 2026-10-25

Implemented the approved parts of Nakama's new onboarding without connecting them to the initial chat screen.

## Use

1. Open Settings → Setup recommendations → View recommendations.
2. Choose an agent. Edit goals opens the existing personalisation editor.
3. Press Generate recommendations. This is the only operation that asks the model to produce suggestions. Reopening saved recommendations, skipping, restoring and reading completion status do not generate suggestions.
4. Open an integration or organization context screen, or explicitly turn on a suggested skill. Existing server permissions still apply. Organization context steps are returned only to organization administrators.
5. Return to Settings to read completion status. Skip and Restore are available per item.

Progress is local to this browser, separated by organization, authenticated user and selected agent. Connected toolkits, assigned skills and business facts determine completion from current server data. Editing goals within the dialog clears the old saved suggestions; generating again is manual.

## Changes

- Ported the upstream checklist generator and tests, API contracts, authenticated endpoint, client method, goal choices and USER.md save callback.
- Generator selects at most five real, unfinished capabilities. Unknown and duplicate model IDs are rejected. Missing context/provider, malformed model responses and provider failures return an empty list.
- Refreshed managed provider credentials before generation.
- Added a Settings dialog that follows existing components. It never assigns capabilities on opening or generating.
- Goal choices retain previously saved custom goals and existing personal context.
- No onboarding flag, first-chat prompt, first-chat checklist, progress pill or chat layout change was added.
- Verified every existing file under `apps/web/src/pages/chat/`, plus the composer, stylesheet and stream helper, is byte-for-byte unchanged from the start of this task. All 13 previously protected user files also remain unchanged.
- Corrected the existing Bash test's macOS wait budget: its previous two-second assertion raced a three-second tool timeout. Production Bash behavior is unchanged.

## Validation

- Initial complete server/package suite: 4,423 passed, 22 skipped, 1 failed (the existing Bash timeout assertion described above). After correcting that assertion, all 120 focused generator, API, client, user-context and Bash tests passed. The entire server/package suite was not repeated after this test-only correction.
- Complete web suite: 905 passed, 0 failed, 105 test files.
- TypeScript/web build and server build passed.
- Ultracite and Oxlint passed on changed code; `git diff --check` passed.
- Knip still reports the same three pre-existing findings: `@types/mailparser`, `SUGGESTION_CATEGORIES`, and `SuggestionCategory`. No new findings.
- No real model request, external OAuth connection or browser automation was performed during validation.

## Local instance

Built and restarted the local instance on port 4310. Health is OK; the new endpoint is present in OpenAPI, and the dashboard serves the current build. Organization, user, agent, chat and message counts are unchanged.

Data backup: `/Users/isdev/.mingzhan-backups/before-setup-update-20261025-063200`.

No commit or push was made.
