import { expect, test } from "bun:test";

const makeTrack = id => ({
  videoId: id,
  title: `Track ${id}`,
  artists: [{ artistId: "a1", name: "Artist" }],
});

test("radio: shuffleTracks returns a permutation without mutating input", async () => {
  const { shuffleTracks } =
    await import("../source/services/radio/local-playlist-seed.ts");

  const original = Array.from({ length: 64 }, (_, i) => makeTrack(String(i)));
  const snapshot = [...original];
  const shuffled = shuffleTracks(original);

  expect(shuffled.length).toBe(64);
  const sortedIds = shuffled
    .map(track => track.videoId)
    .sort((a, b) => Number(a) - Number(b));
  expect(sortedIds).toEqual(Array.from({ length: 64 }, (_, i) => String(i)));
  // original array untouched
  expect(original).toEqual(snapshot);
});

test("radio: shuffleTracks changes order on large inputs", async () => {
  const { shuffleTracks } =
    await import("../source/services/radio/local-playlist-seed.ts");

  const original = Array.from({ length: 100 }, (_, i) => makeTrack(String(i)));
  let differs = false;
  for (let attempt = 0; attempt < 20 && !differs; attempt++) {
    const shuffled = shuffleTracks(original);
    differs = shuffled.some((track, i) => track !== original[i]);
  }
  expect(differs).toBe(true);
});

test("radio: shuffleTracks preserves empty and single-item lists", async () => {
  const { shuffleTracks } =
    await import("../source/services/radio/local-playlist-seed.ts");

  expect(shuffleTracks([])).toEqual([]);
  const single = [makeTrack("only")];
  const result = shuffleTracks(single);
  expect(result.length).toBe(1);
  expect(result[0]?.videoId).toBe("only");
});

test("radio: findLocalPlaylistTracks finds playlist by id and shuffles", async () => {
  const { findLocalPlaylistTracks } =
    await import("../source/services/radio/local-playlist-seed.ts");

  const playlists = [
    { playlistId: "p1", tracks: [makeTrack("a"), makeTrack("b")] },
    {
      playlistId: "p2",
      tracks: [makeTrack("x"), makeTrack("y"), makeTrack("z")],
    },
  ];

  const picked = findLocalPlaylistTracks(playlists, "p2");
  expect(picked).not.toBeNull();
  expect(picked?.length).toBe(3);
  expect([...picked].map(t => t.videoId).sort()).toEqual(["x", "y", "z"]);

  expect(findLocalPlaylistTracks(playlists, "missing")).toBeNull();
  expect(findLocalPlaylistTracks([], "p1")).toBeNull();
});

test("radio: findLocalPlaylistTracks tolerates missing tracks array", async () => {
  const { findLocalPlaylistTracks } =
    await import("../source/services/radio/local-playlist-seed.ts");

  const playlists = [{ playlistId: "empty", tracks: undefined }];
  const picked = findLocalPlaylistTracks(playlists, "empty");
  expect(picked).toEqual([]);
});
