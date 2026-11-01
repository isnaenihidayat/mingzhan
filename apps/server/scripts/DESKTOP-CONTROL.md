# MingZhan desktop and browser control

Install the available `mingzhan-browser-use` or `mingzhan-computer-use` skill, then assign it and the corresponding MCP server to the intended profile. Installing a skill does not grant access to a computer or assign tools automatically.

## Desktop application: local control

Install CuaDriver on the same computer as the desktop app. In MCP → Add custom server, import:

```json
{"mcpServers":{"mingzhan-desktop":{"command":"cua-driver","args":["mcp"]}}}
```

If the GUI app does not inherit your shell PATH, use the driver's absolute executable path. Assign the registered server to the profile. Follow CuaDriver's setup for OS permissions; the bridge never grants them or disables driver approval checks. Windows and Linux use their platform's installed driver.

## Docker: control the host

Run the bridge on the host, never inside the container. It requires Bun and the installed CuaDriver executable. Use a private environment file outside the repository, readable only by the operator:

```text
MINGZHAN_DESKTOP_BRIDGE_TOKEN=<random token of at least 32 characters>
MINGZHAN_DESKTOP_BRIDGE_HOST=0.0.0.0
MINGZHAN_DESKTOP_BRIDGE_PORT=4312
```

Use your platform's secure random generator; do not use the placeholder token. On Unix give the file mode 600. The default bind address is 127.0.0.1; use a host interface reachable by Docker when using the bridge from a container. Keep this service on a private host/container network. For remote network access put it behind authenticated HTTPS.

```sh
bun --env-file=/absolute/path/desktop-control.env run desktop:bridge
```

In MCP Library select **MingZhan Desktop Control**, then set:

- URL: `http://host.docker.internal:4312/mcp`
- Header: `Authorization: Bearer <the bridge token>`

On Linux Docker, map `host.docker.internal` to `host-gateway` using the container's `extra_hosts` setting, or use the private host gateway address. With the desktop app use `http://127.0.0.1:4312/mcp` instead. The bridge returns the driver's real tool schemas; refresh/sync MCP tools after an update. Assign only the needed tools to the profile.

The bridge permits one active controller. Disconnect the MCP server before switching controllers. Sessions expire after 15 minutes without requests. MingZhan terminates HTTP MCP sessions when disconnecting. The process exits when its terminal/service stops; run it under your platform's service manager if you need it after reboot.

Check the local connection without showing the token:

```sh
bun --env-file=/absolute/path/desktop-control.env run desktop:bridge:check
```

The check reports tool counts, window discovery status and read-only permission state. It does not move the mouse, type, or submit anything. `MINGZHAN_DESKTOP_BRIDGE_CHECK_URL` selects a different private bridge URL.

## Visuals and agents

`mingzhan-visuals` uses the chat's native `visual` and `questions` renderers. Charts use inline Vega-Lite data and a CSP-compatible interpreter, with no eval or remote chart data. HTML pages use the existing artifact tools. Questions send actual answers only on the latest editable chat turn; shared/historical forms are read-only.

`mingzhan-agents` and `mingzhan-orchestrator` use the assigned `sub_agent`, `read_profile_session`, `list_profile_sessions`, todo and workspace-file tools. They keep MingZhan's organization boundaries, profile access checks and no-nesting limits. Delegation defaults to the same profile; an explicit accessible profileId selects another configured agent in the same organization. Child model/effort overrides do not change profile defaults. The sub_agent action=wait and action=stop operations wait for or cooperatively stop an owned child without deleting its transcript. Different coding CLIs use the existing coding-agent harness, not a fabricated coordinator CLI. Select and authenticate those backends separately.
