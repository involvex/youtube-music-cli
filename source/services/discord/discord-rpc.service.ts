// Discord Rich Presence service
// Uses discord-rpc package if available; gracefully no-ops if Discord is not running
import { logger } from "../logger/logger.service.ts";

interface TrackInfo {
  title: string;
  artist: string;
  startTimestamp?: number;
}

export class DiscordRpcService {
  private client: unknown = null;
  private connected = false;
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      void this.disconnect();
    }
  }

  async connect(): Promise<void> {
    if (!this.enabled || this.connected) return;

    try {
      // Dynamic import so missing package doesn't crash startup
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const rpc = await import("discord-rpc");

      // Try multiple pipe names to support different Discord clients
      const pipeNames = [
        "discord",
        "discord-canary",
        "discordptb",
        "discord-development",
      ];
      let lastError: Error | null = null;

      for (const pipeName of pipeNames) {
        try {
          const client = new rpc.Client({
            transport: "ipc",
            pipe: pipeName,
          });

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              // destroy() is async and rejects when socket was never connected;
              // fire-and-forget with .catch() to prevent unhandled rejection
              void client.destroy().catch(() => {});
              reject(new Error(`Connection timeout for pipe ${pipeName}`));
            }, 10000);

            client.on("ready", () => {
              clearTimeout(timeout);
              this.connected = true;
              logger.info(
                "DiscordRpcService",
                `Connected to Discord via pipe: ${pipeName}`,
              );
              resolve();
            });

            client.on("error", () => {
              // Continue to next pipe on error
            });

            client
              .login({ clientId: "1473580336964177960" })
              .catch((err: unknown) => {
                // destroy() is async and rejects when socket was never connected;
                // fire-and-forget with .catch() to prevent unhandled rejection
                void client.destroy().catch(() => {});
                reject(err);
              });
          });

          this.client = client;
          return; // Success
        } catch (err) {
          lastError = err as Error;
          // Try next pipe name
          continue;
        }
      }

      // If we got here, all pipes failed
      throw new Error(
        `Failed to connect to Discord RPC. Tried pipes: ${pipeNames.join(", ")}. Last error: ${lastError?.message}`,
      );
    } catch (error) {
      logger.warn("DiscordRpcService", "Could not connect to Discord", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Re-throw so plugin knows connect failed
    }
  }

  async updateActivity(track: TrackInfo): Promise<void> {
    if (!this.enabled || !this.connected || !this.client) return;

    try {
      const c = this.client as { setActivity: (a: unknown) => Promise<void> };
      await c.setActivity({
        details: track.title,
        state: `by ${track.artist}`,
        startTimestamp: track.startTimestamp ?? Date.now(),
        largeImageKey: "logo",
        largeImageText: "YouTube Music CLI",
        instance: false,
      });
    } catch (error) {
      logger.warn("DiscordRpcService", "Failed to update Discord activity", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async clearActivity(): Promise<void> {
    if (!this.connected || !this.client) return;
    try {
      const c = this.client as { clearActivity: () => Promise<void> };
      await c.clearActivity();
    } catch {
      // Ignore
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      const c = this.client as { destroy: () => Promise<void> };
      await c.destroy();
    } catch {
      // Ignore
    }
    this.client = null;
    this.connected = false;
  }
}

let instance: DiscordRpcService | null = null;
export const getDiscordRpcService = (): DiscordRpcService => {
  if (!instance) instance = new DiscordRpcService();
  return instance;
};
