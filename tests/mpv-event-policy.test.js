import { expect, test } from "bun:test";

test("mpv-event-policy: suppresses pause only when advancing or after EOF", async () => {
  const { EOF_PAUSE_SUPPRESSION_MS, shouldApplyMpvPauseSync } =
    await import("../source/services/player/mpv-event-policy.ts");

  const now = 10_000;

  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      isAdvancing: true,
      eofTimestamp: 0,
      now,
    }),
  ).toBe(false);
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: now - (EOF_PAUSE_SUPPRESSION_MS - 1),
      now,
    }),
  ).toBe(false);
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: 0,
      advanceGraceUntil: now + 5000,
      now,
    }),
  ).toBe(false);
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: now - EOF_PAUSE_SUPPRESSION_MS,
      advanceGraceUntil: now - 1,
      now,
    }),
  ).toBe(true);
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: 0,
      now,
    }),
  ).toBe(true);
  expect(shouldApplyMpvPauseSync({ paused: false, eofTimestamp: 0, now })).toBe(
    true,
  );
});

test("mpv-event-policy: suppresses pause during initial loading grace period", async () => {
  const { shouldApplyMpvPauseSync } =
    await import("../source/services/player/mpv-event-policy.ts");

  const now = 10_000;

  // Pause events within the loading grace period should be suppressed
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: 0,
      loadingStartedAt: now - 500, // 500ms into loading
      now,
    }),
  ).toBe(false);

  // Pause events after the grace period should be applied
  expect(
    shouldApplyMpvPauseSync({
      paused: true,
      eofTimestamp: 0,
      loadingStartedAt: now - 5000, // 5s into loading (grace = 3s)
      now,
    }),
  ).toBe(true);

  // Unpause events should always be applied regardless of grace period
  expect(
    shouldApplyMpvPauseSync({
      paused: false,
      eofTimestamp: 0,
      loadingStartedAt: now - 500,
      now,
    }),
  ).toBe(true);
});

test("mpv-event-policy: debounces EOF advance", async () => {
  const { ADVANCE_DEBOUNCE_MS, shouldDebounceAdvance } =
    await import("../source/services/player/mpv-event-policy.ts");

  expect(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS - 1)).toBe(true);
  expect(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS)).toBe(false);
  expect(
    shouldDebounceAdvance(-ADVANCE_DEBOUNCE_MS, ADVANCE_DEBOUNCE_MS - 1),
  ).toBe(false);
});
