import { expect, test } from "bun:test";
import type {
  CreateMcpServerRequest,
  McpServerDetail,
} from "@mingzhan/core/contract";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { mcpServerDetailQueryOptions } from "@/hooks/use-app-queries";
import { useMcpServerDialogState } from "./use-mcp-server-dialog-state";

test.each(["http", "stdio"] as const)(
  "editing %s sends explicit clears without dropping retained secret keys",
  async (transport) => {
    const server: McpServerDetail = {
      cachedTools: [],
      config:
        transport === "stdio"
          ? { args: ["--verbose"], command: "demo", env: { TOKEN: "••••••••" } }
          : {
              headers: { Authorization: "••••••••" },
              url: "https://example.com/mcp",
            },
      createdAt: "2026-01-01",
      enabled: true,
      id: "server",
      lastError: null,
      name: "Demo",
      status: "disconnected",
      toolCount: 0,
      transport,
      updatedAt: "2026-01-01",
      usesOAuth: false,
    };

    const queryClient = new QueryClient();
    queryClient.setQueryData(
      mcpServerDetailQueryOptions(server.id).queryKey,
      server
    );
    const requests: CreateMcpServerRequest[] = [];
    let state: ReturnType<typeof useMcpServerDialogState>;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    function Probe({ open, editing }: { open: boolean; editing: boolean }) {
      state = useMcpServerDialogState({
        busy: false,
        onSubmit: async (request) => {
          requests.push(structuredClone(request));
        },
        open,
        server: editing ? server : null,
      });

      return <form onSubmit={state.handleSubmit} />;
    }

    const render = (open: boolean, editing = true) =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe editing={editing} open={open} />
        </QueryClientProvider>
      );

    const submit = () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true })
        );

    try {
      await act(async () => render(false));
      await act(async () => render(true));
      await act(async () => {
        submit();
      });
      expect(requests[0]?.config).toEqual(
        transport === "stdio"
          ? { args: ["--verbose"], command: "demo", env: { TOKEN: "" } }
          : { headers: { Authorization: "" }, url: "https://example.com/mcp" }
      );
      await act(async () => {
        state.setArgs([]);
        state.setEnv([{ key: " ", value: "" }]);
        state.setHeaders([{ key: " ", value: "" }]);
      });
      await act(async () => {
        submit();
      });
      expect(requests[1]?.config).toEqual(
        transport === "stdio"
          ? { args: [], command: "demo", env: {} }
          : { headers: {}, url: "https://example.com/mcp" }
      );

      if (transport === "http") {
        await act(async () => state.selectKind("signin"));
        await act(async () => {
          submit();
        });
        expect(requests.at(-1)?.config).toEqual({
          url: "https://example.com/mcp",
        });
      }

      // Creation still omits optional empty fields.
      await act(async () => render(false, false));
      await act(async () => render(true, false));
      await act(async () => {
        state.setName("New");
        state.selectKind(transport);

        if (transport === "stdio") {
          state.setCommand("new-command");
        } else {
          state.setUrl("https://example.com/new");
        }
      });
      await act(async () => {
        submit();
      });
      expect(requests.at(-1)?.config).toEqual(
        transport === "stdio"
          ? { command: "new-command" }
          : { url: "https://example.com/new" }
      );

      if (transport === "http") {
        await act(async () => {
          state.setHeaders([{ key: "Authorization", value: "unused" }]);
          state.selectKind("signin");
        });
        await act(async () => {
          submit();
        });
        expect(requests.at(-1)?.config).toEqual({
          url: "https://example.com/new",
        });
      }

      expect(requests).toHaveLength(transport === "http" ? 5 : 3);
    } finally {
      await act(async () => root.unmount());
      queryClient.clear();
      container.remove();
    }
  }
);

