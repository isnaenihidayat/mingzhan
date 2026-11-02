import { afterEach, expect, test } from "bun:test";
import { fetchNetraModelLimits } from "./netra-model-limits";
import { createOpenAICompatibleProvider } from "./openai-compatible";
import { parseJsonRecord } from "./shared";
import { asTestFetch, streamFromChunks } from "./test-helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Netra model limits are read once and a failed read waits before a retry", async () => {
  let calls = 0;
  globalThis.fetch = asTestFetch(async () => {
    calls += 1;

    if (calls === 1) {
      return new Response("busy", { status: 503 });
    }

    return Response.json({
      data: [
        {
          context_length: 1_048_576,
          id: "deepseek/deepseek-v4.1-flash",
          top_provider: {
            context_length: 1_048_576,
            max_completion_tokens: 131_072,
          },
        },
      ],
    });
  });

  const read = (now?: number) =>
    fetchNetraModelLimits("cache-key", "deepseek/deepseek-v4.1-flash", now);

  const later = Date.now() + 11 * 60_000;
  const limits = { contextWindow: 1_048_576, maxOutputTokens: 131_072 };

  expect(await read()).toEqual({});
  // Within 10 minutes of the failure: no new request, fallback right away.
  expect(await read()).toEqual({});
  expect(calls).toBe(1);
  expect(await read(later)).toEqual(limits);
  expect(await read(later)).toEqual(limits);
  expect(await read()).toEqual(limits);
  expect(calls).toBe(2);
});

test("concurrent Netra model limit reads share one request", async () => {
  let calls = 0;
  globalThis.fetch = asTestFetch(async () => {
    calls += 1;

    return Response.json({
      data: [
        {
          id: "deepseek/deepseek-v4.1-flash",
          top_provider: { max_completion_tokens: 131_072 },
        },
      ],
    });
  });

  const reads = await Promise.all(
    Array.from({ length: 5 }, () =>
      fetchNetraModelLimits("shared-key", "deepseek/deepseek-v4.1-flash")
    )
  );

  expect(reads).toEqual(Array(5).fill({ maxOutputTokens: 131_072 }));
  expect(calls).toBe(1);
});

test("a Netra model list without the model is read again after the retry wait", async () => {
  let calls = 0;
  globalThis.fetch = asTestFetch(async () => {
    calls += 1;

    return Response.json({
      data:
        calls === 1
          ? []
          : [
              {
                context_length: 1_048_576,
                id: "deepseek/deepseek-v4.1-flash",
                top_provider: { max_completion_tokens: 131_072 },
              },
            ],
    });
  });

  const read = (now?: number) =>
    fetchNetraModelLimits("missing-key", "deepseek/deepseek-v4.1-flash", now);

  expect(await read()).toEqual({});
  expect(await read()).toEqual({});
  expect(calls).toBe(1);
  expect(await read(Date.now() + 11 * 60_000)).toEqual({
    contextWindow: 1_048_576,
    maxOutputTokens: 131_072,
  });
  expect(calls).toBe(2);
});

test("a Netra model limit lookup that times out falls back and is retried later", async () => {
  let calls = 0;
  globalThis.fetch = asTestFetch(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      expect(init?.signal).toBeInstanceOf(AbortSignal);

      if (calls === 1) {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }

      return Response.json({
        data: [
          {
            id: "deepseek/deepseek-v4.1-flash",
            top_provider: { max_completion_tokens: 131_072 },
          },
        ],
      });
    }
  );

  const read = (now?: number) =>
    fetchNetraModelLimits("timeout-key", "deepseek/deepseek-v4.1-flash", now);

  expect(await read()).toEqual({});
  expect(await read(Date.now() + 11 * 60_000)).toEqual({
    maxOutputTokens: 131_072,
  });
  expect(calls).toBe(2);
});

test("resolved output limits reach both ordinary and streamed requests", async () => {
  const limits: number[] = [];
  globalThis.fetch = asTestFetch(async (_input, init) => {
    const body = parseJsonRecord(String(init?.body));
    limits.push(Number(body.max_tokens));

    if (body.stream) {
      return new Response(
        streamFromChunks([
          'data: {"choices":[{"delta":{"content":"Done"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    return Response.json({ choices: [{ message: { content: "Done" } }] });
  });

  const provider = createOpenAICompatibleProvider({
    apiKey: "test",
    baseUrl: "https://example.com/v1",
    displayName: "Test",
    maxOutputTokens: 100,
    model: "model",
    resolveMaxOutputTokens: async () => 64_000,
    supportsThinking: false,
  });

  await provider.generateChat({
    messages: [{ content: "Hi", role: "user" }],
    system: "Test",
  });
  await provider.streamChat(
    { messages: [{ content: "Hi", role: "user" }], system: "Test" },
    { onChunk() {} }
  );
  expect(limits).toEqual([64_000, 64_000]);
});
