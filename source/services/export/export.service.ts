// Playlist export service for JSON and M3U8 formats
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import type { Playlist } from "../../types/youtube-music.types.ts";
import { CONFIG_DIR } from "../../utils/constants.ts";
import { logger } from "../logger/logger.service.ts";

export type ExportFormat = "json" | "m3u8" | "both";

export interface ExportOptions {
  format: ExportFormat;
  outputDir?: string;
}

export interface ExportResult {
  playlistName: string;
  format: ExportFormat;
  files: string[];
  success: boolean;
  error?: string;
}

class ExportService {
  private static instance: ExportService;
  private readonly DEFAULT_EXPORT_DIR = `${CONFIG_DIR}/exports`;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Get the export directory, create if it doesn't exist
   */
  private getExportDir(customDir?: string): string {
    const exportDir = customDir || this.DEFAULT_EXPORT_DIR;

    if (!existsSync(exportDir)) {
      try {
        mkdirSync(exportDir, { recursive: true });
        logger.info("ExportService", "Created export directory", { exportDir });
      } catch (error) {
        logger.error("ExportService", "Failed to create export directory", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(`Failed to create export directory: ${exportDir}`);
      }
    }

    return exportDir;
  }

  /**
   * Sanitize filename for safe file system usage
   */
  private sanitizeFilename(name: string): string {
    // Remove or replace characters that are unsafe for filenames
    return name
      .replace(/[<>:"/\\|?*]/g, "") // Remove unsafe chars
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .substring(0, 200); // Limit length
  }

  /**
   * Generate M3U8 format content for a playlist
   */
  private generateM3U8(playlist: Playlist): string {
    const lines = ["#EXTM3U", ""];

    for (const track of playlist.tracks) {
      if (track.artists && track.artists.length > 0) {
        const artistNames = track.artists.map(a => a.name).join(", ");
        const duration = track.duration
          ? Math.round(track.duration / 1000)
          : -1;
        lines.push(`#EXTINF:${duration},${artistNames} - ${track.title}`);
      } else {
        lines.push(`#EXTINF:-1,${track.title}`);
      }

      // Use the videoId to generate YouTube URL
      if (track.videoId) {
        lines.push(`https://www.youtube.com/watch?v=${track.videoId}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Export a single playlist to the specified format(s)
   */
  async exportPlaylist(
    playlist: Playlist,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      logger.info("ExportService", "Exporting playlist", {
        playlist: playlist.name,
        format: options.format,
      });

      const exportDir = this.getExportDir(options.outputDir);
      const sanitizedName = this.sanitizeFilename(playlist.name);
      const files: string[] = [];

      // Export to JSON
      if (options.format === "json" || options.format === "both") {
        const jsonPath = `${exportDir}/${sanitizedName}.json`;
        const jsonContent = JSON.stringify(playlist, null, 2);
        writeFileSync(jsonPath, jsonContent, "utf-8");
        files.push(jsonPath);
        logger.info("ExportService", "Exported to JSON", { path: jsonPath });
      }

      // Export to M3U8
      if (options.format === "m3u8" || options.format === "both") {
        const m3u8Path = `${exportDir}/${sanitizedName}.m3u8`;
        const m3u8Content = this.generateM3U8(playlist);
        writeFileSync(m3u8Path, m3u8Content, "utf-8");
        files.push(m3u8Path);
        logger.info("ExportService", "Exported to M3U8", { path: m3u8Path });
      }

      return {
        playlistName: playlist.name,
        format: options.format,
        files,
        success: true,
      };
    } catch (error) {
      logger.error("ExportService", "Failed to export playlist", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        playlistName: playlist.name,
        format: options.format,
        files: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Export multiple playlists to the specified format(s)
   */
  async exportAllPlaylists(
    playlists: Playlist[],
    options: ExportOptions,
  ): Promise<ExportResult[]> {
    logger.info("ExportService", "Exporting all playlists", {
      count: playlists.length,
      format: options.format,
    });

    const results: ExportResult[] = [];

    for (const playlist of playlists) {
      const result = await this.exportPlaylist(playlist, options);
      results.push(result);
    }

    return results;
  }
}

export const getExportService = (): ExportService =>
  ExportService.getInstance();
