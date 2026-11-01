export const DEFAULT_BUNDLED_SKILL_NAMES = [
  "create-automation",
  "manage-skills",
  "skill-installer",
  "update-profile-memory",
  "archive-profile-memory",
  "artifact-design",
  "composio-integrations",
  "mingzhan-guide",
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "doc-coauthoring",
  "internal-comms",
  "brand-guidelines",
  "theme-factory",
  "web-artifacts-builder",
  "canvas-design",
  "algorithmic-art",
  "slack-gif-creator",
] as const;

export const SUPER_MINGZHAN_BUNDLED_SKILL_NAMES = [
  "create-plugin",
  "create-profile",
  "create-skill",
  "coding-agent",
  "frontend-design",
  "mcp-builder",
  "webapp-testing",
  "skill-creator",
  "claude-api",
] as const;

export const RUNTIME_ONLY_BUNDLED_SKILL_NAMES = [
  "coding-backend-codex",
  "coding-backend-claude-code",
  "coding-backend-opencode",
  "coding-backend-pi",
  "coding-backend-cursor",
] as const;

/** Bundled skills that install/sync but are never auto-assigned (manual opt-in). */
export const OPT_IN_BUNDLED_SKILL_NAMES = [
  "agent-browser",
  "google-meet",
  "knowledge-base-wiki",
] as const;

export const BUNDLED_SKILL_NAMES = [
  ...DEFAULT_BUNDLED_SKILL_NAMES,
  ...SUPER_MINGZHAN_BUNDLED_SKILL_NAMES,
  ...RUNTIME_ONLY_BUNDLED_SKILL_NAMES,
  ...OPT_IN_BUNDLED_SKILL_NAMES,
] as const;

export type BundledSkillName = (typeof BUNDLED_SKILL_NAMES)[number];

