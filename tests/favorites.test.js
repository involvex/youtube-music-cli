import { afterEach, expect, test } from "bun:test";

const __fileTeardowns = [];
afterEach(() => {
  while (__fileTeardowns.length) {
    const fn = __fileTeardowns.pop();
    fn();
  }
});

const sampleTrack = {
  videoId: "abc123",
  title: "Sample Song",
  artists: [{ artistId: "a1", name: "Artist" }],
};

test(
  "favorites: parseFavoritesFileContent accepts schema-versioned payload",
  async () => {
    const { parseFavoritesFileContent } =
      await import("../source/services/favorites/favorites.service.ts");

    const tracks = parseFavoritesFileContent({
      schemaVersion: 1,
      tracks: [sampleTrack],
      lastUpdated: "2026-01-01T00:00:00.000Z",
    });

    expect(tracks.length).toBe(1);
    expect(tracks[0]?.videoId).toBe("abc123");
  },
  { timeout: 60000 },
);

test(
  "favorites: parseFavoritesFileContent migrates legacy payloads without schemaVersion",
  async () => {
    const { parseFavoritesFileContent } =
      await import("../source/services/favorites/favorites.service.ts");

    const tracks = parseFavoritesFileContent({
      tracks: [sampleTrack],
    });

    expect(tracks.length).toBe(1);
  },
  { timeout: 60000 },
);

test(
  "favorites: parseFavoritesFileContent accepts bare track arrays",
  async () => {
    const { parseFavoritesFileContent } =
      await import("../source/services/favorites/favorites.service.ts");

    const tracks = parseFavoritesFileContent([sampleTrack]);
    expect(tracks.length).toBe(1);
  },
  { timeout: 60000 },
);

test(
  "favorites: parseFavoritesFileContent filters invalid entries",
  async () => {
    const { parseFavoritesFileContent } =
      await import("../source/services/favorites/favorites.service.ts");

    const tracks = parseFavoritesFileContent({
      schemaVersion: 1,
      tracks: [{ videoId: "x" }, sampleTrack, null, "bad"],
    });
    expect(tracks.length).toBe(1);
  },
  { timeout: 60000 },
);

test(
  "favorites: saveFavorites refuses empty overwrite of populated file",
  async () => {
    const { mkdtempSync, readFileSync, rmSync, writeFileSync } =
      await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const {
      loadFavorites,
      parseFavoritesFileContent,
      saveFavorites,
      setFavoritesFilePathForTests,
    } = await import("../source/services/favorites/favorites.service.ts");

    const tempDir = mkdtempSync(join(tmpdir(), "ymc-favorites-save-test-"));
    const favoritesFile = join(tempDir, "favorites.json");
    setFavoritesFilePathForTests(favoritesFile);
    __fileTeardowns.push(() => {
      setFavoritesFilePathForTests(null);
      rmSync(tempDir, { force: true, recursive: true });
    });

    writeFileSync(
      favoritesFile,
      JSON.stringify({ schemaVersion: 1, tracks: [sampleTrack] }, null, 2),
      "utf8",
    );

    await saveFavorites([]);
    const persisted = parseFavoritesFileContent(
      JSON.parse(readFileSync(favoritesFile, "utf8")),
    );
    expect(persisted.length).toBe(1);

    await saveFavorites([], { allowEmptyOverwrite: true });
    const cleared = await loadFavorites();
    expect(cleared.length).toBe(0);
  },
  { timeout: 60000 },
);
