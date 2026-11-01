# OpenHands Automate → MingZhan: feasibility

Research only, 2026-11-01. No application code or runtime was changed.

## Source manifest and map

OpenHands/OpenHands snapshot: `7df1e5c14c1ff1a9962562b29af0a9748735b9ac`, inspected through GitHub REST file reads and the recursive tree.

- `src/routes/automations-list.tsx`: search, grouping, filters, sorting, alternate views, import, setup and recommended flows.
- `src/components/features/automations/detail/activity-log-section.tsx`: run history, run links and activity export.
- `src/types/automation.ts`: schedule/event triggers, webhook source/filter metadata and activity export formats.
- README repository boundaries: OpenHands/OpenHands owns the frontend; OpenHands/automation owns scheduling, webhooks, history and dispatch. Copying the frontend does not install that backend.
- Official reference: https://github.com/OpenHands/docs/blob/main/openhands/usage/agent-canvas/prebuilt-automations.mdx

Target evidence: `apps/web/src/pages/automations/{automations-page-layout,automation-detail-panel,use-automations-page}.tsx` (hook extension `.ts`); `apps/server/src/services/automation-service.ts`; `packages/core/src/{contract,automation-validate,automation-scheduler}.ts`.

## Mapping and decisions

| Area | MingZhan state | Recommended boundary | Risk |
| --- | --- | --- | --- |
| Listing, search, detail, responsive layout | Existing sidebar/detail UI and search | Adapt the OpenHands page composition to existing components and APIs | Low |
| Enable/disable, manual run, schedule/timezone, run history | Existing service/scheduler and UI actions | Reuse existing backend; do not install a second scheduler | Low |
| Cards/list modes, filters, grouping, overview | New presentation work and some derived data | Bind every metric/action to actual authorized records | Low/medium |
| Templates and creation wizard | Chat-assisted creation and examples exist | Add validated templates; check real tool/credential prerequisites | Medium |
| Activity exports, import/export, tags | Source supports these; target parity not established | Add explicit schemas/endpoints where missing; never assume compatibility | Medium |
| Event/webhook automations | Target trigger union is manual/schedule/runAt | New event contracts, authenticated ingestion, deduplication and dispatch are needed | High |
| OpenHands backend selection and sandbox execution | Different execution and permission architecture | Keep MingZhan profiles/runtime; a full OpenHands backend integration is separate work | High |

## Architecture challenges

1. Does copying the page include its engine? No: the source has a separate automation service. Reuse MingZhan's working scheduler for supported triggers; otherwise controls can misrepresent execution.
2. Do triggers map? Schedule and manual behavior can map. Event/webhook behavior is missing from the target trigger contract and needs implementation before exposure.
3. Do permissions map? Source frontend uses backend/permission capabilities; target must retain organization and profile access checks. A visual port must not broaden access.
4. Do templates work automatically? No: source setup checks prerequisites. Target templates must validate installed tools, profiles, secrets and external connections before creation.
5. Do run history and metrics map? Existing target records can supply real runs/status; source-specific phases, logs or metrics cannot be filled with invented values.

Decision: feasible to adapt the interface using the existing MingZhan automation engine. Scope remains comparison until the desired screens are confirmed. Full source feature parity is a larger backend task. Overall risk is low/medium for presentation and existing actions, high for introducing a second execution service or webhook events without the corresponding contracts.

The user's first and second screenshots were not present in the current message. No visual comparison was claimed. The current initial-chat design should remain intact.
