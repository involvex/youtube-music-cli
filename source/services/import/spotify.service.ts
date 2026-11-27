// Spotify playlist import service
import type { SpotifyPlaylist } from "../../types/import.types.ts";
import { logger } from "../logger/logger.service.ts";

class SpotifyImportService {
  private readonly OEMBED_URL = "https://open.spotify.com/oembed";

  /**
   * Extract playlist ID from various Spotify URL formats
   */
  extractPlaylistId(input: string): string | null {
    // Direct playlist ID (base62 string, typically 22 characters)
    if (/^[A-Za-z0-9]{22}$/.test(input)) {
      return input;
    }

    // spotify:playlist:ID format
    const uriMatch = input.match(/spotify:playlist:([A-Za-z0-9]+)/);
    if (uriMatch) {
      return uriMatch[1] ?? null;
    }

    // open.spotify.com/playlist/ID format
    const urlMatch = input.match(
      /open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/,
    );
    if (urlMatch) {
      return urlMatch[1] ?? null;
    }

    return null;
  }

  /**
   * Build a Spotify playlist URL from ID
   */
  buildPlaylistUrl(playlistId: string): string {
    return `https://open.spotify.com/playlist/${playlistId}`;
  }

  /**
   * Fetch playlist metadata using Spotify oEmbed API
   * This works for public playlists without authentication
   */
  async fetchPlaylistMetadata(
    urlOrId: string,
  ): Promise<{ title: string; url: string } | null> {
    const playlistId = this.extractPlaylistId(urlOrId);
    if (!playlistId) {
      return null;
    }

    const playlistUrl = this.buildPlaylistUrl(playlistId);
    const oembedUrl = `${this.OEMBED_URL}?url=${encodeURIComponent(playlistUrl)}`;

    try {
      logger.debug("SpotifyImportService", "Fetching oEmbed metadata", {
        playlistId,
      });

      const response = await fetch(oembedUrl);
      if (!response.ok) {
        logger.warn("SpotifyImportService", "oEmbed request failed", {
          status: response.status,
          playlistId,
        });
        return null;
      }

      const data = (await response.json()) as {
        title?: string;
        thumbnail_url?: string;
        html?: string;
      };

      return {
        title: data.title || "Unknown Playlist",
        url: playlistUrl,
      };
    } catch (error) {
      logger.error("SpotifyImportService", "oEmbed fetch failed", {
        playlistId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Fetch playlist tracks by scraping the Spotify Web API
   * Note: This method has limitations and may not work for private playlists
   */
  async fetchPlaylistTracks(
    playlistId: string,
  ): Promise<SpotifyPlaylist | null> {
    const metadata = await this.fetchPlaylistMetadata(playlistId);
    if (!metadata) {
      return null;
    }

    try {
      // Use Spotify's Web API endpoint for playlist tracks (no auth required for public playlists)
      const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

      logger.debug("SpotifyImportService", "Fetching tracks from API", {
        playlistId,
      });

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      // API may require auth for some playlists
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logger.warn(
            "SpotifyImportService",
            "Playlist requires authentication",
            {
              playlistId,
              status: response.status,
            },
          );
          return this.createPartialPlaylist(playlistId, metadata);
        }
        return null;
      }

      const data = (await response.json()) as {
        items?: Array<{
          track?: {
            id?: string;
            name?: string;
            duration_ms?: number;
            artists?: Array<{ name?: string; id?: string }>;
            album?: { name?: string };
          };
        }>;
      };

      const tracks =
        data.items
          ?.filter(item => item.track)
          .map(item => ({
            id: item.track!.id ?? "",
            name: item.track!.name ?? "Unknown Track",
            artists:
              item.track!.artists?.map(a => a.name ?? "Unknown Artist") ?? [],
            album: item.track!.album?.name,
            duration: Math.round((item.track!.duration_ms ?? 0) / 1000),
          })) ?? [];

      return {
        id: playlistId,
        name: metadata.title,
        tracks,
        isPublic: true,
        url: metadata.url,
      };
    } catch (error) {
      logger.error("SpotifyImportService", "Failed to fetch playlist", {
        playlistId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Create a partial playlist when only metadata is available
   * This is used when authentication is required but we have basic info
   */
  private createPartialPlaylist(
    playlistId: string,
    metadata: { title: string; url: string },
  ): SpotifyPlaylist | null {
    logger.info(
      "SpotifyImportService",
      "Creating partial playlist (auth required)",
      {
        playlistId,
      },
    );

    return {
      id: playlistId,
      name: metadata.title,
      tracks: [],
      isPublic: false,
      url: metadata.url,
    };
  }

  /**
   * Fetch a Spotify playlist (with graceful degradation)
   */
  async fetchPlaylist(urlOrId: string): Promise<SpotifyPlaylist | null> {
    const playlistId = this.extractPlaylistId(urlOrId);
    if (!playlistId) {
      logger.warn(
        "SpotifyImportService",
        "Invalid Spotify playlist URL or ID",
        {
          input: urlOrId,
        },
      );
      return null;
    }

    logger.info("SpotifyImportService", "Fetching Spotify playlist", {
      playlistId,
    });

    return this.fetchPlaylistTracks(playlistId);
  }

  /**
   * Validate if a playlist is accessible
   */
  async validatePlaylist(urlOrId: string): Promise<boolean> {
    const playlist = await this.fetchPlaylist(urlOrId);
    return playlist !== null;
  }
}

// Singleton instance
let spotifyImportServiceInstance: SpotifyImportService | null = null;

export function getSpotifyImportService(): SpotifyImportService {
  if (!spotifyImportServiceInstance) {
    spotifyImportServiceInstance = new SpotifyImportService();
  }
  return spotifyImportServiceInstance;
}
