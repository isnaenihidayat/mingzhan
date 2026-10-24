import type { ChannelConfigScope } from "@mingzhan/core/channel-config-shared";
import type { DiscordConfigFile } from "@mingzhan/core/discord-config";
import {
  isDiscordUserAuthorized,
  loadDiscordConfigFile,
  verifyAndPairDiscordUser,
} from "@mingzhan/core/discord-config";

export class DiscordAuthStore {
  constructor(private readonly scope: ChannelConfigScope = null) {}

  private config: DiscordConfigFile | null = null;

  async reload(): Promise<DiscordConfigFile | null> {
    this.config = await loadDiscordConfigFile(this.scope);

    return this.config;
  }

  getConfig(): DiscordConfigFile | null {
    return this.config;
  }

  isAuthorized(userId: string): boolean {
    if (!this.config) {
      return false;
    }

    return isDiscordUserAuthorized(userId, this.config);
  }

  /** Paired bridge owners — admin for Discord bot management commands. */
  isPaired(userId: string): boolean {
    return this.config?.pairedUserIds.includes(userId) ?? false;
  }

  async tryPair(
    handshakeInput: string,
    userId: string
  ): Promise<{ ok: boolean; message: string }> {
    const result = await verifyAndPairDiscordUser(
      handshakeInput,
      userId,
      this.scope
    );

    await this.reload();

    return result;
  }
}
