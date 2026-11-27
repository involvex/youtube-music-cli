import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BUILTIN_RADIO_STATIONS } from "../source/data/builtin-radio-stations.ts";
import { buildModeStatusLine } from "../source/immersive/ui/layout.ts";
import {
  applyRadioStationList,
  beginRadioSearch,
  createRadioOverlayState,
  cycleRadioCountry,
  getRadioOverlayStations,
  getSelectedStation,
  handleRadioOverlayInput,
  openRadioOverlay,
} from "../source/immersive/ui/radio-overlay.ts";
import {
  cacheKeyForBrowse,
  getCachedStations,
  setCachedStations,
  setRadioBrowserCachePathForTests,
} from "../source/services/radio-stations/radio-browser-cache.ts";
import { mapApiStationToRadioStation } from "../source/services/radio-stations/radio-browser.service.ts";
import {
  getRadioFavorites,
  isRadioFavorite,
  resetRadioFavoritesForTests,
  setRadioFavoritesPathForTests,
  toggleRadioFavorite,
} from "../source/services/radio-stations/radio-favorites.service.ts";
import {
  flattenRadioStations,
  getBuiltinStations,
  getStationById,
  playStationStream,
} from "../source/services/radio-stations/radio-stations.service.ts";
import { parseStreamMetadata } from "../source/services/radio-stations/stream-metadata.ts";

afterEach(() => {
  setRadioBrowserCachePathForTests(null);
  setRadioFavoritesPathForTests(null);
  resetRadioFavoritesForTests();
});

test("builtin radio stations have unique ids and http stream URLs", () => {
  const stations = getBuiltinStations();
  const ids = new Set();

  for (const station of stations) {
    expect(ids.has(station.id), `duplicate id: ${station.id}`).toBe(false);
    ids.add(station.id);
    expect(station.streamUrl.startsWith("http")).toBe(true);
    expect(station.name.length > 0).toBe(true);
    expect(station.source).toBe("builtin");
  }

  expect(stations.length).toBe(BUILTIN_RADIO_STATIONS.length);
  expect(getStationById("rockland-kl")?.name).toBe(
    "Rockland Radio — Kaiserslautern",
  );
  expect(getStationById("swr3")).toBeTruthy();
});

test("mapApiStationToRadioStation maps radio-browser rows", () => {
  const mapped = mapApiStationToRadioStation({
    stationuuid: "05eb782e-e789-4573-9771-27bfa417655c",
    name: "psyradio * fm - progressive",
    url: "http://streamer.psyradio.org:8010/;listen.mp3",
    url_resolved: "http://streamer.psyradio.org:8010/;listen.mp3",
    tags: "progressive,psychedelic,psytrance",
    country: "Germany",
    countrycode: "DE",
    lastcheckok: 1,
  });

  expect(mapped).toBeTruthy();
  expect(mapped?.id).toBe("rb-05eb782e-e789-4573-9771-27bfa417655c");
  expect(mapped?.source).toBe("radio-browser");
  expect(mapped?.stationuuid).toBe("05eb782e-e789-4573-9771-27bfa417655c");
  expect(mapped?.region).toBe("Germany");
  expect(mapped?.genre).toBe("progressive");
  expect(mapped?.streamUrl.startsWith("http")).toBe(true);
});

test("mapApiStationToRadioStation rejects broken or incomplete rows", () => {
  expect(
    mapApiStationToRadioStation({
      stationuuid: "x",
      name: "Broken",
      url: "http://example.com/stream",
      lastcheckok: 0,
    }),
  ).toBe(null);
  expect(
    mapApiStationToRadioStation({
      stationuuid: "x",
      name: "No url",
      lastcheckok: 1,
    }),
  ).toBe(null);
});

test("parseStreamMetadata splits artist and title from icy-title", () => {
  const parsed = parseStreamMetadata({
    "icy-title": "Crunch - Sponge",
    "icy-name": "Limbik Frequencies",
  });

  expect(parsed).toEqual({
    artist: "Crunch",
    title: "Sponge",
    raw: "Crunch - Sponge",
  });
});

