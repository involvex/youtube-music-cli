// Lyrics service - word-synced lyrics via Musixmatch richsync, with a
// line-synced LRCLIB fallback (https://lrclib.net - free, no auth).
import { logger } from "../logger/logger.service.ts";
import { getMusixmatchService } from "./musixmatch.service.ts";

export interface LyricWord {
  text: string;
  time: number; // seconds, absolute
}

export interface LyricLine {
  time: number; // seconds
  endTime?: number; // seconds - only present for word-synced lines
  text: string;
  words?: LyricWord[]; // only present when word-level timing is available
}

export interface Lyrics {
  synced: LyricLine[] | null; // null if only plain lyrics
  plain: string | null;
}

const LRCLIB_BASE = "https://lrclib.net/api";
const LOOKUP_TIMEOUT_MS = 20_000;
const LRCLIB_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Lyrics lookup timed out after ${ms}ms`));
    }, ms);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Video titles often carry noise ("Artist - Song (Official Lyric Video)")
// that hurts lyrics-provider search matching.
export function cleanTrackName(title: string, artist = ""): string {
  let cleaned = title
    .replace(
      /[([][^()[\]]*\b(official|lyrics?|audio|video|mv|visualizer|hd|4k|remaster(ed)?)\b[^()[\]]*[)\]]/gi,
      "",
    )
    .trim();

  if (artist) {
    const prefix = new RegExp(`^${escapeRegExp(artist)}\\s*[-–—:]\\s*`, "i");
    cleaned = cleaned.replace(prefix, "");
  }

  return cleaned.trim() || title;
}

class LyricsService {
  private static instance: LyricsService;
  private cache = new Map<string, Lyrics | null>();

  private constructor() {}

  static getInstance(): LyricsService {
    if (!LyricsService.instance) {
      LyricsService.instance = new LyricsService();
    }
    return LyricsService.instance;
  }

  /** Parse LRC format into timed lines */
  private parseLrc(lrc: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const lineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const rawLine of lrc.split("\n")) {
      const match = lineRegex.exec(rawLine.trim());
      if (match) {
        const minutes = Number.parseInt(match[1]!, 10);
        const seconds = Number.parseInt(match[2]!, 10);
        const centiseconds = Number.parseInt(match[3]!.padEnd(3, "0"), 10);
        const time = minutes * 60 + seconds + centiseconds / 1000;
        const text = match[4]!.trim();
        lines.push({ time, text });
      }
    }

    return lines.sort((a, b) => a.time - b.time);
  }

  async getLyrics(
    trackName: string,
    artistName: string,
    duration?: number,
  ): Promise<Lyrics | null> {
    const cleanedTrack = cleanTrackName(trackName, artistName);
    const cacheKey = `${cleanedTrack}::${artistName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    try {
      const result = await withTimeout(
        this.lookup(cleanedTrack, artistName, duration),
        LOOKUP_TIMEOUT_MS,
      );

      const hasSynced = !!result.synced && result.synced.length > 0;
      const hasPlain = !!result.plain && result.plain.length > 0;

      if (!hasSynced && !hasPlain) {
        logger.debug("LyricsService", "No lyrics found", {
          trackName,
          artistName,
        });
        this.cache.set(cacheKey, null);
        return null;
      }

      const lyrics: Lyrics = {
        synced: hasSynced ? result.synced : null,
        plain: hasPlain ? result.plain : null,
      };

      this.cache.set(cacheKey, lyrics);
      logger.info("LyricsService", "Lyrics loaded", {
        trackName,
        hasWordSync: !!lyrics.synced?.[0]?.words,
        hasSynced: !!lyrics.synced,
        hasPlain: !!lyrics.plain,
      });
      return lyrics;
    } catch (error) {
      logger.warn("LyricsService", "Failed to fetch lyrics", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Transient failures (timeouts, HTTP 5xx) must not poison the session
      // cache; only definitive "no lyrics" results are cached above.
      return null;
    }
  }

  private async lookup(
    cleanedTrack: string,
    artistName: string,
    duration?: number,
  ): Promise<Lyrics> {
    try {
      const richLines = await getMusixmatchService().getRichSync(
        cleanedTrack,
        artistName,
        duration,
      );
      if (richLines && richLines.length > 0) {
        return {
          synced: richLines.map(line => ({
            time: line.start,
            endTime: line.end,
            text: line.text,
            words: line.words.map(word => ({
              text: word.text,
              time: word.time,
            })),
          })),
          plain: null,
        };
      }
    } catch (error) {
      logger.warn("LyricsService", "Musixmatch lookup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return this.lookupLrclib(cleanedTrack, artistName, duration);
  }

  private async lookupLrclib(
    cleanedTrack: string,
    artistName: string,
    duration?: number,
  ): Promise<Lyrics> {
    const params = new URLSearchParams({
      track_name: cleanedTrack,
      artist_name: artistName,
      ...(duration ? { duration: String(Math.round(duration)) } : {}),
    });

    const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
      signal: AbortSignal.timeout(LRCLIB_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { synced: null, plain: null };
      }
      throw new Error(`LRCLIB API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      syncedLyrics?: string;
      plainLyrics?: string;
    };

    const parsedLrc = data.syncedLyrics ? this.parseLrc(data.syncedLyrics) : [];
    const plain = data.plainLyrics?.trim() ? data.plainLyrics : null;

    return {
      synced: parsedLrc.length > 0 ? parsedLrc : null,
      plain,
    };
  }

  /** Get the current lyric line index based on playback position */
  getCurrentLineIndex(lines: LyricLine[], currentTime: number): number {
    if (lines.length === 0) return -1;
    let index = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.time <= currentTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const getLyricsService = (): LyricsService =>
  LyricsService.getInstance();
