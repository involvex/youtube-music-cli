import { expect, test } from "bun:test";

import { computeStats } from "../source/services/stats/stats.service.ts";

function makeEntry(videoId, title, artists, duration, daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    track: {
      videoId,
      title,
      artists: artists.map(name => ({ artistId: name.toLowerCase(), name })),
      duration,
    },
    playedAt: date.toISOString(),
  };
}

test("computeStats: returns empty stats for empty history", () => {
  const stats = computeStats([]);
  expect(stats.totalPlays).toBe(0);
  expect(stats.totalListeningMinutes).toBe(0);
  expect(stats.uniqueTracks).toBe(0);
  expect(stats.uniqueArtists).toBe(0);
  expect(stats.topTracks.length).toBe(0);
  expect(stats.topArtists.length).toBe(0);
  expect(stats.currentStreak).toBe(0);
  expect(stats.longestStreak).toBe(0);
  expect(stats.firstPlayDate).toBe(null);
});

test("computeStats: counts total plays correctly", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 180, 0),
    makeEntry("v1", "Song A", ["Artist X"], 180, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 240, 1),
  ];
  const stats = computeStats(entries);
  expect(stats.totalPlays).toBe(3);
});

test("computeStats: estimates listening time from track duration", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 180, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 240, 1),
  ];
  const stats = computeStats(entries);
  expect(stats.totalListeningMinutes).toBe(7);
});

test("computeStats: uses default 240s when track duration is undefined", () => {
  const entries = [makeEntry("v1", "Song A", ["Artist X"], undefined, 0)];
  const stats = computeStats(entries);
  expect(stats.totalListeningMinutes).toBe(4);
});

test("computeStats: counts unique tracks and artists", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 200, 0),
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
  ];
  const stats = computeStats(entries);
  expect(stats.uniqueTracks).toBe(2);
  expect(stats.uniqueArtists).toBe(2);
});

test("computeStats: computes top tracks sorted by play count", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 200, 0),
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
  ];
  const stats = computeStats(entries);
  expect(stats.topTracks[0].track.videoId).toBe("v1");
  expect(stats.topTracks[0].playCount).toBe(3);
  expect(stats.topTracks[1].track.videoId).toBe("v2");
  expect(stats.topTracks[1].playCount).toBe(1);
});

test("computeStats: computes top artists with play counts", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist X"], 200, 0),
    makeEntry("v3", "Song C", ["Artist Y"], 200, 0),
  ];
  const stats = computeStats(entries);
  expect(stats.topArtists[0].name).toBe("Artist X");
  expect(stats.topArtists[0].playCount).toBe(2);
  expect(stats.topArtists[0].uniqueTracks).toBe(2);
});

test("computeStats: handles tracks with no artists", () => {
  const entry = {
    track: {
      videoId: "v1",
      title: "Unknown Artist Song",
      artists: [],
      duration: 200,
    },
    playedAt: new Date().toISOString(),
  };
  const stats = computeStats([entry]);
  expect(stats.uniqueArtists).toBe(1);
  expect(stats.topArtists[0].name).toBe("Unknown");
});

test("computeStats: computes listening by day for last 14 days", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 200, 0),
  ];
  const stats = computeStats(entries);
  expect(stats.listeningByDay.length).toBe(14);
  const today = stats.listeningByDay[stats.listeningByDay.length - 1];
  expect(today.playCount).toBe(2);
});

test("computeStats: computes current streak", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 200, 1),
    makeEntry("v3", "Song C", ["Artist Z"], 200, 2),
  ];
  const stats = computeStats(entries);
  expect(stats.currentStreak).toBe(3);
});

test("computeStats: computes longest streak", () => {
  const entries = [
    makeEntry("v1", "Song A", ["Artist X"], 200, 0),
    makeEntry("v2", "Song B", ["Artist Y"], 200, 1),
    makeEntry("v3", "Song C", ["Artist Z"], 200, 2),
    makeEntry("v4", "Song D", ["Artist W"], 200, 10),
    makeEntry("v5", "Song E", ["Artist V"], 200, 11),
  ];
  const stats = computeStats(entries);
  expect(stats.longestStreak).toBe(3);
});

test("computeStats: sets firstPlayDate to earliest entry", () => {
  const entries = [
    makeEntry("v2", "Song B", ["Artist Y"], 200, 5),
    makeEntry("v1", "Song A", ["Artist X"], 200, 10),
  ];
  const stats = computeStats(entries);
  expect(stats.firstPlayDate).toBeTruthy();
});

test("computeStats: limits top tracks and artists to 10", () => {
  const entries = [];
  for (let i = 0; i < 15; i++) {
    entries.push(makeEntry(`v${i}`, `Song ${i}`, [`Artist ${i}`], 200, 0));
  }

  const stats = computeStats(entries);
  expect(stats.topTracks.length).toBe(10);
  expect(stats.topArtists.length).toBe(10);
});
