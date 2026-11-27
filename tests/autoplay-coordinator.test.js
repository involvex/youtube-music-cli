import { expect, test } from "bun:test";

test("shouldPrefetchAutoplay allows repeat-all and shuffle when autoplay on", async () => {
  const { shouldPrefetchAutoplay } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const base = {
    autoplay: true,
    isPlaying: true,
    repeat: "off",
    shuffle: false,
    queueLength: 3,
    queuePosition: 2,
    currentTrackVideoId: "seed",
    radioIsActive: false,
    explicitQueueLength: 3,
  };

  expect(
    shouldPrefetchAutoplay(base, {
      fetchedForVideoId: null,
      isFetching: false,
    }),
  ).toBe(true);

  expect(
    shouldPrefetchAutoplay(
      { ...base, repeat: "all" },
      { fetchedForVideoId: null, isFetching: false },
    ),
  ).toBe(true);

  expect(
    shouldPrefetchAutoplay(
      { ...base, shuffle: true, queueLength: 4, explicitQueueLength: 4 },
      { fetchedForVideoId: null, isFetching: false },
    ),
  ).toBe(true);

  expect(
    shouldPrefetchAutoplay(
      { ...base, autoplay: false },
      { fetchedForVideoId: null, isFetching: false },
    ),
  ).toBe(false);

  expect(
    shouldPrefetchAutoplay(
      { ...base, repeat: "one" },
      { fetchedForVideoId: null, isFetching: false },
    ),
  ).toBe(false);

  expect(
    shouldPrefetchAutoplay(
      { ...base, queuePosition: 0 },
      {
        fetchedForVideoId: "seed",
        isFetching: false,
      },
    ),
  ).toBe(false);

  expect(
    shouldPrefetchAutoplay(base, {
      fetchedForVideoId: "seed",
      isFetching: false,
    }),
  ).toBe(true);

  expect(
    shouldPrefetchAutoplay(
      { ...base, isPlaying: false },
      {
        fetchedForVideoId: "seed",
        isFetching: false,
        waitingAtQueueEnd: true,
      },
    ),
  ).toBe(true);
});

test("shouldLoopExplicitQueue defers repeat-all when autoplay on", async () => {
  const { shouldLoopExplicitQueue } =
    await import("../source/services/player/autoplay-coordinator.ts");

  expect(shouldLoopExplicitQueue({ autoplay: true, repeat: "all" })).toBe(
    false,
  );
  expect(shouldLoopExplicitQueue({ autoplay: false, repeat: "all" })).toBe(
    true,
  );
  expect(shouldLoopExplicitQueue({ autoplay: false, repeat: "off" })).toBe(
    false,
  );
});

test("buildAutoplaySeedPlan rotates through session history", async () => {
  const { buildAutoplaySeedPlan } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const { seeds, nextCursor } = buildAutoplaySeedPlan("current", ["a", "b"], 0);
  expect(seeds).toEqual(["current", "a", "b"]);
  expect(nextCursor).toBe(0);

  const second = buildAutoplaySeedPlan("current", ["a", "b"], nextCursor);
  expect(second.seeds.includes("current")).toBe(true);
});

test("mergeSuggestionTracksForAutoplay dedupes recent plays and queue", async () => {
  const { mergeSuggestionTracksForAutoplay } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const recent = new Set(["a"]);
  const queue = new Set(["b"]);
  const merged = mergeSuggestionTracksForAutoplay(recent, queue, [
    { videoId: "a", title: "A", artists: [] },
    { videoId: "b", title: "B", artists: [] },
    { videoId: "c", title: "C", artists: [] },
  ]);

  expect(merged.length).toBe(1);
  expect(merged[0]?.videoId).toBe("c");
});

test("shouldResumeAfterPrefetch triggers near end without isPlaying check", async () => {
  const { shouldResumeAfterPrefetch } =
    await import("../source/services/player/autoplay-coordinator.ts");

  expect(shouldResumeAfterPrefetch(false, 98, 100)).toBe(false);
  expect(shouldResumeAfterPrefetch(true, 96, 100)).toBe(true);
  expect(shouldResumeAfterPrefetch(true, 0, 0)).toBe(true);
  expect(shouldResumeAfterPrefetch(true, 10, 100)).toBe(false);
});

test("mergeSuggestionTracks dedupes against existing queue ids", async () => {
  const { mergeSuggestionTracks } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const existing = new Set(["a", "b"]);
  const merged = mergeSuggestionTracks(existing, [
    { videoId: "a", title: "A", artists: [] },
    { videoId: "c", title: "C", artists: [] },
    { videoId: "c", title: "C duplicate", artists: [] },
  ]);

  expect(merged.length).toBe(1);
  expect(merged[0]?.videoId).toBe("c");
});

test("recordSessionTrack keeps recent unique ids", async () => {
  const { recordSessionTrack, SESSION_HISTORY_MAX } =
    await import("../source/services/player/autoplay-coordinator.ts");

  let history = [];
  history = recordSessionTrack(history, "a");
  history = recordSessionTrack(history, "b");
  history = recordSessionTrack(history, "a");

  expect(history).toEqual(["b", "a"]);

  for (let i = 0; i < SESSION_HISTORY_MAX + 5; i++) {
    history = recordSessionTrack(history, `track-${i}`);
  }
  expect(history.length).toBe(SESSION_HISTORY_MAX);
});

test("pickHistoryFallbackSeed rotates through session history", async () => {
  const { pickHistoryFallbackSeed } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const history = ["a", "b", "c"];
  const exclude = new Set(["a"]);

  const first = pickHistoryFallbackSeed(history, 0, exclude);
  expect(first.seed).toBe("b");

  const second = pickHistoryFallbackSeed(history, first.nextCursor, exclude);
  expect(second.seed).toBe("c");
});

test("shouldDeferPauseAtQueueEnd waits while autoplay is enabled or fetching", async () => {
  const { shouldDeferPauseAtQueueEnd } =
    await import("../source/services/player/autoplay-coordinator.ts");

  expect(shouldDeferPauseAtQueueEnd(true, false)).toBe(true);
  expect(shouldDeferPauseAtQueueEnd(false, true)).toBe(true);
  expect(shouldDeferPauseAtQueueEnd(false, false)).toBe(false);
});
