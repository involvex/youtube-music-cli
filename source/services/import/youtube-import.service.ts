// YouTube playlist import service
import type { YouTubePlaylist } from "../../types/import.types.ts";
import { logger } from "../logger/logger.service.ts";
import { getMusicService } from "../youtube-music/api.ts";

class YouTubeImportService {
  /**
   * Extract playlist ID from various YouTube URL formats
   */
  extractPlaylistId(input: string): string | null {
    // Direct playlist ID
    if (/^[-_A-Za-z0-9]{10,}$/.test(input)) {
      return input;
    }

    // youtube.com/watch?v=...&list=...
    const watchMatch = input.match(/[?&]list=([-_A-Za-z0-9]+)/);
    if (watchMatch) {
      return watchMatch[1] ?? null;
    }

    // youtube.com/playlist?list=...
    const playlistMatch = input.match(/[?&]list=([-_A-Za-z0-9]+)/);
    if (playlistMatch) {
      return playlistMatch[1] ?? null;
    }

    return null;
  }

  /**
   * Fetch a YouTube playlist and normalize to import format
   */
  async fetchPlaylist(urlOrId: string): Promise<YouTubePlaylist | null> {
    const playlistId = this.extractPlaylistId(urlOrId);
    if (!playlistId) {
      logger.warn(
        "YouTubeImportService",
        "Invalid YouTube playlist URL or ID",
        {
          input: urlOrId,
        },
      );
      return null;
    }

    try {
      logger.info("YouTubeImportService", "Fetching YouTube playlist", {
        playlistId,
      });

      const musicService = getMusicService();
      const playlist = await musicService.getPlaylist(playlistId);

      // Normalize to YouTubePlaylist import format
      const normalized: YouTubePlaylist = {
        id: playlist.playlistId,
        name: playlist.name,
        tracks: playlist.tracks.map(track => ({
          id: track.videoId,
          title: track.title,
          name: track.title,
          artists: track.artists.map(a => a.name),
          album: track.album?.name,
          duration: track.duration ?? 0,
        })),
        url: `https://www.youtube.com/playlist?list=${playlist.playlistId}`,
      };

      logger.info("YouTubeImportService", "Successfully fetched playlist", {
        playlistId,
        trackCount: normalized.tracks.length,
      });

      return normalized;
    } catch (error) {
      logger.error("YouTubeImportService", "Failed to fetch playlist", {
        playlistId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Validate if a playlist is accessible (not private/unavailable)
   */
  async validatePlaylist(urlOrId: string): Promise<boolean> {
    const playlist = await this.fetchPlaylist(urlOrId);
    return playlist !== null && playlist.tracks.length > 0;
  }
}

// Singleton instance
let youtubeImportServiceInstance: YouTubeImportService | null = null;

export function getYouTubeImportService(): YouTubeImportService {
  if (!youtubeImportServiceInstance) {
    youtubeImportServiceInstance = new YouTubeImportService();
  }
  return youtubeImportServiceInstance;
}
