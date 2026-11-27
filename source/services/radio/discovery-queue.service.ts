import type { HistoryEntry } from "../../types/history.types.ts";
import type { Track } from "../../types/youtube-music.types.ts";
import { formatError } from "../../utils/error.ts";
// Discovery queue — history-seeded endless radio anchors and scored tracks
import { loadHistory } from "../history/history.service.ts";
import { logger } from "../logger/logger.service.ts";
import { getMusicService } from "../youtube-music/api.ts";
import { getSmartRecommendations } from "../youtube-music/smart-recommendations.service.ts";

export const DISCOVERY_RECENT_SKIP = 50;
export const DISCOVERY_DEFAULT_ANCHOR_COUNT = 5;
export const DISCOVERY_DEFAULT_TRACK_LIMIT = 30;

export type PickDiscoveryAnchorsOptions = {
  recentSkip?: number;
  anchorCount?: number;
};

/**
 * Pick diverse anchor tracks from listening history for discovery radio.
 * Skips the newest `recentSkip` plays, then prefers top artists (one track each).
 */
export function pickDiscoveryAnchors(
  entries: HistoryEntry[],
  options: PickDiscoveryAnchorsOptions = {},
): Track[] {
  const recentSkip = options.recentSkip ?? DISCOVERY_RECENT_SKIP;
  const anchorCount = options.anchorCount ?? DISCOVERY_DEFAULT_ANCHOR_COUNT;

  if (entries.length === 0 || anchorCount <= 0) {
    return [];
  }

  const older = entries.slice(Math.min(recentSkip, entries.length));
  const pool = older.length > 0 ? older : entries;

  const artistPlays = new Map<string, { count: number; track: Track }>();
  for (const entry of pool) {
    const track = entry.track;
    if (!track?.videoId) {
      continue;
    }
    const artistKey =
      track.artists?.[0]?.name?.trim().toLowerCase() ?? "unknown";
    const existing = artistPlays.get(artistKey);
    if (!existing) {
      artistPlays.set(artistKey, { count: 1, track });
      continue;
    }
    existing.count += 1;
  }

  const ranked = [...artistPlays.values()].toSorted(
    (a, b) => b.count - a.count,
  );

  const anchors: Track[] = [];
  const seenIds = new Set<string>();
  for (const item of ranked) {
    if (anchors.length >= anchorCount) {
      break;
    }
    if (seenIds.has(item.track.videoId)) {
      continue;
    }
    seenIds.add(item.track.videoId);
    anchors.push(item.track);
  }

  return anchors;
}

export type BuildDiscoveryTracksOptions = {
  limit?: number;
  anchorCount?: number;
  recentSkip?: number;
  entries?: HistoryEntry[];
};

export type DiscoveryTracksResult = {
  tracks: Track[];
  anchors: Track[];
};

/**
 * Build a scored discovery page from history anchors (or trending when empty).
 */
export async function buildDiscoveryTracks(
  options: BuildDiscoveryTracksOptions = {},
): Promise<DiscoveryTracksResult> {
  const limit = options.limit ?? DISCOVERY_DEFAULT_TRACK_LIMIT;
  const history = options.entries ?? (await loadHistory());
  const anchors = pickDiscoveryAnchors(history, {
    recentSkip: options.recentSkip,
    anchorCount: options.anchorCount,
  });

  try {
    if (anchors.length === 0) {
      const trendingScored = await getSmartRecommendations(null, limit);
      return { tracks: trendingScored, anchors: trendingScored.slice(0, 5) };
    }

    const musicService = getMusicService();
    const collected: Track[] = [];
    const seen = new Set<string>();

    for (const anchor of anchors) {
      const suggestions = await musicService.getSuggestions(anchor.videoId);
      for (const track of suggestions) {
        if (!track?.videoId || seen.has(track.videoId)) {
          continue;
        }
        if (track.videoId === anchor.videoId) {
          continue;
        }
        seen.add(track.videoId);
        collected.push(track);
      }
    }

    const primarySeed = anchors[0] ?? null;
    const scored =
      collected.length > 0
        ? await scoreDiscoveryCandidates(collected, primarySeed, limit, history)
        : await getSmartRecommendations(primarySeed, limit);

    logger.info("DiscoveryQueue", "Built discovery tracks", {
      anchorCount: anchors.length,
      candidates: collected.length,
      returned: scored.length,
    });

    return { tracks: scored, anchors };
  } catch (error) {
    logger.error("DiscoveryQueue", "Failed to build discovery tracks", {
      error: formatError(error),
    });
    return { tracks: [], anchors };
  }
}

async function scoreDiscoveryCandidates(
  candidates: Track[],
  seedTrack: Track | null,
  limit: number,
  historyEntries: HistoryEntry[],
): Promise<Track[]> {
  const { computeStats } = await import("../stats/stats.service.ts");
  const stats = computeStats(historyEntries);

  const artistFrequency = new Map<string, number>();
  for (const topArtist of stats.topArtists) {
    artistFrequency.set(topArtist.name.toLowerCase(), topArtist.playCount);
  }

  const recentSet = new Set(
    historyEntries.slice(0, DISCOVERY_RECENT_SKIP).map(e => e.track.videoId),
  );
  const seedId = seedTrack?.videoId;

  const scored = candidates.map(track => {
    let score = 50;
    const primaryArtist = track.artists?.[0]?.name?.toLowerCase() ?? "";
    const artistPlays = artistFrequency.get(primaryArtist) ?? 0;
    score += Math.min(30, artistPlays * 3);
    if (recentSet.has(track.videoId)) {
      score -= 40;
    }
    if (seedId && track.videoId === seedId) {
      score -= 100;
    }
    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score);

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

  return diversified;
}

export const DISCOVERY_RADIO_SEED = {
  type: "discovery" as const,
  id: "discovery",
  name: "Discovery Queue",
};
