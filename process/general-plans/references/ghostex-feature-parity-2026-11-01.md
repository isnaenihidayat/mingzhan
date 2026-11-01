# Ghostex → MingZhan: functional feature comparison

Date: 2026-11-01 (Asia/Jakarta). Research only; no application changes or deployment.

## Evidence and scope

- Source: https://github.com/maddada/Ghostex, commit `cfabca459a7d3115047a376c3e2cfe16fe88e602`; package version 10.42.1.
- Source checkout: `/tmp/mz-ghostex-study-20261101`. README, changelog and implementation files were read; upstream scripts were not executed.
- Target: `/Users/isdev/OtherHD/Dev/MingZhan/mingzhan`, HEAD `b87f4f776d02f74c08f64771b44d134b9c84fd7f`, including current uncommitted implementation changes.
- No existing `graphify-out` index was found in the target; the comparison uses focused source reads and searches.
- This is static feasibility evidence, not a completed runtime parity test. No feature below is claimed to be already identical to Ghostex.
- Scope downgraded to `--compare`: Ghostex's single-user native session host and MingZhan's multi-tenant web/server runtime differ. New persistent state and host execution ownership need explicit design before implementation.
- Preserve MingZhan's initial chat design. Additions can use existing message actions, side panels, project controls and settings.

## Candidate and dependency matrix

| Feature | Ghostex source | Existing MingZhan integration | Missing behavior and required runtime | Decision |
| --- | --- | --- | --- | --- |
| Persistent prompt queue | `server/src/session_chat_queue.rs`; `server/src/session_chat_queue_runtime/endpoints.rs`; `packages/gx-chat-core/src/composer/queue_edit.rs` | `apps/web/src/pages/chat/use-chat-page.ts`; `apps/web/src/components/chat/ChatMessageQueuePanel.tsx`; `apps/server/src/services/session-turn-registry.ts` | Server queue, attachment persistence, editing/removal/reordering, delivery claims, follower updates, explicit failure/retry. Send-now must cancel/steer through supported backend semantics rather than start overlapping writers. | High priority; extend existing queue. |
| Document annotations and feedback | `apps/desktop/src/app/native_docs/annotations/{model,anchoring,sidecar,feedback}.rs`; `apps/desktop/src/app/docs_annotation_feedback.rs` | `apps/web/src/components/chat/artifact-markdown-editor.tsx`; artifact previews; normal chat send path | Versioned anchors, selected quotes, line spans, quick labels, stored pending/sent notes, safe HTML frame selection bridge and diagram element anchors. Send feedback to the intended session. | High priority; each supported document type needs its own anchor adapter. |
| Fuzzy prompt/session history search | `packages/find/src/{index,fuzzy,scan,favorites}.rs`; `server/src/agent_prompt_search.rs` | `packages/db/src/adapters/sqlite.ts` session query; `apps/web/src/lib/session-list.ts`; sidebar recents | MingZhan already searches title and user/assistant text using substring LIKE. Add indexed fuzzy ranking, per-prompt result/snippet, agent/project filters, prompt favorites and resume. Ghostex also scans external agent histories: matching that scope requires explicit host adapters, not scanning the Docker filesystem and claiming host coverage. | High priority for MingZhan history; external CLI history requires the host runtime and adapters. |
| Real Git worktrees per task | `server/src/server/worktree_ops/`; `server/src/worktree_sessions.rs`; `server/src/worktree_branch_name.rs` | Project service; session `codingWorkspaceRoot`; coding-agent harness | Git process execution on the actual repository host, branch/base choice, worktree registration, cwd routing, failure cleanup and guarded removal. A project name or plain subdirectory is not a worktree. | Feasible with a host executor. Docker must own a mounted repository or call an authenticated host executor; desktop-control MCP alone is not a Git runtime. |
| Conversation handoff | `packages/gx-core/src/session_handoff.rs`; `server/src/session_transcript_export/`; `apps/desktop/src/app/gx_store/git/session_handoff.rs` | Persisted sessions, child sessions, configured coding backends, project service | Export a readable transcript and artifact references, create the target session, preserve context, stop source work when required, and close the source only after success. Ghostex itself uses a transcript handoff, not transfer of private model state. | Feasible for configured local backends/projects. Cross-computer parity additionally needs authenticated remote runtimes and artifact transfer. |
| Kanban with dependencies | `apps/desktop/src/app/native_kanban/{beads,blockers,blocker_edits,mutations}.rs` | Project service; `apps/server/src/services/agent-todo-state.ts`; `AgentTodoPanel.tsx` | Ghostex calls the real Beads `bd` backend. Use the same engine for engine-level compatibility: install/version-pin it, bind project workspace, expose controlled agent tools, persist board state and reject cycles. Current per-chat todos are not equivalent. | Feasible; medium integration cost and a new executable dependency. |
| Persistent coordinator | `server/src/coordinators/{records,state,delivery,restore,thread_messages}.rs`; migrations 0041/0042 | `apps/server/src/tools/sub-agent-tool.ts`; `apps/server/src/services/agent-service.ts`; session tools; orchestrator preset | Dedicated goal/instructions/memory/thread records, pending deliveries, worker state, result acknowledgement, scheduling/wake rules and restart reconciliation. Existing sub_agent run/wait/stop and a task file do not constitute the Ghostex coordinator runtime. | Feasible but large; implement as a durable service. Existing five-open-child/no-nesting limits must be designed explicitly, not silently described as unrestricted parity. |
| Chat Resources and question lifecycle | `server/src/session_chat_resources.rs`; `server/src/session_chat_open_questions.rs`; `server/src/visual_pages/`; migration 0048 | `apps/web/src/components/ai-elements/visual-block.tsx`; `apps/web/src/components/chat/chat-message-list.tsx`; artifact panels and questionnaire state | Persist an index of charts/forms/pages across the whole conversation; open old entries independently of loaded message pages. Track unanswered/answered/deferred/canceled states and allow only valid pending forms to submit, with idempotency and read-only shared views. | Feasible; extends current visuals rather than installing another instruction-only skill. |