test("parseStreamMetadata falls back to raw title without separator", () => {
  const parsed = parseStreamMetadata({
    StreamTitle: "Just A Track Name",
  });

  expect(parsed).toEqual({
    artist: null,
    title: "Just A Track Name",
    raw: "Just A Track Name",
  });
});

test("parseStreamMetadata returns null when no title tags", () => {
  expect(parseStreamMetadata({ "icy-name": "Station Only" })).toBe(null);
  expect(parseStreamMetadata(null)).toBe(null);
});

test("radio browser cache stores and returns browse results", () => {
  const dir = mkdtempSync(join(tmpdir(), "ymc-radio-cache-"));
  setRadioBrowserCachePathForTests(join(dir, "cache.json"));

  const key = cacheKeyForBrowse("DE", 50);
  const stations = [
    mapApiStationToRadioStation({
      stationuuid: "cache-1",
      name: "Cached FM",
      url: "https://example.com/stream",
      lastcheckok: 1,
    }),
  ].filter(Boolean);

  setCachedStations(key, stations);
  const hit = getCachedStations(key);
  expect(hit).toBeTruthy();
  expect(hit?.stale).toBe(false);
  expect(hit?.stations[0]?.name).toBe("Cached FM");

  rmSync(dir, { recursive: true, force: true });
});

test("radio favorites toggle persists stations", () => {
  const dir = mkdtempSync(join(tmpdir(), "ymc-radio-fav-"));
  setRadioFavoritesPathForTests(join(dir, "fav.json"));
  resetRadioFavoritesForTests();

  const station = getStationById("swr3");
  expect(station).toBeTruthy();

  expect(toggleRadioFavorite(station)).toBe(true);
  expect(isRadioFavorite("swr3")).toBe(true);
  expect(getRadioFavorites().length).toBe(1);

  expect(toggleRadioFavorite(station)).toBe(false);
  expect(isRadioFavorite("swr3")).toBe(false);
  expect(getRadioFavorites().length).toBe(0);

  rmSync(dir, { recursive: true, force: true });
});

test("PLAY_STREAM reducer enters stream playback mode and clears metadata", async () => {
  const { playerReducer } = await import("../source/stores/player.store.tsx");
  const station = getStationById("rockland-kl");
  expect(station).toBeTruthy();

  const state = {
    currentTrack: { videoId: "abc", title: "Song", artists: [] },
    isPlaying: true,
    volume: 70,
    speed: 1,
    progress: 10,
    duration: 200,
    queue: [{ videoId: "abc", title: "Song", artists: [] }],
    queuePosition: 0,
    repeat: "off",
    shuffle: false,
    autoplay: true,
    isLoading: false,
    error: null,
    playRequestId: 0,
    abLoop: { a: null, b: null },
    subtitle: null,
    radioIsActive: true,
    radioSeed: { type: "track", id: "abc", name: "Song" },
    explicitQueueLength: 1,
    playbackMode: "youtube",
    currentStation: null,
    streamNowPlaying: {
      artist: "Old",
      title: "Meta",
      raw: "Old - Meta",
    },
  };

  const next = playerReducer(state, { category: "PLAY_STREAM", station });

  expect(next.playbackMode).toBe("stream");
  expect(next.currentStation).toBe(station);
  expect(next.currentTrack).toBe(null);
  expect(next.queue).toEqual([]);
  expect(next.autoplay).toBe(false);
  expect(next.radioIsActive).toBe(false);
  expect(next.radioSeed).toBe(null);
  expect(next.isPlaying).toBe(true);
  expect(next.streamNowPlaying).toBe(null);

  const withMeta = playerReducer(next, {
    category: "SET_STREAM_NOW_PLAYING",
    streamNowPlaying: { artist: "A", title: "B", raw: "A - B" },
  });
  expect(withMeta.streamNowPlaying).toEqual({
    artist: "A",
    title: "B",
    raw: "A - B",
  });
});

