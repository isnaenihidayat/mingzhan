---
name: claude-api
description: Anthropic SDK development, Claude API integration, Claude streaming and Anthropic tool calling. Integrasi API Claude, SDK Anthropic.
include-body-on-match: false
---

Implement or troubleshoot Claude API integrations using current official references.

1. Use an available web tool to read official Anthropic API/SDK documentation for the requested surface. If unavailable, inspect the installed SDK/types and state the version used. Never embed static price/model-limit claims in this skill.
2. Confirm the user's provider, API surface, model and installed SDK. Keep changes localized to that integration; this skill does not switch MíngZhàn's active provider or rewrite another provider's code.
3. Use managed/environment credentials, bounded requests, cancellation and appropriate timeouts. Preserve streaming events and tool-call identifiers; execute tool calls only through the application's existing authorization layer.
4. Validate request/response shape and handle authentication, rate limits, retries and partial streams. Test replayed or mocked transport first. Real API calls consume credits and should stay within the user's authorized task.
5. Deliver code/configuration and verified behavior. Reference official documentation for current model/pricing choices and distinguish an SDK example from a deployed integration.
