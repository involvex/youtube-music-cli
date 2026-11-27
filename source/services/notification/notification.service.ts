import type nodeNotifier from "node-notifier";

// Desktop notification service
import { logger } from "../logger/logger.service.ts";

class NotificationService {
  private static instance: NotificationService;
  private enabled = false;
  private notifier: typeof nodeNotifier | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async getNotifier(): Promise<typeof nodeNotifier> {
    if (!this.notifier) {
      // Lazy-load to avoid startup cost when disabled
      const mod = await import("node-notifier");
      this.notifier = mod.default;
    }
    return this.notifier;
  }

  async notify(title: string, message: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const notifier = await this.getNotifier();
      notifier.notify(
        {
          title,
          message,
          sound: false,
          wait: false,
        },
        (error: Error | null) => {
          if (error) {
            logger.warn("NotificationService", "Notification failed", {
              error: error.message,
            });
          }
        },
      );
    } catch (error) {
      // Gracefully handle if notifications aren't supported
      logger.warn("NotificationService", "Failed to send notification", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifyTrackChange(title: string, artist: string): Promise<void> {
    await this.notify("Now Playing", `${title} — ${artist}`);
  }
}

export const getNotificationService = (): NotificationService =>
  NotificationService.getInstance();
