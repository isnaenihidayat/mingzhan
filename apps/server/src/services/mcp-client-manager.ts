import type {
  CachedMcpToolSummary,
  McpHttpConfig,
  McpServerConfig,
  McpStdioConfig,
  McpTransport,
} from "@mingzhan/core";
import { getProfileSoulDir } from "@mingzhan/core";
import type { CachedMcpTool, StoredMcpServerRecord } from "@mingzhan/db";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { fetchMcpRemote } from "./mcp-fetch";
import {
  formatToolContent,
  formatToolContentResult,
  isJsonValue,
  parseJsonValue,
} from "./mcp-tool-result";

/** A server that does not answer `initialize` must not hold a connect open. */
const CONNECT_TIMEOUT_MS = 30_000;

/**
 * Long tools stay alive while they report progress. The SDK sends a progress
 * token only when `onprogress` is set.
 */
const CALL_TOOL_OPTIONS: RequestOptions = {
  // Progress resets the per-request timeout, so without a ceiling a server
  // that keeps reporting progress holds the turn forever.
  maxTotalTimeout: 30 * 60_000,
  onprogress: () => {},
  resetTimeoutOnProgress: true,
};

/** Past this, a tool result is replaced by a note instead of reaching the model. */
const MAX_TOOL_RESULT_CHARS = 1_000_000;

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type McpToolArguments = { [key: string]: JsonValue };

/** Thrown before a request is sent, so the caller can reconnect and retry. */
class McpNotConnectedError extends Error {}

/**
 * True when the server did not run the request: no client was connected, or
 * the server no longer knows the session (restart, deploy). A retry on a new
 * connection is safe. A tool call that failed any other way may have run.
 */
export function isMcpReconnectableError(cause: unknown): boolean {
  return (
    cause instanceof McpNotConnectedError ||
    (cause instanceof StreamableHTTPError && cause.code === 404)
  );
}

interface ConnectedMcpClient {
  client: Client;
  transport: Transport;
}

interface ConnectOptions {
  /** OAuth client for HTTP servers behind the MCP authorization spec. */
  authProvider?: OAuthClientProvider;
  orgId?: string;
  profileId?: string;
}

export class McpClientManager {
  private readonly connections = new Map<string, ConnectedMcpClient>();
  private readonly inflight = new Map<string, Promise<CachedMcpTool[]>>();

  isConnected(
    serverId: string,
    transport: McpTransport,
    profileId?: string,
    orgId?: string
  ): boolean {
    return this.connections.has(
      connectionKey(serverId, transport, profileId, orgId)
    );
  }

  getConnectedCount(): number {
    return this.connections.size;
  }

  async ensureConnected(
    server: StoredMcpServerRecord,
    orgId: string,
    profileId: string
  ): Promise<void> {
    const key = connectionKey(server.id, server.transport, profileId, orgId);

    if (this.connections.has(key)) {
      return;
    }

    const pending = this.inflight.get(key);

    if (pending) {
      await pending;

      // Disconnect may have run after the shared connect settled.
      if (this.connections.has(key)) {
        return;
      }
    }

    await this.connect(server, { orgId, profileId });
  }

  async connect(
    server: StoredMcpServerRecord,
    options?: ConnectOptions
  ): Promise<CachedMcpTool[]> {
    const key = connectionKey(
      server.id,
      server.transport,
      options?.profileId,
      options?.orgId
    );

    const pending = this.inflight.get(key);

    if (pending) {
      return pending;
    }

    const run = this.establishConnection(server, options, key);

    const tracked = run.finally(() => {
      if (this.inflight.get(key) === tracked) {
        this.inflight.delete(key);
      }
    });

    this.inflight.set(key, tracked);

    return tracked;
  }

  private async establishConnection(
    server: StoredMcpServerRecord,
    options: ConnectOptions | undefined,
    key: string
  ): Promise<CachedMcpTool[]> {
    await this.disconnectKey(key);

    const transport = createTransport(server.transport, server.config, options);

    const client = new Client({
      name: "mingzhan",
      version: "1.0.0",
    });

    let connectionStored = false;

    try {
      await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });

      const result = await client.listTools(undefined, {
        timeout: CONNECT_TIMEOUT_MS,
      });

      const tools = normalizeListedTools(result.tools);

      this.store(key, client, transport);
      connectionStored = true;

