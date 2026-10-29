---
name: mcp-builder
description: MCP server development, MCP tool schemas and external API adapters. Membuat server MCP, integrasi protokol MCP.
include-body-on-match: false
---

Build an MCP server for the user's chosen service and transport.

1. Read the current official MCP specification and SDK documentation using an available web tool. If network access is unavailable, use installed SDK types and state the version limitation. Do not hardcode a remembered protocol revision as current.
2. Identify authentication, authorization scope, pagination, rate limits and data ownership. Keep credentials in environment/managed secrets and return concise errors without secrets.
3. Design tools around useful operations with explicit schemas, bounded results and clear mutating behavior. Keep unrelated service operations out of the server. Respect cancellation and timeouts.
4. Implement in the user's target project with its installed TypeScript or Python SDK. Use coding-agent for repository work when assigned. Test the real protocol handshake, tool listing, schema validation, success, access denial, paging and error behavior.
5. Deliver source, dependency instructions and the client configuration needed to connect. Starting a local test does not authorize deployment or connecting another user's private account.