/** Built-in catalog entries only: never seeded, discovered, or assigned automatically. */
export const AVAILABLE_SKILL_PRESETS = [
  {
    body: '# MingZhan native visuals\nRender charts, statistics, tables, text and page cards directly in chat using a fenced visual JSON block. This is a native renderer, not an HTML-code workaround. Do not restate the entire visual in prose; add the useful finding or limitation.\n\nA chart is a Vega-Lite object with mark, data.values and encoding. Supported marks: bar, line, area, point, circle, square, arc. Mark objects may use type, point (boolean), innerRadius, opacity and strokeWidth. Use inline rows only (at most 5000); no data.url, executable expressions, transform, layer, facet, repeat or params. Encoding supports x, y, color, theta, tooltip and xOffset with field, type, aggregate, title, sort, axis, scale and stack. Height is 100–600 and width fits the chat. Example:\n```visual\n{"title":"Revenue","mark":"bar","data":{"values":[{"month":"Jan","amount":120}]},"encoding":{"x":{"field":"month","type":"nominal"},"y":{"field":"amount","type":"quantitative"},"tooltip":[{"field":"month"},{"field":"amount"}]}}\n```\nUse only actual supplied/retrieved data; identify illustrative examples. Check totals with a computation tool. Aggregate large inputs before rendering. Invalid JSON or unsupported structures display an error; streamed partial blocks wait for completion.\n\nCompositions use {title?, rows:[part,...]}. A part may be {chart:<chart spec>}, {stats:[{label,value,note?,tone?:"good"|"bad"|"neutral"}]}, {table:{columns:[names],rows:[[cells]]}}, {text:string}, or {columns:[part,...]}. Table rows may be objects; columns can then be inferred. Up to eight nested levels and 40 children per container are supported. Keep text, units and labels readable on small screens.\n\nAsk the user questions using a fenced questions block:\n```questions\n{"title":"Choose a platform","questions":[{"title":"Which platform?","multiple":false,"choices":["macOS","Windows","Linux"]}]}\n```\nThe native form supports up to 10 questions, 20 choices each, multiple selection and free-text notes. Submitting sends actual answers into the current chat as the next user message. Unanswered questions are marked Skipped. Historical/shared forms are read-only. Wait for real answers; do not infer approval from elapsed time. The assigned ask_user_question tool is also supported.\n\nFor richer pages, save a self-contained HTML artifact through an assigned artifact/file tool; follow artifact-design when assigned. Use only its actual returned link. A visual page card is {page:{title:string,url:string}}; never invent a URL or substitute a filesystem path. Artifact cards can also appear through the existing chat artifact panel. Escape text, avoid external transmission of private data, and never claim an artifact was saved when the tool failed.',
    description:
      "Create tables, diagrams, charts, and visual reports using formats supported by MingZhan.",
    disableModelInvocation: true,
    name: "mingzhan-visuals",
    requirements:
      "Native visual/questions renderer; artifact tool for HTML pages",
  },
  {
    body: "# MingZhan conversation titles\nRead the current conversation and propose one short, specific title in the user's language, usually three to seven words. Describe the work or result rather than generic words such as Chat or Help. Avoid secrets, personal identifiers, and account tokens in titles.\n\nIf an explicitly exposed rename capability is available, inspect its schema, identify the exact current conversation, and use it only for the requested conversation. Verify the returned title before reporting success.\n\nThe ordinary MingZhan agent toolset may not expose a rename action. In that case return the proposed title and state that it has not been applied. Do not invent a CLI, session selector, endpoint, or environment variable, and do not search local credential files to obtain access. Do not rename unrelated conversations or create a new session to simulate renaming.",
    description:
      "Suggest a concise title for the current MingZhan conversation and rename it only when a supported capability is available.",
    disableModelInvocation: true,
    name: "mingzhan-chat-title",
    requirements:
      "Conversation context; rename capability for automatic application",
  },
  {
    body: "# MingZhan browser use\nUse a real browser for authenticated pages, forms, and interactive workflows. For public text pages, prefer exposed web_fetch or web_search tools. Check the profile's actual tools before choosing a runtime.\n\nFor a local desktop browser use the assigned MingZhan Desktop Control MCP tools backed by cua-driver. Discover their schemas, list exact windows, bind the browser to its window identity, obtain semantic state, and use the observed element tokens. This MCP runs locally in the desktop installation, or through the authenticated host bridge when MingZhan runs in Docker. The Docker container itself is not the desktop. For an isolated cloud browser, use browser_navigate, browser_read, browser_playwright, browser_screenshot, browser_scroll and browser_computer when assigned and the Browser runtime is configured. Prefer semantic Playwright operations over coordinates. Do not substitute the cloud browser for the host's signed-in browser. If bash and agent-browser are the configured alternative, inspect agent-browser --help first. Do not mix identifiers across runtimes.\n\nBefore changing a page, obtain a fresh semantic snapshot. Locate targets by role, label, and observed identifiers. After acting, refresh state and verify the requested result. Ask the user to complete login, MFA, or CAPTCHA when needed. Do not invent a successful action when a page fails to load.\n\nDesktop browser runtimes must be reachable from the environment that runs the agent. A Docker process does not automatically control a browser on its host. If the runtime or connection is missing, explain the missing prerequisite; installing this skill does not install a browser, bridge, driver, or credentials. Do not install those or change security settings without the user's authorization.",
    description:
      "Inspect and operate web pages through an available browser runtime, with fresh snapshots and verified results.",
    disableModelInvocation: true,
    name: "mingzhan-browser-use",
    requirements:
      "Assigned Desktop Control MCP for local browsers, or assigned browser tools and configured Browser runtime",
  },
  {
    body: "# MingZhan computer use\nUse the assigned MingZhan Desktop Control MCP tools for native computer actions. On a desktop installation configure a stdio MCP server with command cua-driver and args [mcp]. For Docker, run apps/server/scripts/desktop-mcp-bridge.ts on the host and configure an HTTP MCP server pointing to the host bridge with its Bearer token. Never point the driver at the container desktop or expose the bridge without authentication. Use only a desktop-control tool actually exposed to this profile, or bash with an installed cua-driver. Read that driver's installed skill and current command documentation before issuing native actions. Inspect its availability and permission state without triggering permission changes.\n\nBind to the exact application window and inspect a fresh screenshot/accessibility snapshot. Prefer semantic targets when supported. Use coordinates only when grounded in the current screenshot. After each meaningful action, inspect fresh state and verify the intended change. Treat actions that submit, delete, publish, or change accounts according to the user's authorization.\n\nIf access to the desktop, screen capture, accessibility APIs, or the driver is missing, report the precise requirement and stop dependent actions. Docker and remote workers cannot implicitly access the user's host desktop. This skill does not install drivers or grant OS permissions. Do not disable platform protections or substitute an unrelated window. Never claim a desktop action completed without evidence.",
    description:
      "Operate native desktop apps through an available computer-control driver and verify changes from fresh state.",
    disableModelInvocation: true,
    name: "mingzhan-computer-use",
    requirements:
      "Desktop Control MCP: local cua-driver or authenticated host bridge; OS screen/accessibility permissions",
  },
  {
    body: "# MingZhan agent delegation\nUse list_agent_profiles to discover only the agents this user can access, then use the actual sub_agent tool when assigned. Supported input is task, context, background, sessionId, timeoutMs, profileId, model, thinkingEffort and action. Use an accessible profileId to select another configured agent in the same organization; its private/super-profile access checks still apply. New child chats can override model and thinkingEffort (low/medium/high) without changing profile defaults. Use action=wait with the returned sessionId to await a background result without sending it another task. Use action=stop with that child id to request cooperative cancellation and preserve its transcript. Include a short task label with wait/stop for the tool schema. A background call returns a child chat sessionId immediately; a foreground call waits and returns status, summary and output. These are actual agent chats, not terminal text. Inspect the exposed schema before calling. Delegate a clear task with the relevant context, expected output, scope boundaries, and completion condition. Do not send unrelated secrets or the entire workspace as context.\n\nA normal call waits for the result. Use background=true when the user wants a separate chat to open or continue, and retain the returned sessionId. To follow up on a child started by this chat, use the supported sessionId parameter. Read background output with read_profile_session using its exposed sessionId, limit and offset schema. Discover other profile chats with list_profile_sessions before reading them. Keep same-chat follow-ups on the returned sessionId. When the user asks to close a finished child, close_session stops it and removes it from Recents without deleting its history; sending a new message reopens it. Closed chats no longer consume the five-open-child limit. Do not close the current chat from a tool. Report pending work as pending.\n\nBy default sub-agents use the same profile. An explicit accessible profileId selects that profile and its configured backend/tools; the child keeps the parent user and organization. Private profiles and Super MingZhan require the existing user/admin permissions. Children cannot nest sub-agents. Use coding-agent with bash for repository coding when available, rather than treating sub_agent as a coding backend. Use profileId/model/effort only when starting a saved child chat. Do not change them during a follow-up; create a separate child when the user wants a different agent.\n\nReview each result, resolve conflicts against evidence, and give the user a coherent answer. If delegation tools are missing, complete the bounded task directly where possible and explain the missing capability instead of inventing agent commands.",
    description:
      "Delegate bounded research, review, or analysis to MingZhan sub-agents and synthesize their results.",
    disableModelInvocation: true,
    name: "mingzhan-agents",
    requirements:
      "Assigned sub_agent, list_agent_profiles, session reading and close_session tools",
  },
  {
    body: "# MingZhan task orchestration\nStart from the user's concrete outcome and constraints. Divide the work only where tasks can be scoped independently. Track each task's owner, dependencies, expected evidence, status, and any returned sessionId in your working notes or an available todo tool. Do not invent persistent task storage when none is exposed.\n\nUse sub_agent only if assigned, following its schema and limits. Supply bounded context and a clear deliverable. Start independent tasks in parallel only when the user's request permits it and the tool supports it. For background work, action=wait on sub_agent returns its terminal result when it finishes; a wait timeout leaves it running. Use action=stop to request cancellation when the user asks, then read its final state rather than claiming an immediate stop. For dependent work, wait for the prerequisite result. Background child chats are inspected through an available read_profile_session tool; do not report queued work as finished. A child cannot spawn another sub-agent.\n\nKeep one owner for each file or responsibility when tools can modify shared state. Avoid conflicting edits. Verify important claims and changes against the tools/data actually available, merge the results, and report remaining blockers explicitly. Use coding-agent with bash for repository coding where assigned. Persist the task ledger to an available workspace file using write_file/read_file: outcome, constraints, child sessionIds, owners, status, evidence and remaining work. Update it after each completed task and restore it on continuation. Use exposed todo tools for live progress. Use assigned memory tools only for durable knowledge, not unverified task results.\n\nStay within the requested task. Do not create schedules, persistent coordinators, unrelated chats, or external messages merely because the workflow has multiple steps. If delegation is unavailable, carry out the plan sequentially and disclose that execution mode.",
    description:
      "Coordinate a multi-step task across MingZhan sub-agents, track dependencies, and reconcile verified results.",
    disableModelInvocation: true,
    name: "mingzhan-orchestrator",
    requirements:
      "Assigned sub_agent, session tools, todo_write and workspace file tools",
  },
] as const;