      return tools;
    } finally {
      if (!connectionStored) {
        try {
          await transport.close();
        } catch {
          // Ignore transport shutdown errors.
        }
      }
    }
  }

  /**
   * Keeps a connection and forgets it when its transport closes (stdio process
   * exit, dropped stream), so the next call reconnects instead of failing on a
   * dead client.
   */
  private store(key: string, client: Client, transport: Transport): void {
    this.connections.set(key, { client, transport });
    client.onclose = () => {
      if (this.connections.get(key)?.client === client) {
        this.connections.delete(key);
      }
    };
  }

  /** Forgets a connection the server no longer accepts, so it reconnects. */
  async dropConnection(
    serverId: string,
    transport: McpTransport,
    profileId?: string,
    orgId?: string
  ): Promise<void> {
    await this.disconnectKey(
      connectionKey(serverId, transport, profileId, orgId)
    );
  }

  async disconnect(serverId: string): Promise<void> {
    const keys = [...this.connections.keys()].filter(
      (key) => key === serverId || key.startsWith(`${serverId}:`)
    );

    for (const key of keys) {
      await this.disconnectKey(key);
    }
  }

  async disconnectAll(): Promise<void> {
    const keys = [...this.connections.keys()];

    for (const key of keys) {
      await this.disconnectKey(key);
    }
  }

  async listTools(
    serverId: string,
    transport: McpTransport,
    profileId?: string
  ): Promise<CachedMcpTool[]> {
    const client = this.requireClient(serverId, transport, profileId);
    const result = await client.listTools();

    return normalizeListedTools(result.tools);
  }

  async callTool(
    serverId: string,
    transport: McpTransport,
    toolName: string,
    input: McpToolArguments,
    profileId?: string,
    orgId?: string
  ): Promise<JsonValue> {
    const client = this.requireClient(serverId, transport, profileId, orgId);

    const result = await client.callTool(
      {
        arguments: input,
        name: toolName,
      },
      undefined,
      CALL_TOOL_OPTIONS
    );

    if ("toolResult" in result) {
      return boundToolResult(parseJsonValue(result.toolResult));
    }

    if (result.isError) {
      return boundToolResult({
        error: formatToolContent(result.content),
      });
    }

    if (result.structuredContent !== undefined) {
      return boundToolResult(parseJsonValue(result.structuredContent));
    }

    return boundToolResult(await formatToolContentResult(result.content));
  }

  async testConnection(
    transport: McpTransport,
    config: McpServerConfig
  ): Promise<CachedMcpTool[]> {
    const mcpTransport = createTransport(transport, config);

    const client = new Client({
      name: "mingzhan",
      version: "1.0.0",
    });

    try {
      await client.connect(mcpTransport, { timeout: CONNECT_TIMEOUT_MS });

      const result = await client.listTools(undefined, {
        timeout: CONNECT_TIMEOUT_MS,
      });

      return normalizeListedTools(result.tools);
    } finally {
      try {
        await mcpTransport.close();
      } catch {
        // Ignore transport shutdown errors.
      }
    }
  }

  async connectHttpEndpoint(
    connectionKey: string,
    url: string,
    headers?: Record<string, string>
  ): Promise<CachedMcpTool[]> {
    await this.disconnectKey(connectionKey);

    const transport = new StreamableHTTPClientTransport(new URL(url), {
      fetch: fetchMcpRemote,
      requestInit: {
        headers,
      },
    });

    const client = new Client({
      name: "mingzhan",
      version: "1.0.0",
    });

    let connectionStored = false;

    try {
      await client.connect(transport, { timeout: CONNECT_TIMEOUT_MS });

      const result = await client.listTools(undefined, {
        timeout: CONNECT_TIMEOUT_MS,
      });

      const tools = normalizeListedTools(result.tools);
      this.store(connectionKey, client, transport);
      connectionStored = true;

      return tools;
    } finally {
      if (!connectionStored) {
        try {
          await transport.close();
        } catch {
          // Ignore transport shutdown errors.
        }
      }
    }
  }

  isHttpEndpointConnected(connectionKey: string): boolean {
    return this.connections.has(connectionKey);
  }

  async callHttpEndpointTool(
    connectionKey: string,
    toolName: string,
    input: McpToolArguments
  ): Promise<JsonValue> {
    const client = this.requireClientByKey(connectionKey);

    const result = await client.callTool(
      {
        arguments: input,
        name: toolName,
      },
      undefined,
      CALL_TOOL_OPTIONS
    );

    if ("toolResult" in result) {
      return boundToolResult(parseJsonValue(result.toolResult));
    }

    if (result.isError) {
      return boundToolResult({
        error: formatToolContent(result.content),
      });
    }

    if (result.structuredContent !== undefined) {
      return boundToolResult(parseJsonValue(result.structuredContent));
    }

    return boundToolResult(await formatToolContentResult(result.content));
  }

  async disconnectHttpEndpoint(connectionKey: string): Promise<void> {
    await this.disconnectKey(connectionKey);
  }

  private requireClientByKey(connectionKey: string): Client {
    const connection = this.connections.get(connectionKey);

    if (!connection) {
      throw new McpNotConnectedError(
        `HTTP MCP endpoint "${connectionKey}" is not connected.`
      );
    }

    return connection.client;
  }

  private requireClient(
    serverId: string,
    transport: McpTransport,
    profileId?: string,
    orgId?: string
  ): Client {
    const connection = this.connections.get(
      connectionKey(serverId, transport, profileId, orgId)
    );

    if (!connection) {
      throw new McpNotConnectedError(
        `MCP server "${serverId}" is not connected.`
      );
    }

    return connection.client;
  }

  private async disconnectKey(key: string): Promise<void> {
    const connection = this.connections.get(key);

    if (!connection) {
      return;
    }

    this.connections.delete(key);

    try {
      if (connection.transport instanceof StreamableHTTPClientTransport) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          connection.transport.terminateSession().catch(() => {}),
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 2000);
          }),
        ]).finally(() => clearTimeout(timer));
      }

      await connection.transport.close();
    } catch {
      // Ignore transport shutdown errors.
    }
  }
}

