import type { HistoryEntry } from "../../types/history.types.ts";
import type {
  SmartPlaylistParams,
  SmartPlaylistRuleId,
} from "../../types/smart-playlist.types.ts";
import type { Track } from "../../types/youtube-music.types.ts";

export interface TrackAggregate {
  track: Track;
  playCount: number;
  lastPlayedAt: string;
}

const DEFAULT_LIMITS: Record<SmartPlaylistRuleId, number> = {
  top_tracks_7d: 25,
  top_tracks_all: 40,
  rediscover: 25,
  top_artist_deep_dive: 30,
};

function resolveLimit(
  rule: SmartPlaylistRuleId,
  params?: SmartPlaylistParams,
): number {
  const limit = params?.limit ?? DEFAULT_LIMITS[rule];
  return Math.max(1, Math.floor(limit));
}

function msDaysAgo(days: number, nowMs: number): number {
  return nowMs - days * 24 * 60 * 60 * 1000;
}

export function aggregateHistory(
  entries: HistoryEntry[],
  options?: { sinceMs?: number },
): TrackAggregate[] {
  const byId = new Map<string, TrackAggregate>();

  for (const entry of entries) {
    const playedMs = Date.parse(entry.playedAt);
    if (Number.isNaN(playedMs)) {
      continue;
    }
    if (options?.sinceMs !== undefined && playedMs < options.sinceMs) {
      continue;
    }

    const videoId = entry.track.videoId;
    if (!videoId) {
      continue;
    }

    const existing = byId.get(videoId);
    if (!existing) {
      byId.set(videoId, {
        track: entry.track,
        playCount: 1,
        lastPlayedAt: entry.playedAt,
      });
      continue;
    }

    existing.playCount += 1;
    if (playedMs > Date.parse(existing.lastPlayedAt)) {
      existing.lastPlayedAt = entry.playedAt;
      existing.track = entry.track;
    }
  }

  return [...byId.values()];
}

function sortByPlayCount(a: TrackAggregate, b: TrackAggregate): number {
  if (b.playCount !== a.playCount) {
    return b.playCount - a.playCount;
  }
  return Date.parse(b.lastPlayedAt) - Date.parse(a.lastPlayedAt);
}

function topArtistName(aggregates: TrackAggregate[]): string | null {
  const artistPlays = new Map<string, number>();
  for (const item of aggregates) {
    const name = item.track.artists?.[0]?.name?.trim();
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    artistPlays.set(key, (artistPlays.get(key) ?? 0) + item.playCount);
  }

  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, count] of artistPlays) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  return bestKey;
}

export function materializeTracks(
  rule: SmartPlaylistRuleId,
  entries: HistoryEntry[],
  params?: SmartPlaylistParams,
  nowMs: number = Date.now(),
): Track[] {
  const limit = resolveLimit(rule, params);

  if (entries.length === 0) {
    return [];
  }

  switch (rule) {
    case "top_tracks_7d": {
      const days = params?.days ?? 7;
      const aggregates = aggregateHistory(entries, {
        sinceMs: msDaysAgo(days, nowMs),
      });
      return aggregates
        .toSorted(sortByPlayCount)
        .slice(0, limit)
        .map(item => item.track);
    }
    case "top_tracks_all": {
      const aggregates = aggregateHistory(entries);
      return aggregates
        .toSorted(sortByPlayCount)
        .slice(0, limit)
        .map(item => item.track);
    }
    case "rediscover": {
      const days = params?.days ?? 14;
      const minPlays = params?.minPlays ?? 2;
      const cutoff = msDaysAgo(days, nowMs);
      const aggregates = aggregateHistory(entries);
      return aggregates
        .filter(
          item =>
            item.playCount >= minPlays &&
            Date.parse(item.lastPlayedAt) < cutoff,
        )
        .toSorted(sortByPlayCount)
        .slice(0, limit)
        .map(item => item.track);
    }
    case "top_artist_deep_dive": {
      const aggregates = aggregateHistory(entries);
      const artistKey = topArtistName(aggregates);
      if (!artistKey) {
        return [];
      }
      return aggregates
        .filter(
          item =>
            (item.track.artists?.[0]?.name?.toLowerCase() ?? "") === artistKey,
        )
        .toSorted(sortByPlayCount)
        .slice(0, limit)
        .map(item => item.track);
    }
    default:
      return [];
  }
}

export function defaultLimitForRule(rule: SmartPlaylistRuleId): number {
  return DEFAULT_LIMITS[rule];
}