test("a library preset populates connection fields and resets on reopen", async () => {
  const queries = new QueryClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let state: ReturnType<typeof useMcpServerDialogState>;

  function Probe({ open }: { open: boolean }) {
    state = useMcpServerDialogState({
      busy: false,
      initialPreset: { name: "Demo", url: "https://example.com/mcp" },
      onSubmit: async () => {},
      open,
    });

    return null;
  }

  const render = async (open: boolean) => {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queries}>
          <Probe open={open} />
        </QueryClientProvider>
      )
    );
  };

  try {
    await render(true);
    expect(state!.name).toBe("Demo");
    expect(state!.url).toBe("https://example.com/mcp");
    expect(state!.canSubmit).toBe(true);
    await act(async () => state!.setName("Changed"));
    await render(false);
    await render(true);
    expect(state!.name).toBe("Demo");
    expect(state!.url).toBe("https://example.com/mcp");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    queries.clear();
  }
});

test("MCP library filters transport and opens a selected preset without creating a server", async () => {
  const { McpServersSection } = await import("./McpServersSection");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let selected = "";

  try {
    await act(async () =>
      root.render(
        <McpServersSection
          busy={false}
          expandedServerId={null}
          onAddPreset={(preset) => {
            selected = preset.name;
          }}
          onAddServer={() => {
            selected = "custom";
          }}
          onConnect={() => {}}
          onDelete={() => {}}
          onEdit={() => {}}
          onSync={() => {}}
          onTestConnection={() => {}}
          onToggleServer={() => {}}
          servers={[]}
        />
      )
    );
    expect(container.querySelectorAll("article").length).toBeGreaterThan(0);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Add Notion MCP server"]'
        )!
        .click()
    );
    expect(selected).toBe("Notion");
    const select = container.querySelector<HTMLSelectElement>("select")!;
    await act(async () => {
      select.value = "stdio";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    expect(container.querySelectorAll("article").length).toBe(0);
    await act(async () => {
      select.value = "all";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    expect(container.querySelectorAll("article").length).toBeGreaterThan(0);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}, 15_000);

test("token presets require a bearer token and clear it when reopened", async () => {
  const queries = new QueryClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let state: ReturnType<typeof useMcpServerDialogState>;

  function Probe({ open }: { open: boolean }) {
    state = useMcpServerDialogState({
      busy: false,
      initialPreset: {
        auth: "token",
        name: "GitHub",
        url: "https://api.githubcopilot.com/mcp/",
      },
      onSubmit: async () => {},
      open,
    });

    return null;
  }

  const render = async (open: boolean) => {
    await act(async () =>
      root.render(
        <QueryClientProvider client={queries}>
          <Probe open={open} />
        </QueryClientProvider>
      )
    );
  };

  try {
    await render(true);
    expect(state!.kind).toBe("http");
    expect(state!.canSubmit).toBe(false);
    await act(async () =>
      state!.setHeaders([
        { key: "Authorization", value: "Bearer example-test-token" },
      ])
    );
    expect(state!.canSubmit).toBe(true);
    await render(false);
    await render(true);
    expect(state!.headers).toEqual([{ key: "Authorization", value: "" }]);
    expect(state!.canSubmit).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    queries.clear();
  }
});

test("library includes all requested services and removes registered presets", async () => {
  const { POPULAR_SERVERS, unregisteredPopularServers } = await import(
    "./popular-mcp-servers"
  );

  for (const name of [
    "GitHub",
    "Tavily",
    "Context7",
    "Linear",
    "Atlassian",
    "Slack",
    "Supabase",
  ]) {
    const entry = POPULAR_SERVERS.find((item) => item.name === name);
    expect(entry).toBeDefined();
    expect(new URL(entry!.url).protocol).toBe("https:");
    expect(
      unregisteredPopularServers([{ name: name.toLowerCase() }]).some(
        (item) => item.name === name
      )
    ).toBe(false);
  }

  expect(POPULAR_SERVERS.find((item) => item.name === "Slack")?.auth).toBe(
    "token"
  );
  expect(POPULAR_SERVERS.find((item) => item.name === "Context7")?.url).toBe(
    "https://mcp.context7.com/mcp/oauth"
  );
});