function connectionKey(
  serverId: string,
  transport: McpTransport,
  profileId?: string,
  orgId?: string
): string {
  if (transport === "stdio" && profileId && orgId) {
    return `${serverId}:${orgId}:${profileId}`;
  }

  return serverId;
}

function createTransport(
  transport: McpTransport,
  config: StoredMcpServerRecord["config"],
  options?: ConnectOptions
): Transport {
  if (transport === "http") {
    const http = readHttpConfig(config);

    const requestInit = { headers: http.headers };

    return new StreamableHTTPClientTransport(
      new URL(http.url),
      options?.authProvider
        ? {
            authProvider: options.authProvider,
            fetch: fetchMcpRemote,
            requestInit,
          }
        : { fetch: fetchMcpRemote, requestInit }
    );
  }

  if (transport === "stdio") {
    const stdio = readStdioConfig(config);

    const cwd =
      options?.orgId && options?.profileId
        ? getProfileSoulDir(options.orgId, options.profileId)
        : undefined;

    return new StdioClientTransport({ ...stdio, cwd });
  }

  throw new Error(`Unsupported MCP transport: ${transport}`);
}

function readStdioConfig(
  value: StoredMcpServerRecord["config"]
): McpStdioConfig {
  const config = z
    .object({
      args: z.array(z.string()).optional(),
      command: z.string(),
      env: z.record(z.string(), z.string()).optional(),
    })
    .parse(value);

  const command = config.command.trim();

  if (!command) {
    throw new Error("stdio MCP servers require config.command.");
  }

  const result: McpStdioConfig = { command };

  if (config.args) {
    result.args = config.args;
  }

  if (config.env) {
    result.env = config.env;
  }

  return result;
}

function readHttpConfig(value: StoredMcpServerRecord["config"]): McpHttpConfig {
  const config = z
    .object({
      headers: z.record(z.string(), z.string()).optional(),
      url: z.string(),
    })
    .parse(value);

  const url = config.url.trim();

  if (!url) {
    throw new Error("HTTP MCP servers require config.url.");
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid MCP server URL: ${url}`);
  }

  return {
    headers: config.headers,
    url,
  };
}

function normalizeListedTools(
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: unknown;
  }>
): CachedMcpTool[] {
  return tools.map((tool) => ({
    description: tool.description?.trim() || tool.name,
    inputSchema: tool.inputSchema,
    name: tool.name,
  }));
}

export function parseMcpToolArguments<T>(input: T) {
  if (!(input instanceof Object) || Array.isArray(input)) {
    return {};
  }

  const entries: Array<[string, JsonValue]> = [];

  for (const [key, value] of Object.entries(input)) {
    if (!isJsonValue(value)) {
      throw new Error("MCP tool arguments must contain JSON values.");
    }

    entries.push([key, value]);
  }

  return Object.fromEntries(entries);
}

function boundToolResult(value: JsonValue): JsonValue {
  // Fitted images are already capped by MODEL_IMAGE_MAX_BASE64 each.
  const { images: _images, ...rest } =
    value instanceof Object && !Array.isArray(value) ? value : { value };

  const size = JSON.stringify(rest).length;

  return size > MAX_TOOL_RESULT_CHARS
    ? {
        error: `MCP tool result was ${size} characters, over the ${MAX_TOOL_RESULT_CHARS} limit, and was dropped.`,
      }
    : value;
}

export function toCachedMcpToolSummaries(
  tools: CachedMcpTool[]
): CachedMcpToolSummary[] {
  return tools.map((tool) => ({
    description: tool.description,
    inputSchema: tool.inputSchema,
    name: tool.name,
  }));
}
