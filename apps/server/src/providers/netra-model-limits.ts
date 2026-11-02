import { defaultDiscoveryBaseUrl } from "@mingzhan/core/discovery-providers";
import { z } from "zod";

type NetraModelLimits = {
  contextWindow?: number;
  maxOutputTokens?: number;
};

type NetraLimitsLookup = {
  lookup: Promise<NetraModelLimits>;
  failedAt?: number;
};

const netraModelLimits = new Map<string, NetraLimitsLookup>();

const NETRA_MODELS_TIMEOUT_MS = 3000;

const NETRA_MODELS_RETRY_MS = 10 * 60_000;

const tokenCountSchema = z.number().int().positive().nullish();

const netraModelsSchema = z.object({
  data: z.array(
    z.object({
      context_length: tokenCountSchema,
      id: z.string(),
      top_provider: z
        .object({
          context_length: tokenCountSchema,
          max_completion_tokens: tokenCountSchema,
        })
        .nullish(),
    })
  ),
});

/** The context and output limits `/v1/models` reports for a Netra model, read
 * once per process and API key. A failed lookup resolves to no limits and is
 * retried no sooner than NETRA_MODELS_RETRY_MS, so a down endpoint costs one
 * request, not one per chat turn. */
export function fetchNetraModelLimits(
  apiKey: string,
  modelId: string,
  now = Date.now()
): Promise<NetraModelLimits> {
  const key = `${apiKey}\u0000${modelId}`;
  const cached = netraModelLimits.get(key);

  if (
    cached &&
    (cached.failedAt === undefined ||
      now - cached.failedAt < NETRA_MODELS_RETRY_MS)
  ) {
    return cached.lookup;
  }

  const entry: NetraLimitsLookup = { lookup: Promise.resolve({}) };

  entry.lookup = (async () => {
    const response = await fetch(`${defaultDiscoveryBaseUrl("netra")}/models`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // A chat request may wait on this lookup, so a slow /v1/models must
      // not hold the reply: give up and use the fallbacks.
      signal: AbortSignal.timeout(NETRA_MODELS_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Netra models request failed (${response.status}).`);
    }

    const { data } = netraModelsSchema.parse(await response.json());
    const model = data.find((item) => item.id === modelId);
    const limits: NetraModelLimits = {};

    const contextWindow =
      model?.top_provider?.context_length ?? model?.context_length;

    const maxOutputTokens = model?.top_provider?.max_completion_tokens;

    if (contextWindow) {
      limits.contextWindow = contextWindow;
    }

    if (maxOutputTokens) {
      limits.maxOutputTokens = maxOutputTokens;
    }

    // A list without this model or its limits may be a partial rollout:
    // use the fallbacks now and ask again after the retry wait.
    if (!(contextWindow && maxOutputTokens)) {
      entry.failedAt = Date.now();
    }

    return limits;
  })().catch((): NetraModelLimits => {
    entry.failedAt = Date.now();

    return {};
  });

  netraModelLimits.set(key, entry);

  return entry.lookup;
}
