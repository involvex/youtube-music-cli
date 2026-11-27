import { expect, test } from "bun:test";

import { BUILTIN_LIVE_STREAMS } from "../source/data/builtin-live-streams.ts";
import {
  closeLiveStreamsOverlay,
  createLiveStreamsOverlayState,
  getSelectedLiveStream,
  handleLiveStreamsOverlayInput,
  openLiveStreamsOverlay,
} from "../source/immersive/ui/live-streams-overlay.ts";
import {
  getLiveStreamById,
  getLiveStreams,
  toRadioStation,
} from "../source/services/live-streams/live-streams.service.ts";

test("builtin live streams have unique ids and http(s) URLs", () => {
  const streams = getLiveStreams();
  const ids = new Set();

  expect(streams.length > 0).toBe(true);
  expect(streams.length).toBe(BUILTIN_LIVE_STREAMS.length);

  for (const entry of streams) {
    expect(ids.has(entry.id), `duplicate id: ${entry.id}`).toBe(false);
    ids.add(entry.id);
    expect(
      entry.url.startsWith("http://") || entry.url.startsWith("https://"),
      `bad url for ${entry.id}`,
    ).toBe(true);
    expect(entry.name.length > 0).toBe(true);
    expect(entry.tags.length > 0).toBe(true);
  }

  const names = streams.map(entry => entry.name);
  const sorted = [...names].toSorted((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);
});

test("getLiveStreamById returns known entries", () => {
  expect(getLiveStreamById("claude-live")?.name).toBe("Claude — Live");
  expect(getLiveStreamById("anomaly-fm")?.url).toBe("https://anomaly.fm/radio");
  expect(getLiveStreamById("missing")).toBe(undefined);
});

test("toRadioStation maps live catalog entry for PLAY_STREAM", () => {
  const entry = getLiveStreamById("coding-synth");
  expect(entry).toBeTruthy();
  if (!entry) {
    return;
  }

  const station = toRadioStation(entry);

  expect(station.id).toBe(entry.id);
  expect(station.name).toBe(entry.name);
  expect(station.streamUrl).toBe(entry.url);
  expect(station.genre).toBe(entry.tags[0]);
  expect(station.source).toBe("live-catalog");
});

test("live streams overlay open/close and selection", () => {
  const state = createLiveStreamsOverlayState();
  expect(state.active).toBe(false);

  openLiveStreamsOverlay(state);
  expect(state.active).toBe(true);
  expect(state.selectedIndex).toBe(0);
  expect(getSelectedLiveStream(state)).toBeTruthy();

  const down = handleLiveStreamsOverlayInput(state, "down");
  expect(down).toBe("none");
  expect(state.selectedIndex).toBe(1);

  const play = handleLiveStreamsOverlayInput(state, "enter");
  expect(play).toBe("play");

  closeLiveStreamsOverlay(state);
  expect(state.active).toBe(false);
  expect(state.selectedIndex).toBe(0);
});

test("live streams overlay escape closes", () => {
  const state = createLiveStreamsOverlayState();
  openLiveStreamsOverlay(state);
  expect(handleLiveStreamsOverlayInput(state, "escape")).toBe("close");
  expect(state.active).toBe(false);
});