test("playStationStream passes direct stream URL and station id to mpv", async () => {
  const { getPlayerService } =
    await import("../source/services/player/player.service.ts");
  const player = getPlayerService();
  const station = getStationById("rockland-kl");
  expect(station).toBeTruthy();

  const originalPlay = player.play.bind(player);
  let capturedUrl = "";
  let capturedTrackId = "";

  player.play = async (url, options) => {
    capturedUrl = url;
    capturedTrackId = options?.trackId ?? "";
  };

  try {
    await playStationStream(station);
    expect(capturedUrl).toBe(station.streamUrl);
    expect(capturedTrackId).toBe(station.id);
  } finally {
    player.play = originalPlay;
  }
});

test("flattenRadioStations keeps favorites then builtins before remote", () => {
  const builtins = getBuiltinStations();
  const remote = [
    mapApiStationToRadioStation({
      stationuuid: "aaa",
      name: "Remote One",
      url: "https://example.com/a",
      lastcheckok: 1,
    }),
  ].filter(Boolean);

  const flat = flattenRadioStations({
    favorites: [builtins[6]],
    builtins,
    remote,
  });
  expect(flat[0]?.id).toBe("swr3");
  expect(flat.at(-1)?.source).toBe("radio-browser");
});

test("radio overlay selects and plays a station", () => {
  const overlay = createRadioOverlayState();
  openRadioOverlay(overlay);
  applyRadioStationList(
    overlay,
    {
      favorites: [],
      builtins: getBuiltinStations(),
      remote: [],
    },
    "8 local stations",
  );
  expect(overlay.active).toBe(true);

  const stations = getRadioOverlayStations(overlay);
  for (let i = 0; i < stations.length - 1; i++) {
    handleRadioOverlayInput(overlay, "down", stations.length);
  }

  const action = handleRadioOverlayInput(overlay, "enter", stations.length);
  expect(action).toBe("play");
  expect(getSelectedStation(overlay)?.id).toBe(stations.at(-1)?.id);
});

test("radio overlay search, random, and country actions", () => {
  const overlay = createRadioOverlayState();
  openRadioOverlay(overlay);
  applyRadioStationList(
    overlay,
    { favorites: [], builtins: getBuiltinStations(), remote: [] },
    "ready",
  );

  expect(handleRadioOverlayInput(overlay, "r", 1)).toBe("random");
  expect(handleRadioOverlayInput(overlay, "c", 1)).toBe("cycle-country");
  expect(overlay.countryIndex).toBe(1);

  beginRadioSearch(overlay);
  expect(overlay.phase).toBe("search");
  handleRadioOverlayInput(overlay, "s", 0);
  handleRadioOverlayInput(overlay, "w", 0);
  handleRadioOverlayInput(overlay, "r", 0);
  expect(overlay.searchQuery).toBe("swr");
  expect(handleRadioOverlayInput(overlay, "enter", 0)).toBe("search");

  cycleRadioCountry(overlay);
});

test("buildModeStatusLine shows LIVE for stream playback", () => {
  const line = buildModeStatusLine({
    shuffle: false,
    repeat: "off",
    isDiscoMode: false,
    autoplay: false,
    playbackMode: "stream",
    currentStation: { name: "Rockland Radio — Kaiserslautern" },
  });

  expect(line.includes("LIVE")).toBe(true);
  expect(line.includes("Rockland")).toBe(true);
});

test("shouldPrefetchAutoplay is false at stream mode queue end", async () => {
  const { shouldPrefetchAutoplay } =
    await import("../source/services/player/autoplay-coordinator.ts");

  const shouldFetch = shouldPrefetchAutoplay(
    {
      autoplay: false,
      isPlaying: true,
      repeat: "off",
      shuffle: false,
      queueLength: 0,
      queuePosition: 0,
      currentTrackVideoId: null,
      radioIsActive: false,
      explicitQueueLength: 0,
    },
    {
      fetchedForVideoId: null,
      isFetching: false,
      waitingAtQueueEnd: false,
    },
  );

  expect(shouldFetch).toBe(false);
});
