import { expect, test } from "bun:test";

test("formatStatsShareCard includes totals and GitHub URL", async () => {
  const { formatStatsShareCard } =
    await import("../source/services/stats/stats-share.ts");

  const card = formatStatsShareCard({
    totalPlays: 1234,
    totalListeningMinutes: 42 * 60,
    uniqueTracks: 89,
    uniqueArtists: 40,
    topTracks: [
      {
        track: {
          videoId: "a",
          title: "Song A",
          artists: [{ name: "Artist X", id: "x" }],
          duration: 180,
          thumbnails: [],
        },
        playCount: 42,
        totalDurationSeconds: 180 * 42,
      },
    ],
    topArtists: [{ name: "Artist X", playCount: 120, uniqueTracks: 10 }],
    listeningByDay: [],
    currentStreak: 5,
    longestStreak: 12,
    firstPlayDate: "2026-01-01",
    averageDailyMinutes: 60,
  });

  expect(card.includes(`Total plays: ${Number(1234).toLocaleString()}`)).toBe(
    true,
  );
  expect(card.includes("Listening time: ~42h")).toBe(true);
  expect(card.includes("Song A — Artist X (42)")).toBe(true);
  expect(card.includes("Artist X (120)")).toBe(true);

  // Assert the exact repo URL line rather than a raw substring match, since
  // naive `string.includes(url)` checks can be spoofed by embedding the
  // expected URL inside an attacker-controlled one (CodeQL
  // js/incomplete-url-substring-sanitization).
  const lines = card.split("\n");
  expect(lines).toContain(
    "Get your stats with youtube-music-cli — https://github.com/involvex/youtube-music-cli",
  );

  expect(card.includes("youtube-musicc")).toBe(false);
});
