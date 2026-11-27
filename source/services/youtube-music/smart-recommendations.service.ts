// Smart Recommendations V2 - scoring candidates based on listening history & stats with artist diversity capping
import { loadHistory } from "../../services/history/history.service.ts";
import { logger } from "../../services/logger/logger.service.ts";
import { computeStats } from "../../services/stats/stats.service.ts";
import { getMusicService } from "../../services/youtube-music/api.ts";
import type { Track } from "../../types/youtube-music.types.ts";

export async function getSmartRecommendations(
  seedTrack: Track | null,
  limit = 15,
): Promise<Track[]> {
  const musicService = getMusicService();

  const seedId = seedTrack?.videoId;
  let rawSuggestions: Track[] = [];

  if (seedId) {
    rawSuggestions = await musicService.getSuggestions(seedId);
  }

  if (rawSuggestions.length === 0) {
    const trending = await musicService.getTrending();
    rawSuggestions = trending;
  }

  if (rawSuggestions.length === 0) {
    return [];
  }

  const historyEntries = await loadHistory();
  const stats = computeStats(historyEntries);

  // Build frequency maps for top artists and recently played tracks for scoring
  const artistFrequency = new Map<string, number>();
  for (const topArtist of stats.topArtists) {
    artistFrequency.set(topArtist.name.toLowerCase(), topArtist.playCount);
  }

  const recentSet = new Set(
    historyEntries.slice(0, 50).map(e => e.track.videoId),
  );

  // Score candidates
  const scored = rawSuggestions.map(track => {
    let score = 50; // Base score

    const primaryArtist = track.artists?.[0]?.name?.toLowerCase() ?? "";
    const artistPlays = artistFrequency.get(primaryArtist) ?? 0;
    score += Math.min(30, artistPlays * 3); // Boost familiar artists

    // Penalize recently played to promote discovery
    if (recentSet.has(track.videoId)) {
      score -= 40;
    }

    // Penalize if seed matches
    if (seedId && track.videoId === seedId) {
      score -= 100;
    }

    return { track, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Apply artist diversity cap (max 2 tracks per artist in the final list)
  const artistCounts = new Map<string, number>();
  const diversified: Track[] = [];

  for (const item of scored) {
    const artistName =
      item.track.artists?.[0]?.name?.toLowerCase() ?? "unknown";
    const count = artistCounts.get(artistName) ?? 0;

    if (count < 2) {
      artistCounts.set(artistName, count + 1);
      diversified.push(item.track);
    }

    if (diversified.length >= limit) {
      break;
    }
  }

  logger.info("SmartRecommendationsV2", "Generated recommendations", {
    seedId,
    candidates: rawSuggestions.length,
    returned: diversified.length,
  });

  return diversified;
}
