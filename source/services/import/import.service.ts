// Playlist import orchestrator service
import type {
  ImportProgress,
  ImportResult,
  ImportSource,
  SpotifyTrack,
  YouTubeTrack,
} from "../../types/import.types.ts";
import type { Playlist, Track } from "../../types/youtube-music.types.ts";
import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";
import { getSpotifyImportService } from "./spotify.service.ts";
import { getTrackMatcherService } from "./track-matcher.service.ts";
import { getYouTubeImportService } from "./youtube-import.service.ts";

type ProgressCallback = (progress: ImportProgress) => void;

// Helper to get track name from either Spotify or YouTube track
function getTrackName(track: SpotifyTrack | YouTubeTrack): string {
  return (track as SpotifyTrack).name || (track as YouTubeTrack).title;
}

class ImportService {
  private progressCallbacks = new Set<ProgressCallback>();
  private currentImport: {
    source: ImportSource;
    url: string;
    startTime: number;
  } | null = null;

  /**
   * Subscribe to import progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Emit progress to all subscribers
   */
  private emitProgress(progress: ImportProgress): void {
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
  }

  /**
   * Create a unique playlist ID
   */
  private generatePlaylistId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save imported playlist to config
   */
  private savePlaylist(name: string, tracks: Track[]): string {
    const configService = getConfigService();
    const playlist: Playlist = {
      playlistId: this.generatePlaylistId(),
      name,
      tracks,
    };

    // Get existing playlists and add the new one
    const existingPlaylists = configService.get("playlists") ?? [];
    const updatedPlaylists = [...existingPlaylists, playlist];

    configService.set("playlists", updatedPlaylists);

    logger.info("ImportService", "Playlist saved to config", {
      playlistId: playlist.playlistId,
      trackCount: tracks.length,
    });

    return playlist.playlistId;
  }

  /**
   * Import a playlist from Spotify or YouTube
   */
  async importPlaylist(
    source: ImportSource,
    urlOrId: string,
    customName?: string,
    signal?: AbortSignal,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    this.currentImport = { source, url: urlOrId, startTime };

    // Initial progress
    this.emitProgress({
      status: "fetching",
      current: 0,
      total: 0,
      message: `Fetching ${source} playlist...`,
    });

    let originalTracks: Array<SpotifyTrack | YouTubeTrack> = [];
    let playlistName = customName ?? `Imported ${source} playlist`;

    try {
      // Step 1: Fetch playlist
      if (source === "youtube") {
        const youtubeService = getYouTubeImportService();
        const playlist = await youtubeService.fetchPlaylist(urlOrId);

        if (!playlist) {
          throw new Error(
            "Failed to fetch YouTube playlist. Please check the URL/ID.",
          );
        }

        originalTracks = playlist.tracks;
        playlistName = customName ?? playlist.name;
      } else {
        const spotifyService = getSpotifyImportService();
        const playlist = await spotifyService.fetchPlaylist(urlOrId);

        if (!playlist) {
          throw new Error(
            "Failed to fetch Spotify playlist. It may be private or invalid.",
          );
        }

        if (playlist.tracks.length === 0) {
          throw new Error(
            "No tracks found. The playlist may be private or require authentication.",
          );
        }

        originalTracks = playlist.tracks;
        playlistName = customName ?? playlist.name;
      }

      const total = originalTracks.length;

      // Check for abort
      if (signal?.aborted) {
        this.emitProgress({
          status: "cancelled",
          current: 0,
          total,
          message: "Import cancelled",
        });
        throw new Error("Import cancelled");
      }

      // Step 2: Match tracks
      this.emitProgress({
        status: "matching",
        current: 0,
        total,
        message: "Matching tracks...",
      });

      const trackMatcher = getTrackMatcherService();
      const matchedTracks: Track[] = [];
      const errors: string[] = [];
      let matched = 0;
      let failed = 0;

      for (let i = 0; i < originalTracks.length; i++) {
        // Check for abort
        if (signal?.aborted) {
          this.emitProgress({
            status: "cancelled",
            current: i,
            total,
            currentTrack: originalTracks[i]
              ? getTrackName(originalTracks[i]!)
              : undefined,
            message: "Import cancelled",
          });
          throw new Error("Import cancelled");
        }

        const originalTrack = originalTracks[i]!;
        const trackName = getTrackName(originalTrack);
        this.emitProgress({
          status: "matching",
          current: i,
          total,
          currentTrack: trackName,
          message: `Matching "${trackName}"...`,
        });

        const match = await trackMatcher.findMatch(originalTrack);

        if (match.matchedTrack) {
          matchedTracks.push(match.matchedTrack);
          matched++;
        } else {
          failed++;
          const errorMsg = match.error
            ? `${trackName}: ${match.error}`
            : `No match found for "${trackName}"`;
          errors.push(errorMsg);
        }

        // Throttle progress updates (every 5 tracks or at the end)
        if (i % 5 === 0 || i === total - 1) {
          this.emitProgress({
            status: "matching",
            current: i + 1,
            total,
            currentTrack: trackName,
            message: `Matched ${matched}/${total} tracks`,
          });
        }
      }

      // Step 3: Create playlist
      this.emitProgress({
        status: "creating",
        current: total,
        total,
        message: "Creating playlist...",
      });

      const playlistId = this.savePlaylist(playlistName, matchedTracks);

      // Final progress
      this.emitProgress({
        status: "completed",
        current: total,
        total,
        message: `Import completed: ${matched} tracks matched`,
      });

      const result: ImportResult = {
        playlistId,
        playlistName,
        source,
        total,
        matched,
        failed,
        matches: [], // Could be populated if needed for detailed results
        errors,
        duration: Date.now() - startTime,
      };

      logger.info("ImportService", "Import completed", {
        playlistId,
        playlistName,
        source,
        total,
        matched,
        failed,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("ImportService", "Import failed", {
        source,
        url: urlOrId,
        error: message,
      });

      if (message === "Import cancelled") {
        throw error;
      }

      this.emitProgress({
        status: "failed",
        current: 0,
        total: originalTracks.length,
        message: `Import failed: ${message}`,
      });

      throw error;
    } finally {
      this.currentImport = null;
    }
  }

  /**
   * Validate a playlist URL/ID before importing
   */
  async validatePlaylist(
    source: ImportSource,
    urlOrId: string,
  ): Promise<boolean> {
    try {
      if (source === "youtube") {
        const service = getYouTubeImportService();
        return await service.validatePlaylist(urlOrId);
      } else {
        const service = getSpotifyImportService();
        return await service.validatePlaylist(urlOrId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Get current import status
   */
  getCurrentImport(): {
    source: ImportSource;
    url: string;
    elapsed: number;
  } | null {
    if (!this.currentImport) return null;

    return {
      source: this.currentImport.source,
      url: this.currentImport.url,
      elapsed: Date.now() - this.currentImport.startTime,
    };
  }

  /**
   * Cancel the current import
   */
  cancelImport(): void {
    this.currentImport = null;
    this.emitProgress({
      status: "cancelled",
      current: 0,
      total: 0,
      message: "Import cancelled",
    });
  }
}

// Singleton instance
let importServiceInstance: ImportService | null = null;

export function getImportService(): ImportService {
  if (!importServiceInstance) {
    importServiceInstance = new ImportService();
  }
  return importServiceInstance;
}
