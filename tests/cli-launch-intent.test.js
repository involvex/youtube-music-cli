import { expect, test } from "bun:test";

import { hasCliPlaybackLaunchIntent } from "../source/utils/cli-launch-intent.ts";

test("hasCliPlaybackLaunchIntent is true for radio/discover seeds", () => {
  expect(
    hasCliPlaybackLaunchIntent({
      radioSeed: {
        type: "discovery",
        id: "discovery",
        name: "Discovery Queue",
      },
    }),
  ).toBe(true);
});

test("hasCliPlaybackLaunchIntent is true for playTrack and playPlaylist", () => {
  expect(hasCliPlaybackLaunchIntent({ playTrack: "abc" })).toBe(true);
  expect(hasCliPlaybackLaunchIntent({ playPlaylist: "PLxyz" })).toBe(true);
});

test("hasCliPlaybackLaunchIntent is false for navigation-only flags", () => {
  expect(hasCliPlaybackLaunchIntent(undefined)).toBe(false);
  expect(hasCliPlaybackLaunchIntent({})).toBe(false);
  expect(hasCliPlaybackLaunchIntent({ showSuggestions: true })).toBe(false);
  expect(hasCliPlaybackLaunchIntent({ searchQuery: "fox" })).toBe(false);
  expect(hasCliPlaybackLaunchIntent({ continue: true })).toBe(false);
});
