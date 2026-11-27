import type {
  MatchConfidence,
  SpotifyTrack,
  TrackMatch,
  YouTubeTrack,
} from "../../types/import.types.ts";
// Track matching service for import
import type { Track } from "../../types/youtube-music.types.ts";
import { logger } from "../logger/logger.service.ts";
import { getMusicService } from "../youtube-music/api.ts";

interface MatchCandidate extends Track {
  score: number;
}

class TrackMatcherService {
  private readonly musicService = getMusicService();
  private searchCache = new Map<string, Track[]>();
  private matchCache = new Map<string, TrackMatch>();

  /**
   * Build a search query from track metadata
   */
  buildSearchQuery(track: SpotifyTrack | YouTubeTrack): string {
    // Combine artist and title for best results
    const artists = track.artists.slice(0, 2).join(", "); // Use up to 2 artists
    const name = (track as SpotifyTrack).name || (track as YouTubeTrack).title;
    return `${artists} ${name}`.trim();
  }

  /**
   * Get track name from either type
   */
  getTrackName(track: SpotifyTrack | YouTubeTrack): string {
    return (track as SpotifyTrack).name || (track as YouTubeTrack).title;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().normalize();
    const s2 = str2.toLowerCase().normalize();

    // Exact match
    if (s1 === s2) return 1;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Simple Levenshtein-based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      if (matrix[0]) {
        matrix[0][j] = j;
      }
    }

    for (let i = 1; i <= str2.length; i++) {
      const row = matrix[i];
      if (!row) continue;

      const prevRow = matrix[i - 1];
      if (!prevRow) continue;

      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          row[j] = prevRow[j - 1] ?? 0;
        } else {
          row[j] = Math.min(
            (prevRow[j - 1] ?? 0) + 1, // substitution
            (row[j - 1] ?? 0) + 1, // insertion
            (prevRow[j] ?? 0) + 1, // deletion
          );
        }
      }
    }

    const lastRow = matrix[str2.length];
    return lastRow?.[str1.length] ?? 0;
  }

  /**
   * Check if artists match (any overlap in artist lists)
   */
  artistsMatch(trackArtists: string[], candidateArtists: string[]): boolean {
    const normalizedTrackArtists = trackArtists
      .map(a => a.toLowerCase().trim())
      .filter(a => a.length > 0);

    // candidateArtists are strings directly from the track
    const normalizedCandidateArtists = candidateArtists
      .map(a => a.toLowerCase().trim())
      .filter(a => a.length > 0);

    // Check for any artist name overlap
    return normalizedTrackArtists.some(trackArtist =>
      normalizedCandidateArtists.some(
        candidateArtist =>
          candidateArtist.includes(trackArtist) ||
          trackArtist.includes(candidateArtist),
      ),
    );
  }

  /**
   * Calculate duration proximity score (0-1)
   */
  durationScore(originalDuration: number, candidateDuration: number): number {
    if (!originalDuration || !candidateDuration) return 0.5; // Neutral if either is missing

    const diff = Math.abs(originalDuration - candidateDuration);
    const maxDiff = Math.max(originalDuration, candidateDuration) * 0.3; // 30% tolerance

    if (diff === 0) return 1;
    if (diff <= maxDiff) return 1 - diff / maxDiff;
    return 0;
  }

  /**
   * Score a track match based on multiple factors
   */
  scoreMatch(original: SpotifyTrack | YouTubeTrack, candidate: Track): number {
    let score = 0;
    const weights = {
      title: 0.5,
      artist: 0.3,
      duration: 0.2,
    };

    // Title similarity
    const titleSimilarity = this.calculateSimilarity(
      this.getTrackName(original),
      candidate.title,
    );
    score += titleSimilarity * weights.title;

    // Artist match
    const artistMatch = this.artistsMatch(
      original.artists,
      candidate.artists.map(a => a.name),
    )
      ? 1
      : 0;
    score += artistMatch * weights.artist;

    // Duration proximity
    const durationScore = this.durationScore(
      original.duration,
      candidate.duration ?? 0,
    );
    score += durationScore * weights.duration;

    return score;
  }

  /**
   * Determine confidence level from score
   */
  getConfidence(score: number): MatchConfidence {
    if (score >= 0.85) return "high";
    if (score >= 0.7) return "medium";
    if (score >= 0.5) return "low";
    return "none";
  }

  /**
   * Search YouTube Music for a track
   */
  async searchTrack(track: SpotifyTrack | YouTubeTrack): Promise<Track[]> {
    const query = this.buildSearchQuery(track);
    const cacheKey = `track:${query}`;

    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      logger.debug("TrackMatcherService", "Using cached search results", {
        query,
      });
      return cached;
    }

    try {
      logger.debug("TrackMatcherService", "Searching for track", { query });

      const response = await this.musicService.search(query, {
        type: "songs",
        limit: 10,
      });
      const results = response.results
        .filter(r => r.type === "song")
        .map(r => r.data as Track);

      // Cache results
      this.searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      logger.error("TrackMatcherService", "Track search failed", {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Find the best matching track on YouTube Music
   */
  async findMatch(original: SpotifyTrack | YouTubeTrack): Promise<TrackMatch> {
    // Create a unique key for this track
    const trackKey = `${original.artists[0] ?? ""}-${this.getTrackName(original)}-${original.duration}`;
    const cached = this.matchCache.get(trackKey);
    if (cached) {
      logger.debug("TrackMatcherService", "Using cached match", {
        track: this.getTrackName(original),
      });
      return cached;
    }

    try {
      const candidates = await this.searchTrack(original);

      if (candidates.length === 0) {
        const noMatch: TrackMatch = {
          originalTrack: original,
          matchedTrack: null,
          confidence: "none",
        };
        this.matchCache.set(trackKey, noMatch);
        return noMatch;
      }

      // Score all candidates
      const scoredCandidates: MatchCandidate[] = candidates.map(candidate => ({
        ...candidate,
        score: this.scoreMatch(original, candidate),
      }));

      // Sort by score descending
      scoredCandidates.sort((a, b) => b.score - a.score);

      const best = scoredCandidates[0];
      if (!best) {
        const noMatch: TrackMatch = {
          originalTrack: original,
          matchedTrack: null,
          confidence: "none",
        };
        this.matchCache.set(trackKey, noMatch);
        return noMatch;
      }

      const { score, ...matchedTrack } = best;
      const confidence = this.getConfidence(score);

      const match: TrackMatch = {
        originalTrack: original,
        matchedTrack: matchedTrack,
        confidence,
      };

      logger.debug("TrackMatcherService", "Track matched", {
        original: this.getTrackName(original),
        matched: matchedTrack.title,
        confidence,
        score,
      });

      this.matchCache.set(trackKey, match);
      return match;
    } catch (error) {
      logger.error("TrackMatcherService", "Match finding failed", {
        track: this.getTrackName(original),
        error: error instanceof Error ? error.message : String(error),
      });

      const errorMatch: TrackMatch = {
        originalTrack: original,
        matchedTrack: null,
        confidence: "none",
        error: error instanceof Error ? error.message : String(error),
      };

      return errorMatch;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.matchCache.clear();
    logger.debug("TrackMatcherService", "Caches cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { searchCache: number; matchCache: number } {
    return {
      searchCache: this.searchCache.size,
      matchCache: this.matchCache.size,
    };
  }
}

// Singleton instance
let trackMatcherServiceInstance: TrackMatcherService | null = null;

export function getTrackMatcherService(): TrackMatcherService {
  if (!trackMatcherServiceInstance) {
    trackMatcherServiceInstance = new TrackMatcherService();
  }
  return trackMatcherServiceInstance;
}
