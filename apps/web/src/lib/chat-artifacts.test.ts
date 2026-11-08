import { describe, expect, test } from "bun:test";
import { type ChatListItem, chatMessagesToListItems } from "@/lib/chat-history";
import {
  extractArtifactPathsFromText,
  extractTurnArtifacts,
} from "./chat-artifacts";

const ARTIFACTS_ROOT =
  "/Users/test/.mingzhan/orgs/org_1/profiles/profile_1/artifacts";

function writeFileTool(
  id: string,
  input: { path: string; content: string },
  result: { path: string; bytesWritten: number } | { error: string },
  toolStatus: "running" | "done" = "done"
): ChatListItem {
  return {
    content: "",
    id: `tool-${id}`,
    role: "tool",
    tool: "write_file",
    toolCallId: id,
    toolInput: input,
    toolResult: result,
    toolStatus,
  };
}

const metaJson = JSON.stringify({
  mimeType: "text/markdown",
  savedAt: "2026-07-13T10:00:00.000Z",
  sizeBytes: 42,
});

describe("extractTurnArtifacts", () => {
  test("pairs content and sidecar writes into one artifact ref", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.mingzhan-meta.json`;

    const messages: ChatListItem[] = [
      writeFileTool(
        "1",
        { content: "# Report", path: "artifacts/report.md" },
        {
          bytesWritten: 8,
          path: contentPath,
        }
      ),
      writeFileTool(
        "2",
        { content: metaJson, path: "artifacts/report.md.mingzhan-meta.json" },
        {
          bytesWritten: metaJson.length,
          path: sidecarPath,
        }
      ),
    ];

    expect(extractTurnArtifacts(messages)).toEqual([
      {
        filename: "report.md",
        mimeType: "text/markdown",
        path: "report.md",
        savedAt: "2026-07-13T10:00:00.000Z",
        sizeBytes: 42,
      },
    ]);
  });

  test("supports nested artifact paths", () => {
    const contentPath = `${ARTIFACTS_ROOT}/weekly/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/weekly/report.md.mingzhan-meta.json`;

    const messages: ChatListItem[] = [
      writeFileTool(
        "1",
        { content: "# Weekly", path: "artifacts/weekly/report.md" },
        {
          bytesWritten: 8,
          path: contentPath,
        }
      ),
      writeFileTool(
        "2",
        {
          content: metaJson,
          path: "artifacts/weekly/report.md.mingzhan-meta.json",
        },
        {
          bytesWritten: metaJson.length,
          path: sidecarPath,
        }
      ),
    ];

    expect(extractTurnArtifacts(messages)).toEqual([
      expect.objectContaining({
        filename: "report.md",
        path: "weekly/report.md",
      }),
    ]);
  });

  test("falls back to content-only writes with inferred mime", () => {
    const contentPath = `${ARTIFACTS_ROOT}/harness-engineering-slides.html`;

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          {
            content: "<html></html>",
            path: "artifacts/harness-engineering-slides.html",
          },
          {
            bytesWritten: 13,
            path: contentPath,
          }
        ),
      ])
    ).toEqual([
      {
        filename: "harness-engineering-slides.html",
        mimeType: "text/html",
        path: "harness-engineering-slides.html",
        savedAt: "",
        sizeBytes: 13,
      },
    ]);
  });

  test("returns empty when only sidecar is written", () => {
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.mingzhan-meta.json`;

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          { content: metaJson, path: "artifacts/report.md.mingzhan-meta.json" },
          {
            bytesWritten: metaJson.length,
            path: sidecarPath,
          }
        ),
      ])
    ).toEqual([]);
  });

  test("falls back to content write when sidecar write fails", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          { content: "# Report", path: "artifacts/report.md" },
          {
            bytesWritten: 8,
            path: contentPath,
          }
        ),
        writeFileTool(
          "2",
          { content: metaJson, path: "artifacts/report.md.mingzhan-meta.json" },
          {
            error: "write failed",
          }
        ),
      ])
    ).toEqual([
      {
        filename: "report.md",
        mimeType: "text/markdown",
        path: "report.md",
        savedAt: "",
        sizeBytes: 8,
      },
    ]);
  });

  test("extracts artifact paths mentioned in assistant text", () => {
    expect(
      extractTurnArtifacts([
        {
          content:
            "Saved to `artifacts/harness-engineering-slides.html` for you.",
          id: "assistant-1",
          role: "assistant",
        },
      ])
    ).toEqual([
      {
        filename: "harness-engineering-slides.html",
        mimeType: "text/html",
        path: "harness-engineering-slides.html",
        savedAt: "",
        sizeBytes: 0,
      },
    ]);
  });

  test("prefers sidecar metadata over text mentions of the same path", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.mingzhan-meta.json`;

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          { content: "# Report", path: "artifacts/report.md" },
          {
            bytesWritten: 8,
            path: contentPath,
          }
        ),
        writeFileTool(
          "2",
          { content: metaJson, path: "artifacts/report.md.mingzhan-meta.json" },
          {
            bytesWritten: metaJson.length,
            path: sidecarPath,
          }
        ),
        {
          content: "Saved `artifacts/report.md`.",
          id: "assistant-1",
          role: "assistant",
        },
      ])
    ).toEqual([
      {
        filename: "report.md",
        mimeType: "text/markdown",
        path: "report.md",
        savedAt: "2026-07-13T10:00:00.000Z",
        sizeBytes: 42,
      },
    ]);
  });

  test("falls back to content write when sidecar JSON is invalid", () => {
    const contentPath = `${ARTIFACTS_ROOT}/report.md`;
    const sidecarPath = `${ARTIFACTS_ROOT}/report.md.mingzhan-meta.json`;

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          { content: "# Report", path: "artifacts/report.md" },
          {
            bytesWritten: 8,
            path: contentPath,
          }
        ),
        writeFileTool(
          "2",
          { content: "{bad", path: "artifacts/report.md.mingzhan-meta.json" },
          {
            bytesWritten: 4,
            path: sidecarPath,
          }
        ),
      ])
    ).toEqual([
      {
        filename: "report.md",
        mimeType: "text/markdown",
        path: "report.md",
        savedAt: "",
        sizeBytes: 8,
      },
    ]);
  });

  test("ignores meta files written outside artifacts", () => {
    const outsidePath =
      "/Users/test/.mingzhan/orgs/org_1/profiles/profile_1/notes.mingzhan-meta.json";

    expect(
      extractTurnArtifacts([
        writeFileTool(
          "1",
          { content: metaJson, path: "notes.mingzhan-meta.json" },
          {
            bytesWritten: metaJson.length,
            path: outsidePath,
          }
        ),
      ])
    ).toEqual([]);
  });

  test("emits two refs for two full pairs in one turn", () => {
    const messages: ChatListItem[] = [
      writeFileTool(
        "1",
        { content: "a", path: "artifacts/a.md" },
        {
          bytesWritten: 1,
          path: `${ARTIFACTS_ROOT}/a.md`,
        }
      ),
      writeFileTool(
        "2",
        { content: metaJson, path: "artifacts/a.md.mingzhan-meta.json" },
        {
          bytesWritten: metaJson.length,
          path: `${ARTIFACTS_ROOT}/a.md.mingzhan-meta.json`,
        }
      ),
      writeFileTool(
        "3",
        { content: "b", path: "artifacts/b.md" },
        {
          bytesWritten: 1,
          path: `${ARTIFACTS_ROOT}/b.md`,
        }
      ),
      writeFileTool(
        "4",
        { content: metaJson, path: "artifacts/b.md.mingzhan-meta.json" },
        {
          bytesWritten: metaJson.length,
          path: `${ARTIFACTS_ROOT}/b.md.mingzhan-meta.json`,
        }
      ),
    ];

    expect(extractTurnArtifacts(messages)).toHaveLength(2);
  });

  test("emits artifacts-relative paths only", () => {
    const contentPath = `${ARTIFACTS_ROOT}/weekly/report.md`;

    const [artifact] = extractTurnArtifacts([
      writeFileTool(
        "1",
        { content: "# Weekly", path: "artifacts/weekly/report.md" },
        {
          bytesWritten: 8,
          path: contentPath,
        }
      ),
      writeFileTool(
        "2",
        {
          content: metaJson,
          path: "artifacts/weekly/report.md.mingzhan-meta.json",
        },
        {
          bytesWritten: metaJson.length,
          path: `${ARTIFACTS_ROOT}/weekly/report.md.mingzhan-meta.json`,
        }
      ),
    ]);

    expect(artifact?.path).toBe("weekly/report.md");
    expect(artifact?.path.startsWith("/")).toBe(false);
  });

  test("extracts successful generate_image tool results without write_file pairs", () => {
    expect(
      extractTurnArtifacts([
        {
          content: "",
          id: "tool-img",
          role: "tool",
          tool: "generate_image",
          toolCallId: "img_1",
          toolInput: { prompt: "a cat" },
          toolResult: {
            attachmentId: "att_1",
            mimeType: "image/png",
            model: "gpt-image-2",
            path: "artifacts/cat.png",
            sizeBytes: 2048,
          },
          toolStatus: "done",
        },
      ])
    ).toEqual([
      {
        filename: "cat.png",
        mimeType: "image/png",
        path: "cat.png",
        savedAt: "",
        sizeBytes: 2048,
      },
    ]);
  });

  test("ignores failed generate_image tool results", () => {
    expect(
      extractTurnArtifacts([
        {
          content: "",
          id: "tool-img",
          role: "tool",
          tool: "generate_image",
          toolCallId: "img_1",
          toolInput: { prompt: "a cat" },
          toolResult: { error: "Image model is not configured." },
          toolStatus: "done",
        },
      ])
    ).toEqual([]);
  });

  test("rejects generate_image results missing mimeType", () => {
    expect(
      extractTurnArtifacts([
        {
          content: "",
          id: "tool-img",
          role: "tool",
          tool: "generate_image",
          toolCallId: "img_1",
          toolInput: { prompt: "a cat" },
          toolResult: {
            path: "artifacts/cat.png",
            sizeBytes: 2048,
          },
          toolStatus: "done",
        },
      ])
    ).toEqual([]);
  });

  test("extracts write_file pairs and generate_image together in one turn", () => {
    const messages: ChatListItem[] = [
      writeFileTool(
        "1",
        { content: "a", path: "artifacts/a.md" },
        {
          bytesWritten: 1,
          path: `${ARTIFACTS_ROOT}/a.md`,
        }
      ),
      writeFileTool(
        "2",
        { content: metaJson, path: "artifacts/a.md.mingzhan-meta.json" },
        {
          bytesWritten: metaJson.length,
          path: `${ARTIFACTS_ROOT}/a.md.mingzhan-meta.json`,
        }
      ),
      {
        content: "",
        id: "tool-img",
        role: "tool",
        tool: "generate_image",
        toolCallId: "img_1",
        toolInput: { prompt: "a cat" },
        toolResult: {
          attachmentId: "att_1",
          mimeType: "image/png",
          model: "gpt-image-2",
          path: "artifacts/cat.png",
          sizeBytes: 2048,
        },
        toolStatus: "done",
      },
    ];

    expect(
      extractTurnArtifacts(messages)
        .map((artifact) => artifact.path)
        .sort()
    ).toEqual(["a.md", "cat.png"]);
  });
});

describe("extractArtifactPathsFromText", () => {
  test("finds bare and owner-qualified artifact paths", () => {
    expect(
      extractArtifactPathsFromText(
        "Open artifacts/harness-engineering-slides.html, then profiles/video-producer/artifacts/shots/frame.png."
      )
    ).toEqual([
      { path: "harness-engineering-slides.html" },
      { ownerProfileId: "video-producer", path: "shots/frame.png" },
    ]);
  });

  test("ignores meta sidecars", () => {
    expect(
      extractArtifactPathsFromText("artifacts/report.md.mingzhan-meta.json")
    ).toEqual([]);
  });

  test("keeps the same path in two profiles as two chips, each with its owner", () => {
    const refs = extractTurnArtifacts([
      {
        content:
          "Mine: artifacts/report.md. Theirs: profiles/video-producer/artifacts/report.md",
        id: "assistant-1",
        role: "assistant",
      },
    ]);

    expect(refs.map((ref) => [ref.ownerProfileId, ref.path])).toEqual([
      [undefined, "report.md"],
      ["video-producer", "report.md"],
    ]);
  });
});

describe("workbooks produced by command-line helpers", () => {
  const manifest = {
    bytes: 16_686,
    formulas: 37,
    path: "artifacts/ooh-komisi-sales.xlsx",
    recalculated: true,
    sheets: ["Asumsi", "KPI", "Tiering", "Simulasi", "Ketentuan"],
  };

  type CommandResult = {
    exitCode: number;
    stdout: string;
    timedOut?: boolean;
    stderr?: string;
    error?: string;
  };

  function bashMessage(
    result: CommandResult,
    toolStatus: "running" | "done" = "done"
  ): ChatListItem {
    return {
      content: "",
      id: "build",
      role: "tool",
      tool: "bash",
      toolResult: result,
      toolStatus,
    };
  }

  test("recovers the artifact after reloading stored command history", () => {
    const items = chatMessagesToListItems([
      {
        content: JSON.stringify({
          exitCode: 0,
          stderr: "",
          stdout: JSON.stringify(manifest) + "\n",
          timedOut: false,
        }),
        name: "bash",
        role: "tool",
        toolCallId: "create-workbook",
      },
      {
        content:
          "File `ooh-komisi-sales.xlsx` built and verified with 5 sheets.",
        role: "assistant",
      },
    ]);

    expect(extractTurnArtifacts(items)).toEqual([
      expect.objectContaining({
        filename: "ooh-komisi-sales.xlsx",
        sizeBytes: 16_686,
      }),
    ]);
  });

  test("shows a workbook card when bash reports the artifact but the reply names only the file", () => {
    const artifacts = extractTurnArtifacts([
      bashMessage({
        exitCode: 0,
        stderr: "",
        stdout: JSON.stringify(manifest) + "\n",
        timedOut: false,
      }),
      {
        content:
          "File `ooh-komisi-sales.xlsx` built and verified with 5 sheets.",
        id: "reply",
        role: "assistant",
      },
    ]);

    expect(artifacts).toEqual([
      {
        filename: "ooh-komisi-sales.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        path: "ooh-komisi-sales.xlsx",
        savedAt: "",
        sizeBytes: 16_686,
      },
    ]);
  });

  test("handles JSON after log lines and deduplicates explicit artifact mentions", () => {
    const artifacts = extractTurnArtifacts([
      bashMessage({
        exitCode: 0,
        stdout: "Building…\n" + JSON.stringify(manifest) + "\n",
      }),
      {
        content: "Download artifacts/ooh-komisi-sales.xlsx",
        id: "reply",
        role: "assistant",
      },
    ]);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.sizeBytes).toBe(16_686);
  });

  test("does not treat failed, timed-out, unstructured or incomplete commands as saved files", () => {
    for (const result of [
      { exitCode: 1, stdout: JSON.stringify(manifest) },
      { exitCode: 0, stdout: JSON.stringify(manifest), timedOut: true },
      { error: "Failed", exitCode: 0, stdout: JSON.stringify(manifest) },
      {
        exitCode: 0,
        stdout:
          "python scripts/build.py --output artifacts/ooh-komisi-sales.xlsx",
      },
      {
        exitCode: 0,
        stdout: JSON.stringify({ bytes: 100, path: "staging/ooh.xlsx" }),
      },
      {
        exitCode: 0,
        stdout: JSON.stringify({
          bytes: 100,
          path: "artifacts/../secrets.txt",
        }),
      },
      {
        exitCode: 0,
        stdout: JSON.stringify({
          bytes: 100,
          path: "artifacts/report.xlsx.mingzhan-meta.json",
        }),
      },
    ]) {
      expect(extractTurnArtifacts([bashMessage(result)])).toEqual([]);
    }

    expect(
      extractTurnArtifacts([
        bashMessage(
          { exitCode: 0, stdout: JSON.stringify(manifest) },
          "running"
        ),
      ])
    ).toEqual([]);
  });
});
