import type * as acp from "@agentclientprotocol/sdk";
import type { JsonValue, StreamChatHandlers, ToolCall } from "@mingzhan/core";
import { z } from "zod";
import { readRecord } from "../shared";

const MINGZHAN_MCP_PREFIX = "mcp__mingzhan__";

// Codex names an MCP step `mcp.mingzhan.<tool>` and wraps its input as
// `{ server, tool, arguments }`.
const CODEX_MINGZHAN_MCP_PREFIX = "mcp.mingzhan.";

/** Claude's built-in tools, mapped to the names MíngZhàn's step cards already know. */
const BUILT_IN_TOOLS = new Map([
  ["Bash", "bash"],
  ["Edit", "edit_file"],
  ["Glob", "search_files"],
  ["Grep", "search_files"],
  ["Read", "read_file"],
  ["Write", "write_file"],
]);

interface ToolRecord {
  input: Record<string, JsonValue>;
  started: boolean;
  /** Text the agent wrote before this step, so the step can be saved after it. */
  textBefore: string;
  tool: string;
}

/**
 * Turns the ACP `session/update` stream into the handler calls the chat loop
 * already renders. The agent names a tool in `_meta.claudeCode.toolName`
 * (for example `mcp__mingzhan__read_file` or `Bash`), and its input often arrives
 * on a later update, so a step starts once its input is known.
 */
export function createAcpUpdateMapper(handlers: StreamChatHandlers) {
  const tools = new Map<string, ToolRecord>();

  const completed: Array<{
    call: ToolCall;
    result: unknown;
    textBefore: string;
  }> = [];

  let assistantText = "";
  // Text since the last tool step. The final answer is what is left after the last step.
  let segmentText = "";

  function start(toolCallId: string, record: ToolRecord): void {
    if (record.started) {
      return;
    }

    record.started = true;
    record.textBefore = segmentText;
    segmentText = "";
    handlers.onToolStart?.({
      input: record.input,
      tool: record.tool,
      toolCallId,
    });
  }

  function remember(update: acp.ToolCall | acp.ToolCallUpdate): ToolRecord {
    const record = tools.get(update.toolCallId) ?? {
      input: {},
      started: false,
      textBefore: "",
      tool: "tool",
    };

    const acpName = claudeToolName(update) ?? update.title ?? record.tool;
    record.tool = toMíngZhànToolName(acpName);

    const input = unwrapCodexMcpInput(readRecord(update.rawInput));

    if (Object.keys(input).length > 0) {
      record.input = toMíngZhànInput(record.tool, input);
    }

    tools.set(update.toolCallId, record);

    return record;
  }

  return {
    assistantText: () => assistantText,

    completedToolCalls: () => completed,

    finalText: () => segmentText,

    handle(notification: acp.SessionNotification): void {
      const update = notification.update;

      switch (update.sessionUpdate) {
        case "agent_message_chunk": {
          if (update.content.type !== "text") {
            return;
          }

          assistantText += update.content.text;
          segmentText += update.content.text;
          handlers.onChunk(update.content.text);

          return;
        }

        case "agent_thought_chunk": {
          if (update.content.type === "text") {
            handlers.onThinking?.(update.content.text);
          }

          return;
        }

        case "tool_call": {
          const record = remember(update);

          if (Object.keys(record.input).length > 0) {
            start(update.toolCallId, record);
          }

          return;
        }

        case "tool_call_update": {
          const record = remember(update);

          if (Object.keys(record.input).length > 0) {
            start(update.toolCallId, record);
          }

          if (update.status !== "completed" && update.status !== "failed") {
            return;
          }

          start(update.toolCallId, record);

          const result = toMíngZhànResult(
            update.rawOutput ?? update.content ?? null
          );

          handlers.onToolEnd?.({
            result,
            tool: record.tool,
            toolCallId: update.toolCallId,
          });

          completed.push({
            call: {
              arguments: record.input,
              id: update.toolCallId,
              name: record.tool,
            },
            result,
            textBefore: record.textBefore,
          });

          tools.delete(update.toolCallId);

          return;
        }

        default:
          return;
      }
    },
  };
}

function claudeToolName(
  update: acp.ToolCall | acp.ToolCallUpdate
): string | null {
  const claude = readRecord(readRecord(update._meta).claudeCode);
  const name = claude.toolName;

  return name ? String(name) : null;
}

function toMíngZhànToolName(acpName: string): string {
  if (acpName.startsWith(MINGZHAN_MCP_PREFIX)) {
    return acpName.slice(MINGZHAN_MCP_PREFIX.length);
  }

  if (acpName.startsWith(CODEX_MINGZHAN_MCP_PREFIX)) {
    return acpName.slice(CODEX_MINGZHAN_MCP_PREFIX.length);
  }

  return BUILT_IN_TOOLS.get(acpName) ?? acpName;
}

function unwrapCodexMcpInput(
  input: Record<string, JsonValue>
): Record<string, JsonValue> {
  return input.server === "mingzhan" && input.arguments !== undefined
    ? readRecord(input.arguments)
    : input;
}

/**
 * Gives a MíngZhàn MCP step the result its native tool returns, such as
 * `{ path, bytesWritten }` for save_artifact, so the artifact chip shows.
 * Codex wraps the MCP result as `{ result: { content }, error }`.
 */
function toMíngZhànResult<Output>(output: Output): JsonValue | Output {
  const codex = codexMcpResultSchema.safeParse(output);

  if (codex.success) {
    const { error, result } = codex.data;

    if (error) {
      return { error };
    }

    return (result && parseTextContent(result.content)) ?? output;
  }

  const content = mcpTextContentSchema.safeParse(output);

  return (content.success && parseTextContent(content.data)) || output;
}

const mcpTextContentSchema = z.tuple([
  z.object({ text: z.string(), type: z.literal("text") }),
]);

const codexMcpResultSchema = z.object({
  error: z
    .union([
      z.string(),
      z.object({ message: z.string() }).transform((value) => value.message),
    ])
    .nullable(),
  result: z.object({ content: mcpTextContentSchema }).nullable(),
});

/** The tool's own JSON object, when the one text part holds one. */
function parseTextContent(
  content: z.infer<typeof mcpTextContentSchema>
): JsonValue | undefined {
  try {
    const parsed: JsonValue = JSON.parse(content[0].text);

    return readRecord(parsed) === parsed ? parsed : undefined;
  } catch {}
}

/** Renames the agent's input keys to the ones MíngZhàn's cards read. Other keys are kept. */
function toMíngZhànInput(tool: string, input: Record<string, JsonValue>) {
  const filePath = input.file_path;
  const pattern = input.pattern;

  if (
    tool === "read_file" &&
    input.path === undefined &&
    filePath !== undefined
  ) {
    const renamed = { ...input, path: filePath };

    return renamed;
  }

  if (
    tool === "search_files" &&
    input.query === undefined &&
    pattern !== undefined
  ) {
    const renamed = { ...input, query: pattern };

    return renamed;
  }

  return input;
}