## Five architecture challenges

| Question | Ghostex answer | MingZhan answer | Risk if ignored |
| --- | --- | --- | --- |
| Who owns durable work? | Server-owned queue/resource/coordinator records. | Chat queue uses React state/ref; live turns use an in-process registry. Chat history and todos do persist. | Lost queued work or false claims that running workers survive restart. |
| Which machine runs the operation? | Native/remote session host owns repository and CLI processes. | Docker paths differ from the desktop host; the desktop app also has its own server/data. | Worktree or CLI-history operations run on the wrong machine. |
| Who can read or control a session? | Native workspace/session routing. | Organization, user, private-profile and Super-profile access checks. | Cross-tenant data leakage or unauthorized tools. |
| What does switching agents mean? | Transcript handoff plus a new target session. | Model selection and sub-agent delegation already exist but are different operations. | Missing context or closing the only usable source session. |
| Is there a real engine behind the UI? | Beads for Kanban, Git for worktrees, real CLI/session hosts and stored coordinator state. | Todo UI, project metadata and instruction presets do not supply these engines. | A visually similar feature cannot perform the original workflow. |

Critical unresolved boundaries: durable execution ownership, host selection and tenant authorization. Qualitative adaptation risk: medium (three critical assumptions under the Xia challenge rubric). This is not a measured implementation estimate.

## Minimum behavior tests before claiming parity

1. Queue: two clients see the same queue; reload/restart preserves messages and attachments; edit/reorder/remove/retry work; a delivery race does not produce duplicate committed messages; uncertain provider delivery is reported rather than guessed. Send-now follows the selected backend's real stop/steer contract.
2. Annotations: Markdown lines, HTML selections and diagram elements each resolve to the correct source/version; edited documents do not silently move a comment to unrelated content; the intended agent receives numbered feedback once.
3. Search: fuzzy matches rank known prompts; filters and favorites persist; Enter opens the exact authorized conversation; importing supported CLI histories is read-only and respects host/user scope.
4. Worktrees: `git worktree list` confirms actual entries; simultaneous tasks have isolated working directories; failed creation preserves the draft; uncommitted work cannot be silently deleted; test host routing on Docker and desktop.
5. Handoff: the target agent can access the transcript and referenced artifacts; an export/start failure leaves the source intact; switching coding backends is tested separately for each supported adapter.
6. Kanban: user and agent use the same Beads data; restart retains tickets; create/update/status/dependency operations work; self-dependencies and cycles are rejected.
7. Coordinator: goal/memory/worker links survive restart; real worker reports update the correct task; waiting/working/done are distinct; pending deliveries are reconciled; stopping/retrying does not invent completion or duplicate external side effects.
8. Resources: old unloaded/compacted transcript entries remain discoverable within the documented retention bound; forms persist their lifecycle; one answer cannot be submitted twice; shared links remain read-only.

All features also require organization/user authorization tests, production frontend integration tests and platform validation for any new native binary. Source inspection does not replace these tests.

## Priority and exclusions

- First: persistent queue, annotations, fuzzy history search.
- Next: Chat Resources, real worktrees, transcript handoff.
- Larger runtime work: Beads Kanban, persistent coordinator.
- Existing visuals, browser/computer MCP bridge, automations, pinning, substring history search and basic sub-agent tools should be extended or reused, not advertised as new equivalent implementations.
- Do not label native Ghostty/GPUI, a full embedded VS Code IDE, Easy Connect/mobile remote control, hidden-screen desktop control, or automatic subscription-account switching as ready-to-port equivalents. They require separate native services, protocols, platform packaging or provider-specific account adapters and end-to-end validation.
- Functional parity concerns observable behavior, persistence, failure handling and supported runtime boundaries. It does not require copying Ghostex's native UI, and it must not remove MingZhan's access controls.

No implementation authority is created by this research. The next implementation request should select the scope and use this report as evidence.
