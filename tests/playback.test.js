import { expect, test } from "bun:test";

test("player service exposes singleton without starting mpv", async () => {
  const { getPlayerService } =
    await import("../source/services/player/player.service.ts");

  const a = getPlayerService();
  const b = getPlayerService();

  expect(a).toBe(b);

  // Should allow pause/resume/stop without crashing when mpv is not running
  expect(() => {
    a.pause();
    a.resume();
    a.stop();
  }).not.toThrow();
});

// ── Shuffle reducer tests ─────────────────────────────────────────────────────

/** Build a minimal PlayerState for reducer tests */
function makeState(overrides = {}) {
  return {
    currentTrack: null,
    isPlaying: false,
    volume: 70,
    speed: 1.0,
    progress: 0,
    duration: 0,
    queue: [],
    queuePosition: 0,
    playbackOrder: null,
    repeat: "off",
    shuffle: false,
    autoplay: false,
    isLoading: false,
    error: null,
    playRequestId: 0,
    explicitQueueLength: 0,
    ...overrides,
  };
}

/** Build a minimal Track object */
function makeTrack(id) {
  return { videoId: id, title: `Track ${id}`, artists: [], duration: 200 };
}

test("TOGGLE_SHUFFLE flips shuffle from false to true", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: false,
    queue: tracks,
    queuePosition: 1,
    currentTrack: tracks[1],
  });
  const next = playerReducer(state, { category: "TOGGLE_SHUFFLE" });
  expect(next.shuffle).toBe(true);
  expect(next.playbackOrder).toBeTruthy();
  expect(next.playbackOrder?.[0]).toBe(1);
});

test("TOGGLE_SHUFFLE flips shuffle from true to false", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const state = makeState({
    shuffle: true,
    playbackOrder: [0, 2, 1],
    queue: ["a", "b", "c"].map(makeTrack),
  });
  const next = playerReducer(state, { category: "TOGGLE_SHUFFLE" });
  expect(next.shuffle).toBe(false);
  expect(next.playbackOrder).toBe(null);
});

test("PLAY_NEXT inserts track after current queue position", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const a = makeTrack("a");
  const b = makeTrack("b");
  const c = makeTrack("c");
  const state = makeState({
    queue: [a, b],
    queuePosition: 0,
    currentTrack: a,
    explicitQueueLength: 2,
  });
  const next = playerReducer(state, { category: "PLAY_NEXT", track: c });
  expect(next.queue.map(track => track.videoId)).toEqual(["a", "c", "b"]);
  expect(next.queuePosition).toBe(0);
  expect(next.explicitQueueLength).toBe(3);
});

test("ADD_TO_QUEUE appends and bumps explicitQueueLength", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const a = makeTrack("a");
  const b = makeTrack("b");
  const state = makeState({
    queue: [a],
    queuePosition: 0,
    explicitQueueLength: 1,
  });
  const next = playerReducer(state, { category: "ADD_TO_QUEUE", track: b });
  expect(next.queue.map(track => track.videoId)).toEqual(["a", "b"]);
  expect(next.explicitQueueLength).toBe(2);
});

test("NEXT with shuffle=true and single-track queue falls through sequentially (no-op)", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const track = makeTrack("a");
  const state = makeState({
    shuffle: true,
    queue: [track],
    queuePosition: 0,
    currentTrack: track,
    repeat: "off",
  });
  // Only 1 track — sequential logic applies, nextPosition (1) >= queue.length (1) → return state
  const next = playerReducer(state, { category: "NEXT" });
  expect(next.queuePosition).toBe(0); // position unchanged
});

