import { describe, expect, test } from "bun:test";
import type { ProviderInstance } from "@mingzhan/core";
import { createProviderForInstance } from "./create";

describe("Cheaper Inference routing", () => {
  test("routes cheaper_inference instances to the configured base URL with auth", async () => {
    let seenPath = "";
    let seenAuth = "";
    let seenModel = "";

    const mock = Bun.serve({
      fetch: async (request) => {
        const url = new URL(request.url);
        seenPath = url.pathname;
        seenAuth = request.headers.get("authorization") ?? "";

        // SAFETY: The provider serializes this request body and the test checks its known fixture shape.
        const body = (await request.json()) as { model?: string };

        seenModel = body.model ?? "";

        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              index: 0,
              message: { content: "ok", role: "assistant" },
            },
          ],
          created: 1,
          id: "mock",
          model: seenModel,
          object: "chat.completion",
          usage: {
            completion_tokens: 1,
            prompt_tokens: 1,
            total_tokens: 2,
          },
        });
      },
      port: 0,
    });

    try {
      const instance: ProviderInstance = {
        apiKey: "test-key",
        baseUrl: `http://127.0.0.1:${mock.port}/v1`,
        createdAt: new Date().toISOString(),
        customModels: [{ default: true, id: "gpt-5.4-mini" }],
        id: "inst_cheaper_inference",
        label: "Cheaper Inference",
        type: "cheaper_inference",
      };

      const client = createProviderForInstance(instance, "gpt-5.4-mini");

      expect(client?.name).toBe("cheaper_inference");

      const result = await client!.generateChat({
        messages: [{ content: "ping", role: "user" }],
        system: "",
      });

      expect(result.content).toBe("ok");
      expect(seenPath).toBe("/v1/chat/completions");
      expect(seenAuth).toBe("Bearer test-key");
      expect(seenModel).toBe("gpt-5.4-mini");
    } finally {
      mock.stop(true);
    }
  });
});
