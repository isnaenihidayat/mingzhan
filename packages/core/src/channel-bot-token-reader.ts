import { setTimeout as sleep } from "node:timers/promises";
import { MíngZhànApiError } from "./api-error";
import { resolveManagedSecret } from "./config";
import { parseIni, readTextOrNull } from "./fs";

export type BotTokenSecretRef = { name: string; scope: string };

const readBotTokenInProcess = (secret: BotTokenSecretRef) =>
  resolveManagedSecret(secret.scope, secret.name);

let readBotToken = readBotTokenInProcess;

/**
 * Worker side of the bot token: ask the server, which holds the key. Each
 * token is read once, since a token change restarts the worker. Waits with
 * backoff while the server starts or rate limits. Pass null to read in
 * process again.
 */
export function readBotTokensFromServer(
  fetchToken: ((secret: BotTokenSecretRef) => Promise<string | null>) | null,
  wait: (ms: number) => Promise<void> = sleep
): void {
  if (!fetchToken) {
    readBotToken = readBotTokenInProcess;

    return;
  }

  const tokens = new Map<string, string>();

  readBotToken = async (secret) => {
    const key = `${secret.scope}/${secret.name}`;
    const cached = tokens.get(key);

    if (cached) {
      return cached;
    }

    // 0.5s doubling to 10s, ten pauses: about 65s before giving up.
    for (let attempt = 0; ; attempt += 1) {
      try {
        const token = await fetchToken(secret);

        if (token) {
          tokens.set(key, token);
        }

        return token;
      } catch (error) {
        // No answer or 429/503 can heal; any other status will not.
        const status = error instanceof MíngZhànApiError ? error.status : null;

        if (
          attempt === 10 ||
          (status !== null && status !== 429 && status !== 503)
        ) {
          throw new Error("Could not read the bot token from the server.", {
            cause: error,
          });
        }
      }

      await wait(Math.min(500 * 2 ** attempt, 10_000));
    }
  };
}

export type BotChannelConfigFile<TId extends string | number> = {
  allowedUserIds: TId[];
  botToken: string;
  /** config.ini holds `bot_token_ref=managed`: the server keeps the token encrypted. */
  botTokenManaged?: boolean;
  handshakeCode: string | null;
  handshakeExpiresAt: string | null;
  pairedUserIds: TId[];
  profileId: string;
};

/** A stored code is only usable while its own expiry is still in the future. */
export async function loadBotChannelIniConfig<
  TId extends string | number,
>(options: {
  configPath: string;
  defaultProfileId: string;
  parseUserIds: (raw: string) => TId[];
  secret?: BotTokenSecretRef;
}): Promise<BotChannelConfigFile<TId> | null> {
  const raw = await readTextOrNull(options.configPath);

  if (raw === null) {
    return null;
  }

  const values = parseIni(raw);
  const botTokenManaged = values.bot_token_ref?.trim() === "managed";

  const botToken =
    values.bot_token?.trim() ||
    (botTokenManaged && options.secret
      ? ((await readBotToken(options.secret)) ?? "")
      : "");

  const profileId = values.profile_id?.trim() || options.defaultProfileId;
  const handshakeCode = values.handshake_code?.trim() || null;
  const handshakeExpiresAt = values.handshake_expires_at?.trim() || null;
  const pairedRaw = values.paired_user_ids?.trim() ?? "";
  const allowlistRaw = values.allowed_user_ids?.trim() ?? "";

  if (!botToken) {
    return null;
  }

  return {
    allowedUserIds: allowlistRaw ? options.parseUserIds(allowlistRaw) : [],
    botToken,
    botTokenManaged,
    handshakeCode,
    handshakeExpiresAt,
    pairedUserIds: pairedRaw ? options.parseUserIds(pairedRaw) : [],
    profileId,
  };
}
