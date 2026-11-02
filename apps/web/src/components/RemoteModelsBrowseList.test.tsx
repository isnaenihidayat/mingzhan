import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import type { ModelsResponse } from "@mingzhan/core/contract";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { client } from "@/lib/client";
import { RemoteModelsBrowseList } from "./RemoteModelsBrowseList";

let root: Root;

let queryClient: QueryClient;

let discovery: ReturnType<typeof spyOn<typeof client, "discoverModels">>;

const response: ModelsResponse = {
  currentProviderId: null,
  customModels: [{ id: "test-model", name: "Test model" }],
  displayName: null,
  models: [],
  provider: "openai_compatible",
  providers: [],
};

beforeEach(() => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: 3 } } });
  discovery = spyOn(client, "discoverModels").mockResolvedValue(response);
});

afterEach(async () => {
  await act(() => root.unmount());
  queryClient.clear();
  discovery.mockRestore();
  document.body.innerHTML = "";
});

async function render(baseUrl: string, apiKey = "test-key") {
  await act(() =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <RemoteModelsBrowseList
          apiKey={apiKey}
          baseUrl={baseUrl}
          onSelect={() => {}}
        />
      </QueryClientProvider>
    )
  );
}

async function wait(ms: number) {
  await act(() => Bun.sleep(ms));
  await act(() => Bun.sleep(20));
}

test("discovery waits for a valid settled URL and uses only the final credentials", async () => {
  await render("http://");
  await wait(450);
  expect(discovery).not.toHaveBeenCalled();
  await render("http://endpoint.test/v1", "partial-key");
  await wait(100);
  await render("http://endpoint.test/v1", "complete-key");
  await wait(450);
  expect(discovery).toHaveBeenCalledTimes(1);
  expect(discovery.mock.calls[0][0]).toMatchObject({
    apiKey: "complete-key",
    baseUrl: "http://endpoint.test/v1",
  });
  expect(discovery.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
});

test("changing input cancels the obsolete discovery request", async () => {
  let requestSignal: AbortSignal | undefined;
  discovery.mockImplementation((_input, options) => {
    requestSignal = options?.signal;

    return new Promise((_resolve, reject) => {
      requestSignal?.addEventListener(
        "abort",
        () => reject(new DOMException("Cancelled", "AbortError")),
        { once: true }
      );
    });
  });
  await render("http://endpoint.test/v1");
  await wait(450);
  expect(requestSignal?.aborted).toBe(false);
  await render("");
  expect(requestSignal?.aborted).toBe(true);
});

test("failed discovery does not repeatedly retry while the user edits", async () => {
  discovery.mockRejectedValue(new Error("Endpoint unavailable"));
  await render("http://endpoint.test/v1");
  await wait(450);
  await wait(1100);
  expect(discovery).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain("Endpoint unavailable");
});
