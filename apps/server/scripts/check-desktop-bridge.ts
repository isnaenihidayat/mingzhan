import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL(
    process.env.MINGZHAN_DESKTOP_BRIDGE_CHECK_URL ?? "http://127.0.0.1:4312/mcp"
  ),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.MINGZHAN_DESKTOP_BRIDGE_TOKEN ?? ""}`,
      },
    },
  }
);

const client = new Client({ name: "mingzhan-bridge-check", version: "1.0.0" });

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  console.log(
    "Desktop MCP tools:",
    tools.length,
    "Browser tools:",
    tools.filter((tool) => tool.name.startsWith("browser_")).length
  );

  if (tools.some((tool) => tool.name === "list_windows")) {
    const result = await client.callTool({
      arguments: {},
      name: "list_windows",
    });

    console.log(
      "Window discovery returned tool error:",
      Boolean(result.isError)
    );
  }

  if (tools.some((tool) => tool.name === "check_permissions")) {
    console.log(
      JSON.stringify(
        await client.callTool({
          arguments: { prompt: false },
          name: "check_permissions",
        })
      )
    );
  }
} finally {
  await transport.terminateSession().catch(() => {});
  await client.close();
}
