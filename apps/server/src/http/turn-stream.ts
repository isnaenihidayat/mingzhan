import type { StreamEvent } from "@mingzhan/core";
import { sessionTurnRegistry } from "../services/session-turn-registry";

const SSE_HEADERS = {
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "Content-Type": "text/event-stream; charset=utf-8",
};

export function streamTurnSubscribe(sessionId: string): Response | null {
  if (!sessionTurnRegistry.isActive(sessionId)) {
    return null;
  }

  const encoder = new TextEncoder();
  const keepaliveIntervalMs = 4000;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const subscription = sessionTurnRegistry.subscribe(sessionId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

          if (event.type === "done" || event.type === "error") {
            subscription?.unsubscribe();
            controller.close();
          }
        } catch {
          subscription?.unsubscribe();
        }
      });

      if (!subscription) {
        controller.close();

        return;
      }

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepalive);
          subscription.unsubscribe();
        }
      }, keepaliveIntervalMs);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * SSE framing for a turn. Events written before `respond` wait in the stream,
 * and cancelling the response aborts `signal`, which stops the turn.
 */
export function createTurnStream() {
  const encoder = new TextEncoder();
  const cancel = new AbortController();
  // start() runs inside the constructor, so this is set before first use.
  let controller!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      cancel.abort();
    },
    start(streamController) {
      controller = streamController;
    },
  });

  const enqueue = (text: string) => {
    try {
      controller.enqueue(encoder.encode(text));
    } catch {
      // The client went away. The turn keeps running for registry subscribers.
    }
  };

  return {
    onEvent: (event: StreamEvent) =>
      enqueue(`data: ${JSON.stringify(event)}\n\n`),
    respond(done: Promise<unknown>): Response {
      const keepalive = setInterval(() => enqueue(": ping\n\n"), 4000);

      void done.finally(() => {
        clearInterval(keepalive);

        try {
          controller.close();
        } catch {
          // Already closed by the client cancelling the stream.
        }
      });

      return new Response(stream, { headers: SSE_HEADERS });
    },
    signal: cancel.signal,
  };
}
