import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/** Host-only entry point. Never run this inside the Docker container. */
export function startDesktopBridge(options: {
  token: string;
  host?: string;
  port?: number;
  command?: string;
}) {
  if (options.token.length < 32) {
    throw new Error("A bridge token of at least 32 characters is required.");
  }

  const sessions = new Map<
    string,
    {
      transport: StreamableHTTPServerTransport;
      upstream: Client;
      server: Server;
      lastUsed: number;
    }
  >();

  let initializing = false;
  const expected = Buffer.from(`Bearer ${options.token}`);

  const http = createServer(async (req, res) => {
    const supplied = Buffer.from(req.headers.authorization ?? "");

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      res.writeHead(401).end();

      return;
    }

    if (req.url !== "/mcp") {
      res.writeHead(404).end();

      return;
    }

    if (req.headers.origin) {
      res.writeHead(403).end("Browser origins are not accepted.");

      return;
    }

    if (Number(req.headers["content-length"] ?? 0) > 1_000_000) {
      res.writeHead(413).end();

      return;
    }

    const id = req.headers["mcp-session-id"];

    if (Array.isArray(id)) {
      res.writeHead(400).end();

      return;
    }

    if (id) {
      const session = sessions.get(id);

      if (!session) {
        res.writeHead(404).end();

        return;
      }

      session.lastUsed = Date.now();

      try {
        await session.transport.handleRequest(req, res);
      } catch {
        if (!res.headersSent) {
          res.writeHead(500).end("Desktop request failed.");
        }
      }

      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405).end();

      return;
    }

    if (sessions.size || initializing) {
      res.writeHead(409).end("Desktop already has an active controller.");

      return;
    }

    initializing = true;

    const upstream = new Client({
      name: "mingzhan-desktop-bridge",
      version: "1.0.0",
    });

    const server = new Server(
      { name: "mingzhan-desktop-control", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: randomUUID,
    });

    try {
      await upstream.connect(
        new StdioClientTransport({
          args: ["mcp"],
          command: options.command ?? "cua-driver",
          stderr: "inherit",
        })
      );
      server.setRequestHandler(ListToolsRequestSchema, () =>
        upstream.listTools()
      );
      server.setRequestHandler(CallToolRequestSchema, (request) => {
        if (
          request.params.name === "check_permissions" &&
          request.params.arguments?.prompt === true
        ) {
          return {
            content: [
              {
                text: "Permission prompts must be initiated through local CuaDriver setup, not the remote bridge.",
                type: "text",
              },
            ],
            isError: true,
          };
        }

        return upstream.callTool(request.params, undefined, {
          timeout: 120_000,
        });
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
        }

        void upstream.close();
      };

      await server.connect(transport);
      await transport.handleRequest(req, res);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, {
          lastUsed: Date.now(),
          server,
          transport,
          upstream,
        });
      } else {
        await server.close();
        await upstream.close();
      }
    } catch {
      await upstream.close().catch(() => {});
      await server.close().catch(() => {});

      if (!res.headersSent) {
        res
          .writeHead(502)
          .end(
            "Desktop driver connection failed. Check the host driver and OS permissions."
          );
      }
    } finally {
      initializing = false;
    }
  });

  const timer = setInterval(() => {
    for (const [id, session] of sessions) {
      if (Date.now() - session.lastUsed > 15 * 60_000) {
        sessions.delete(id);
        void session.server.close();
        void session.upstream.close();
      }
    }
  }, 30_000);

  timer.unref();
  http.on("close", () => {
    clearInterval(timer);

    for (const session of sessions.values()) {
      void session.server.close();
      void session.upstream.close();
    }

    sessions.clear();
  });
  http.listen(options.port ?? 4312, options.host ?? "127.0.0.1");

  return http;
}

if (import.meta.main) {
  const token = process.env.MINGZHAN_DESKTOP_BRIDGE_TOKEN ?? "";

  const server = startDesktopBridge({
    command: process.env.MINGZHAN_CUA_DRIVER_PATH,
    host: process.env.MINGZHAN_DESKTOP_BRIDGE_HOST,
    port: Number(process.env.MINGZHAN_DESKTOP_BRIDGE_PORT ?? 4312),
    token,
  });

  server.on("listening", () =>
    console.log(
      "MingZhan desktop MCP bridge ready. Authorization is required for every request."
    )
  );

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.closeAllConnections();
      server.close();
    });
  }
}
