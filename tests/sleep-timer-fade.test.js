import { afterEach, describe, expect, test } from "bun:test";

import {
  getSleepTimerService,
  resetSleepTimerForTests,
} from "../source/services/sleep-timer/sleep-timer.service.ts";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

afterEach(() => {
  resetSleepTimerForTests();
});

describe("sleep timer fade-out", () => {
  test("expires immediately without fade options", async () => {
    const service = getSleepTimerService();
    let expired = 0;

    service.start(0.002, () => {
      expired++;
    });

    await sleep(250);
    expect(expired).toBe(1);
    expect(service.isActive()).toBe(false);
  });

  test("fades volume to zero, pauses, then restores", async () => {
    const service = getSleepTimerService();
    const ticks = [];
    const order = [];
    let restored = null;

    service.start(
      0.002,
      () => {
        order.push("expire");
      },
      {
        fadeDurationSeconds: 0.4,
        onFadeStart: () => 80,
        onFadeTick: volume => {
          ticks.push(volume);
          order.push("tick");
        },
        onFadeEnd: () => {
          restored = 80;
          order.push("restore");
        },
      },
    );

    await sleep(900);

    expect(ticks.length).toBeGreaterThan(0);
    expect(Math.min(...ticks)).toBe(0);
    const nonZeroTicks = ticks.filter(v => v > 0);
    for (let i = 1; i < nonZeroTicks.length; i++) {
      expect(nonZeroTicks[i]).toBeLessThanOrEqual(nonZeroTicks[i - 1]);
    }
    expect(order[order.length - 2]).toBe("expire");
    expect(order[order.length - 1]).toBe("restore");
    expect(restored).toBe(80);
    expect(service.isActive()).toBe(false);
    expect(service.getRemainingSeconds()).toBe(null);
  });

  test("skips fading when onFadeStart returns null", async () => {
    const service = getSleepTimerService();
    let expired = 0;
    const ticks = [];

    service.start(
      0.002,
      () => {
        expired++;
      },
      {
        fadeDurationSeconds: 5,
        onFadeStart: () => null,
        onFadeTick: volume => {
          ticks.push(volume);
        },
      },
    );

    await sleep(250);
    expect(expired).toBe(1);
    expect(ticks).toEqual([]);
  });

  test("skips fading when starting volume is zero", async () => {
    const service = getSleepTimerService();
    let expired = 0;

    service.start(
      0.002,
      () => {
        expired++;
      },
      {
        fadeDurationSeconds: 5,
        onFadeStart: () => 0,
        onFadeTick: () => {
          throw new Error("should not tick");
        },
      },
    );

    await sleep(250);
    expect(expired).toBe(1);
  });

  test("cancel during fade stops ticking and prevents expiry", async () => {
    const service = getSleepTimerService();
    let expired = 0;
    let tickCount = 0;

    service.start(
      0.002,
      () => {
        expired++;
      },
      {
        fadeDurationSeconds: 2,
        onFadeStart: () => 50,
        onFadeTick: () => {
          tickCount++;
        },
      },
    );

    await sleep(600);
    service.cancel();
    const ticksAtCancel = tickCount;

    await sleep(300);
    expect(expired).toBe(0);
    expect(tickCount).toBe(ticksAtCancel);
    expect(service.isActive()).toBe(false);
  });
});
