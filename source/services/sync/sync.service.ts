// YouTube Music playlist sync service
import type {
  Playlist,
  SearchResponse,
  Track,
} from "../../types/youtube-music.types.ts";
import { getAuthService } from "../auth/auth.service.ts";
import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";
import { getMusicService } from "../youtube-music/api.ts";

export interface SyncResult {
  playlistId: string;
  playlistName: string;
  trackCount: number;
  wasUpdated: boolean;
}

export interface SyncProgress {
  status: "fetching" | "saving" | "completed" | "failed";
  current: number;
  total: number;
  message: string;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

function normalizeYtmPlaylistId(input: string): string {
  const trimmed = input.trim();

  // Extract from YouTube Music / YouTube URL if present
  // https://music.youtube.com/playlist?list=VLXXXXXXXXXXXXX
  // https://www.youtube.com/watch?v=...&list=...
  const urlMatch = trimmed.match(/[?&]list=([^&\s]+)/);
  if (urlMatch) {
    return urlMatch[1]!;
  }

  // Already a valid playlist ID (may have VL prefix)
  if (/^(VL)?[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length >= 10) {
    return trimmed;
  }

  return trimmed;
}

class SyncService {
  private getConfig() {
    return getConfigService();
  }

  private getAuthStatus() {
    return getAuthService().getStatus();
  }

  /**
   * Check if the user is authenticated (cookie or OAuth2)
   */
  isAuthenticated(): boolean {
    return this.getAuthStatus().loggedIn;
  }

  /**
   * Sync a YouTube Music playlist by ID or URL to local config.
   * This fetches the playlist using the authenticated API and saves it locally.
   */
  async syncPlaylist(
    urlOrId: string,
    customName?: string,
    onProgress?: SyncProgressCallback,
  ): Promise<SyncResult> {
    const playlistId = normalizeYtmPlaylistId(urlOrId);

    if (!playlistId) {
      throw new Error("Invalid YouTube Music playlist ID or URL");
    }

    onProgress?.({
      status: "fetching",
      current: 0,
      total: 0,
      message: `Fetching playlist ${playlistId} from YouTube Music...`,
    });

    const musicService = getMusicService();
    const playlist = await musicService.getPlaylist(playlistId);

    if (!playlist || playlist.tracks.length === 0) {
      throw new Error(
        `Could not find playlist or it has no tracks: ${playlistId}`,
      );
    }

    onProgress?.({
      status: "saving",
      current: 0,
      total: playlist.tracks.length,
      message: `Saving ${playlist.tracks.length} tracks to local config...`,
    });

    const playlistName = customName ?? playlist.name;
    const result = this.savePlaylist(playlistId, playlistName, playlist.tracks);

    onProgress?.({
      status: "completed",
      current: playlist.tracks.length,
      total: playlist.tracks.length,
      message: `Successfully synced "${playlistName}" (${playlist.tracks.length} tracks)`,
    });

    logger.info("SyncService", "Playlist synced", {
      playlistId,
      playlistName,
      trackCount: playlist.tracks.length,
      wasUpdated: result.wasUpdated,
    });

    return result;
  }

  /**
   * Search for YouTube Music playlists.
   */
  async searchPlaylists(query: string, limit = 10): Promise<Playlist[]> {
    const musicService = getMusicService();
    const response: SearchResponse = await musicService.search(query, {
      type: "playlists",
      limit,
    });

    return response.results
      .filter(r => r.type === "playlist")
      .map(r => r.data as Playlist);
  }

  /**
   * List all locally synced/saved playlists.
   */
  listPlaylists(): Playlist[] {
    return this.getConfig().get("playlists") ?? [];
  }

  /**
   * Save or update a playlist in local config.
   * If a playlist with the same ID exists, update it.
   * Otherwise create a new entry.
   */
  private savePlaylist(
    playlistId: string,
    name: string,
    tracks: Track[],
  ): SyncResult {
    const config = this.getConfig();
    const existingPlaylists = config.get("playlists") ?? [];

    const existingIndex = existingPlaylists.findIndex(
      p => p.playlistId === playlistId,
    );

    let wasUpdated = false;

    if (existingIndex >= 0) {
      // Update existing playlist
      existingPlaylists[existingIndex] = {
        playlistId,
        name,
        tracks,
      };
      wasUpdated = true;
      logger.info("SyncService", "Playlist updated", { playlistId, name });
    } else {
      // Add new playlist
      existingPlaylists.push({
        playlistId,
        name,
        tracks,
      });
      logger.info("SyncService", "Playlist added", { playlistId, name });
    }

    config.set("playlists", existingPlaylists);

    return {
      playlistId,
      playlistName: name,
      trackCount: tracks.length,
      wasUpdated,
    };
  }

  /**
   * Delete a synced playlist from local config.
   */
  deletePlaylist(playlistId: string): boolean {
    const config = this.getConfig();
    const existingPlaylists = config.get("playlists") ?? [];
    const index = existingPlaylists.findIndex(p => p.playlistId === playlistId);

    if (index >= 0) {
      existingPlaylists.splice(index, 1);
      config.set("playlists", existingPlaylists);
      logger.info("SyncService", "Playlist deleted", { playlistId });
      return true;
    }

    return false;
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

// Export for testing
export { normalizeYtmPlaylistId };
