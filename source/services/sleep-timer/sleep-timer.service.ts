// Sleep timer service - auto-stops playback after a set duration
import { logger } from "../logger/logger.service.ts";

export const SLEEP_TIMER_PRESETS = [5, 10, 15, 30, 60] as const;
export type SleepTimerPreset = (typeof SLEEP_TIMER_PRESETS)[number];

/** Volume ramp length in seconds applied before pausing on expiry (default 30). */
export const SLEEP_TIMER_FADE_SECONDS = 30;
const FADE_TICK_INTERVAL_MS = 250;
const MIN_FADE_MS = 50;

export interface SleepTimerFadeOptions {
  /** Fade length in seconds; overrides SLEEP_TIMER_FADE_SECONDS. */
  fadeDurationSeconds?: number;
  /** Returns the volume percent to fade from, or null to skip fading. */
  onFadeStart?: () => number | null;
  /** Called with the interpolated volume percent on each tick. */
  onFadeTick?: (volumePercent: number) => void;
  /** Called after pause so callers can restore the pre-fade volume. */
  onFadeEnd?: () => void;
}

class SleepTimerService {
  private static instance: SleepTimerService;
  private timer: NodeJS.Timeout | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  private endTime: number | null = null;

  private constructor() {}

  static getInstance(): SleepTimerService {
    if (!SleepTimerService.instance) {
      SleepTimerService.instance = new SleepTimerService();
    }
    return SleepTimerService.instance;
  }

  start(
    minutes: number,
    onExpire: () => void,
    fadeOptions?: SleepTimerFadeOptions,
  ): void {
    this.cancel();
    this.endTime = Date.now() + minutes * 60 * 1000;

    logger.info("SleepTimerService", "Timer started", { minutes });

    this.timer = setTimeout(
      () => {
        logger.info("SleepTimerService", "Timer expired");
        this.timer = null;
        this.runFadeThenExpire(onExpire, fadeOptions);
      },
      minutes * 60 * 1000,
    );
  }

  cancel(): void {
    let cancelled = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      cancelled = true;
    }
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
      cancelled = true;
    }
    this.endTime = null;
    if (cancelled) {
      logger.info("SleepTimerService", "Timer cancelled");
    }
  }

  /** Returns remaining seconds, or null if no timer active */
  getRemainingSeconds(): number | null {
    if (!this.endTime) return null;
    const remaining = Math.max(
      0,
      Math.ceil((this.endTime - Date.now()) / 1000),
    );
    return remaining;
  }

  isActive(): boolean {
    return this.timer !== null || this.fadeInterval !== null;
  }

  private runFadeThenExpire(
    onExpire: () => void,
    fadeOptions?: SleepTimerFadeOptions,
  ): void {
    const requestedSeconds =
      fadeOptions?.fadeDurationSeconds ?? SLEEP_TIMER_FADE_SECONDS;
    const fadeMs = Math.max(MIN_FADE_MS, requestedSeconds * 1000);
    const startVolume = fadeOptions?.onFadeStart?.() ?? null;

    const finish = (): void => {
      this.clearFadeInterval();
      this.endTime = null;
      onExpire();
      fadeOptions?.onFadeEnd?.();
    };

    if (!fadeOptions || startVolume === null || startVolume <= 0) {
      finish();
      return;
    }

    logger.info("SleepTimerService", "Sleep fade-out started", {
      startVolume,
      fadeSeconds: requestedSeconds,
    });

    const startedAt = Date.now();
    this.fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const fraction = Math.max(0, 1 - elapsed / fadeMs);
      fadeOptions.onFadeTick?.(Math.round(startVolume * fraction));
      if (fraction <= 0) {
        finish();
      }
    }, FADE_TICK_INTERVAL_MS);
  }

  private clearFadeInterval(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }
}

export const getSleepTimerService = (): SleepTimerService =>
  SleepTimerService.getInstance();

export function resetSleepTimerForTests(): void {
  SleepTimerService.getInstance().cancel();
}
