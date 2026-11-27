import { expect, test } from "bun:test";

test("buildShuffledOrder keeps startAt at front", async () => {
  const { buildShuffledOrder } =
    await import("../source/services/player/playback-order.ts");
  const order = buildShuffledOrder(5, 3);
  expect(order[0]).toBe(3);
  expect(order.toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
});

test("hasNextInPlaybackOrder is false at shuffle end without loop", async () => {
  const { hasNextInPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  expect(
    hasNextInPlaybackOrder({
      queueLength: 3,
      queueIndex: 1,
      playbackOrder: [0, 2, 1],
      shuffle: true,
      shouldLoop: false,
    }),
  ).toBe(false);
});

test("hasNextInPlaybackOrder is true when shouldLoop", async () => {
  const { hasNextInPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  expect(
    hasNextInPlaybackOrder({
      queueLength: 3,
      queueIndex: 1,
      playbackOrder: [0, 2, 1],
      shuffle: true,
      shouldLoop: true,
    }),
  ).toBe(true);
});

test("advanceInPlaybackOrder stops at end without loop", async () => {
  const { advanceInPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  const result = advanceInPlaybackOrder({
    queueLength: 3,
    queueIndex: 1,
    playbackOrder: [0, 2, 1],
    shuffle: true,
    shouldLoop: false,
  });
  expect(result.advanced).toBe(false);
  expect(result.queueIndex).toBe(1);
});

test("advanceInPlaybackOrder wraps with shouldLoop", async () => {
  const { advanceInPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  const result = advanceInPlaybackOrder({
    queueLength: 3,
    queueIndex: 1,
    playbackOrder: [0, 2, 1],
    shuffle: true,
    shouldLoop: true,
  });
  expect(result.advanced).toBe(true);
  expect(result.queueIndex).toBe(0);
});

test("appendIndexToPlaybackOrder appends without reshuffle", async () => {
  const { appendIndexToPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  const next = appendIndexToPlaybackOrder([1, 0, 2], 3, true, 4, 1);
  expect(next).toEqual([1, 0, 2, 3]);
});

test("removeIndexFromPlaybackOrder remaps higher indices", async () => {
  const { removeIndexFromPlaybackOrder } =
    await import("../source/services/player/playback-order.ts");
  expect(removeIndexFromPlaybackOrder([0, 2, 1, 3], 1)).toEqual([0, 1, 2]);
});

test("matrix theme dim is gray for inactive contrast", async () => {
  const { BUILTIN_THEMES } = await import("../source/config/themes.config.ts");
  expect(BUILTIN_THEMES.matrix.colors.dim).toBe("gray");
  expect(BUILTIN_THEMES.matrix.colors.accent).toBe("greenBright");
});