test("NEXT with shuffle follows playbackOrder and stops at end", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: true,
    autoplay: false,
    repeat: "off",
    queue: tracks,
    queuePosition: 1,
    currentTrack: tracks[1],
    playbackOrder: [1, 0, 2],
  });

  const mid = playerReducer(state, { category: "NEXT" });
  expect(mid.queuePosition).toBe(0);
  expect(mid.currentTrack?.videoId).toBe("a");

  const last = playerReducer(mid, { category: "NEXT" });
  expect(last.queuePosition).toBe(2);
  expect(last.currentTrack?.videoId).toBe("c");

  const stopped = playerReducer(last, { category: "NEXT" });
  expect(stopped.queuePosition).toBe(2);
  expect(stopped.playRequestId).toBe(last.playRequestId);
});

test("NEXT with shuffle=false uses sequential order", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: false,
    queue: tracks,
    queuePosition: 1,
    currentTrack: tracks[1],
  });
  const next = playerReducer(state, { category: "NEXT" });
  expect(next.queuePosition).toBe(2);
  expect(next.currentTrack?.videoId).toBe("c");
});

test("PREVIOUS follows playbackOrder when shuffle is on", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: true,
    queue: tracks,
    queuePosition: 2,
    currentTrack: tracks[2],
    progress: 0,
    playbackOrder: [0, 2, 1],
  });
  const next = playerReducer(state, { category: "PREVIOUS" });
  expect(next.queuePosition).toBe(0);
  expect(next.currentTrack?.videoId).toBe("a");
});

test("NEXT with shuffle + repeat=all wraps playbackOrder", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: true,
    autoplay: false,
    queue: tracks,
    queuePosition: 1,
    currentTrack: tracks[1],
    repeat: "all",
    playbackOrder: [0, 2, 1],
  });
  const next = playerReducer(state, { category: "NEXT" });
  expect(next.queuePosition).toBe(0);
  expect(next.currentTrack?.videoId).toBe("a");
});

test("NEXT with repeat=all and shuffle off loops to start", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const tracks = ["a", "b", "c"].map(makeTrack);
  const state = makeState({
    shuffle: false,
    autoplay: false,
    repeat: "all",
    queue: tracks,
    queuePosition: 2,
    currentTrack: tracks[2],
  });
  const next = playerReducer(state, { category: "NEXT" });
  expect(next.queuePosition).toBe(0);
  expect(next.currentTrack?.videoId).toBe("a");
});

// ── RESTORE_STATE / --continue tests ──────────────────────────────────────────

function restoreAction(overrides = {}) {
  const track = makeTrack("resume-1");
  return {
    category: "RESTORE_STATE",
    currentTrack: track,
    queue: [track],
    queuePosition: 0,
    progress: 42,
    volume: 70,
    shuffle: false,
    repeat: "off",
    autoplay: true,
    ...overrides,
  };
}

test("RESTORE_STATE with autoplay true but no startPlayback stays paused", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const next = playerReducer(makeState(), restoreAction({ autoplay: true }));
  expect(next.isPlaying).toBe(false);
  expect(next.autoplay).toBe(true);
  expect(next.currentTrack?.videoId).toBe("resume-1");
});

test("RESTORE_STATE with startPlayback true begins playback", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const next = playerReducer(
    makeState(),
    restoreAction({ startPlayback: true, autoplay: false }),
  );
  expect(next.isPlaying).toBe(true);
  expect(next.autoplay).toBe(false);
  expect(next.currentTrack?.videoId).toBe("resume-1");
});

test("RESTORE_STATE with startPlayback true but no media stays paused", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const next = playerReducer(
    makeState(),
    restoreAction({
      startPlayback: true,
      currentTrack: null,
      queue: [],
      currentStation: null,
    }),
  );
  expect(next.isPlaying).toBe(false);
});

test("discord rpc service no-ops when disabled", async () => {
  const { getDiscordRpcService } =
    await import("../source/services/discord/discord-rpc.service.ts");
  const rpc = getDiscordRpcService();

  rpc.setEnabled(false);
  await rpc.connect();
  await rpc.updateActivity({
    title: "Song",
    artist: "Artist",
    startTimestamp: Date.now(),
  });
  await rpc.clearActivity();

  expect(true).toBe(true);
});
