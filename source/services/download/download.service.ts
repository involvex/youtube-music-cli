import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { DownloadFormat } from "../../types/config.types.ts";
import type {
  Playlist,
  SearchResult,
  Track,
} from "../../types/youtube-music.types.ts";
import { ensureDownloadDirectory } from "../../utils/download-path.ts";
import {
  getTrackDestinationPath,
  upsertDownloadsIndexEntry,
} from "../../utils/local-track.ts";
import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";
import { appendYtDlpCookieArgs } from "../player/ytdl-cookies.ts";
import { getMusicService } from "../youtube-music/api.ts";

export type DownloadResult = {
  downloaded: number;
  skipped: number;
  failed: number;
  cancelled: number;
  errors: string[];
};

type DownloadTarget = {
  name: string;
  tracks: Track[];
};

export type DownloadProgressPhase =
  "start" | "done" | "skip" | "fail" | "cancel";

export type DownloadProgressInfo = {
  current: number;
  total: number;
  track: Track;
  phase: DownloadProgressPhase;
  error?: string;
};

export type DownloadTracksOptions = {
  onProgress?: (info: DownloadProgressInfo) => void;
  signal?: AbortSignal;
};

export class DownloadCancelledError extends Error {
  constructor(message = "Download cancelled.") {
    super(message);
    this.name = "DownloadCancelledError";
  }
}

export function isDownloadCancelledError(error: unknown): boolean {
  if (error instanceof DownloadCancelledError) {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return false;
}

function killChildProcess(child: ChildProcess): void {
  if (!child.pid) {
    return;
  }

  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], {
        stdio: "ignore",
        windowsHide: true,
        timeout: 5000,
      });
      return;
    }

    child.kill("SIGTERM");
  } catch (error) {
    logger.warn("DownloadService", "Failed to kill child process", {
      pid: child.pid,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function unlinkIfExists(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  try {
    unlinkSync(filePath);
  } catch {
    // Best-effort cleanup
  }
}

class DownloadService {
  private ffmpegChecked = false;
  private ffmpegAvailable = false;
  private activeController: AbortController | null = null;
  private activeChild: ChildProcess | null = null;
  private readonly config = getConfigService();
  private readonly musicService = getMusicService();

  getConfig() {
    return {
      enabled: this.config.get("downloadsEnabled") ?? false,
      directory: this.config.get("downloadDirectory") ?? "",
      format: (this.config.get("downloadFormat") ?? "mp3") as DownloadFormat,
    };
  }

  isDownloading(): boolean {
    return this.activeController !== null;
  }

  /**
   * Abort the in-flight batch. Returns true when a batch was running.
   */
  cancel(): boolean {
    if (!this.activeController) {
      return false;
    }

    this.activeController.abort();
    if (this.activeChild) {
      killChildProcess(this.activeChild);
      this.activeChild = null;
    }
    return true;
  }

  async resolveSearchTarget(result: SearchResult): Promise<DownloadTarget> {
    if (result.type === "song") {
      const track = result.data as Track;
      return { name: track.title, tracks: [track] };
    }

    if (result.type === "artist") {
      const artistName =
        "name" in result.data ? (result.data as { name: string }).name : "";
      if (!artistName) {
        throw new Error("Artist name is missing.");
      }

      const response = await this.musicService.search(artistName, {
        type: "songs",
        limit: 25,
      });
      const tracks = response.results
        .filter(row => row.type === "song")
        .map(row => row.data as Track);

      return { name: artistName, tracks: this.uniqueTracks(tracks) };
    }

    if (result.type === "playlist") {
      const playlistInfo = result.data as {
        playlistId?: string;
        name?: string;
      };
      if (!playlistInfo.playlistId) {
        throw new Error("Playlist id is missing.");
      }

      const playlist = await this.musicService.getPlaylist(
        playlistInfo.playlistId,
      );
      return {
        name: playlist.name || playlistInfo.name || "playlist",
        tracks: this.uniqueTracks(playlist.tracks),
      };
    }

    throw new Error(
      "Downloads are supported for songs, artists, and playlists.",
    );
  }

  resolvePlaylistTarget(playlist: Playlist): DownloadTarget {
    return {
      name: playlist.name,
      tracks: this.uniqueTracks(playlist.tracks),
    };
  }

  /**
   * Resolve a CLI/input token as a video id, YouTube URL, or saved local playlist id.
   */
  async resolveDownloadInput(input: string): Promise<DownloadTarget> {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Provide a video id, YouTube URL, or saved playlist id.");
    }

    const track = await this.musicService.getTrack(trimmed);
    if (track) {
      return { name: track.title, tracks: [track] };
    }

    const playlists = this.config.get("playlists") ?? [];
    const playlist = playlists.find(row => row.playlistId === trimmed);
    if (playlist) {
      return this.resolvePlaylistTarget(playlist);
    }

    throw new Error(
      `Could not resolve "${trimmed}" as a video id, YouTube URL, or saved playlist id.`,
    );
  }

  async downloadTracks(
    tracks: Track[],
    options: DownloadTracksOptions = {},
  ): Promise<DownloadResult> {
    if (this.activeController) {
      throw new Error(
        "A download is already in progress. Press Shift+D again to cancel.",
      );
    }

    const { directory: configuredDirectory, format } = this.getConfig();
    if (!configuredDirectory) {
      throw new Error("No download directory configured.");
    }

    const directory = ensureDownloadDirectory(configuredDirectory);
    await this.ensureFfmpeg();

    const controller = new AbortController();
    this.activeController = controller;
    const externalSignal = options.signal;
    const onExternalAbort = (): void => {
      controller.abort();
      if (this.activeChild) {
        killChildProcess(this.activeChild);
        this.activeChild = null;
      }
    };
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", onExternalAbort, {
          once: true,
        });
      }
    }

    const result: DownloadResult = {
      downloaded: 0,
      skipped: 0,
      failed: 0,
      cancelled: 0,
      errors: [],
    };
    const total = tracks.length;
    const { onProgress } = options;
    const signal = controller.signal;

    try {
      for (let index = 0; index < tracks.length; index++) {
        if (signal.aborted) {
          result.cancelled += tracks.length - index;
          break;
        }

        const track = tracks[index]!;
        const current = index + 1;
        const destination = getTrackDestinationPath(track, directory, format);
        const tempSource = `${destination}.source`;
        const tempCover = `${destination}.cover.jpg`;
        let removeSource = false;
        try {
          logger.info("DownloadService", "Starting track download", {
            videoId: track.videoId,
            title: track.title,
          });
          onProgress?.({ current, total, track, phase: "start" });
          mkdirSync(path.dirname(destination), { recursive: true });
          if (existsSync(destination)) {
            upsertDownloadsIndexEntry(track.videoId, destination, format);
            result.skipped++;
            onProgress?.({ current, total, track, phase: "skip" });
            logger.debug("DownloadService", "Skipping existing file", {
              destination,
            });
            continue;
          }

          await this.acquireAudioSource(track.videoId, tempSource, signal);
          this.throwIfAborted(signal);

          const hasCover = await this.downloadCoverArt(
            track.videoId,
            tempCover,
            signal,
          );
          this.throwIfAborted(signal);

          await this.convertAudio(
            tempSource,
            destination,
            format,
            track,
            hasCover ? tempCover : undefined,
            signal,
          );
          upsertDownloadsIndexEntry(track.videoId, destination, format);
          result.downloaded++;
          removeSource = true;
          onProgress?.({ current, total, track, phase: "done" });
          logger.info("DownloadService", "Track download complete", {
            videoId: track.videoId,
            destination,
          });
        } catch (error) {
          if (isDownloadCancelledError(error) || signal.aborted) {
            result.cancelled += tracks.length - index;
            onProgress?.({
              current,
              total,
              track,
              phase: "cancel",
              error: "Cancelled",
            });
            logger.info("DownloadService", "Download batch cancelled", {
              videoId: track.videoId,
              title: track.title,
            });
            break;
          }

          result.failed++;
          const message =
            error instanceof Error ? error.message : "Unknown download failure";
          result.errors.push(message);
          onProgress?.({
            current,
            total,
            track,
            phase: "fail",
            error: message,
          });
          logger.error("DownloadService", "Track download failed", {
            videoId: track.videoId,
            title: track.title,
            error: message,
          });
        } finally {
          unlinkIfExists(tempCover);
          if (removeSource) {
            unlinkIfExists(tempSource);
          }
        }
      }

      return result;
    } finally {
      externalSignal?.removeEventListener("abort", onExternalAbort);
      this.activeChild = null;
      this.activeController = null;
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new DownloadCancelledError();
    }
  }

  private uniqueTracks(tracks: Track[]): Track[] {
    const seen = new Set<string>();
    const unique: Track[] = [];
    for (const track of tracks) {
      if (!track?.videoId || seen.has(track.videoId)) continue;
      seen.add(track.videoId);
      unique.push(track);
    }

    return unique;
  }

  /**
   * Prefer yt-dlp (same dependency as playback), then in-process stream URL
   * extraction, then mpv --stream-record.
   * yt-dlp supports resume via --continue; stream/mpv paths restart from scratch.
   */
  private async acquireAudioSource(
    videoId: string,
    tempSource: string,
    signal: AbortSignal,
  ): Promise<void> {
    const errors: string[] = [];
    this.throwIfAborted(signal);

    try {
      logger.debug("DownloadService", "Attempting yt-dlp download", {
        videoId,
      });
      await this.recordViaYtDlp(videoId, tempSource, signal);
      logger.info("DownloadService", "Downloaded via yt-dlp", { videoId });
      return;
    } catch (ytdlpError) {
      if (isDownloadCancelledError(ytdlpError) || signal.aborted) {
        throw new DownloadCancelledError();
      }
      const message =
        ytdlpError instanceof Error ? ytdlpError.message : String(ytdlpError);
      errors.push(`yt-dlp: ${message}`);
      logger.warn(
        "DownloadService",
        "yt-dlp download failed, trying stream URL extraction",
        { videoId, error: message },
      );
    }

    this.throwIfAborted(signal);

    // Stream/mpv cannot resume partial yt-dlp bytes — start those fallbacks clean.
    unlinkIfExists(tempSource);

    try {
      logger.debug("DownloadService", "Attempting stream URL extraction", {
        videoId,
      });
      const streamUrl = await this.musicService.getStreamUrl(videoId);
      this.throwIfAborted(signal);
      const audioBuffer = await this.fetchAudio(streamUrl, signal);
      writeFileSync(tempSource, audioBuffer);
      logger.info("DownloadService", "Downloaded via stream URL", { videoId });
      return;
    } catch (streamError) {
      if (isDownloadCancelledError(streamError) || signal.aborted) {
        throw new DownloadCancelledError();
      }
      const message =
        streamError instanceof Error
          ? streamError.message
          : String(streamError);
      errors.push(`stream: ${message}`);
      logger.warn(
        "DownloadService",
        "Stream URL extraction failed, falling back to mpv recording",
        { videoId, error: message },
      );
    }

    this.throwIfAborted(signal);
    unlinkIfExists(tempSource);

    try {
      await this.recordViaMpv(videoId, tempSource, signal);
      logger.info("DownloadService", "Downloaded via mpv recording", {
        videoId,
      });
      return;
    } catch (mpvError) {
      if (isDownloadCancelledError(mpvError) || signal.aborted) {
        throw new DownloadCancelledError();
      }
      const message =
        mpvError instanceof Error ? mpvError.message : String(mpvError);
      errors.push(`mpv: ${message}`);
    }

    throw new Error(
      `Download failed. Install or update yt-dlp and ffmpeg, then retry. (${errors.join(
        "; ",
      )})`,
    );
  }

  private async fetchAudio(url: string, signal: AbortSignal): Promise<Buffer> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio stream (${response.status}).`);
    }

    const audio = await response.arrayBuffer();
    return Buffer.from(audio);
  }

  private async ensureFfmpeg(): Promise<void> {
    if (this.ffmpegChecked) {
      if (!this.ffmpegAvailable) {
        throw new Error(
          "ffmpeg is required for downloads. Install ffmpeg and ensure it is available in PATH.",
        );
      }
      return;
    }

    this.ffmpegChecked = true;
    try {
      await this.runProcess("ffmpeg", ["-version"]);
      this.ffmpegAvailable = true;
    } catch {
      this.ffmpegAvailable = false;
      throw new Error(
        "ffmpeg is required for downloads. Install ffmpeg and ensure it is available in PATH.",
      );
    }
  }

  private async convertAudio(
    sourcePath: string,
    destinationPath: string,
    format: DownloadFormat,
    track: Track,
    coverPath: string | undefined,
    signal: AbortSignal,
  ): Promise<void> {
    const metadataArgs = this.buildMetadataArgs(track);
    if (format === "mp3") {
      const args = ["-y", "-i", sourcePath];
      if (coverPath) {
        args.push("-i", coverPath, "-map", "0:a:0", "-map", "1:v:0");
      } else {
        args.push("-map", "0:a:0", "-vn");
      }

      args.push("-codec:a", "libmp3lame", "-q:a", "2", ...metadataArgs);

      if (coverPath) {
        args.push(
          "-codec:v",
          "mjpeg",
          "-disposition:v:0",
          "attached_pic",
          "-metadata:s:v",
          "title=Album cover",
          "-metadata:s:v",
          "comment=Cover (front)",
        );
      }

      args.push(destinationPath);
      await this.runProcess("ffmpeg", args, signal);
      return;
    }

    const args = ["-y", "-i", sourcePath];
    if (coverPath) {
      args.push("-i", coverPath, "-map", "0:a:0", "-map", "1:v:0");
    } else {
      args.push("-map", "0:a:0", "-vn");
    }

    args.push("-codec:a", "aac", "-b:a", "192k", ...metadataArgs);
    if (coverPath) {
      args.push("-codec:v", "mjpeg", "-disposition:v:0", "attached_pic");
    }

    args.push(destinationPath);
    await this.runProcess("ffmpeg", args, signal);
  }

  private buildMetadataArgs(track: Track): string[] {
    const artist =
      track.artists
        .map(row => row.name)
        .filter(Boolean)
        .join(", ") || "Unknown Artist";
    const album = track.album?.name || "Singles";
    return [
      "-metadata",
      `title=${track.title}`,
      "-metadata",
      `artist=${artist}`,
      "-metadata",
      `album=${album}`,
    ];
  }

  private async runProcess(
    command: string,
    args: string[],
    signal?: AbortSignal,
  ): Promise<{ stdout: string; stderr: string }> {
    if (signal?.aborted) {
      throw new DownloadCancelledError();
    }

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DownloadCancelledError());
        return;
      }

      const child = spawn(command, args, { windowsHide: true });
      this.activeChild = child;
      let stderr = "";
      let stdout = "";

      const onAbort = (): void => {
        killChildProcess(child);
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      child.stderr?.on("data", chunk => {
        stderr += String(chunk);
      });
      child.stdout?.on("data", chunk => {
        stdout += String(chunk);
      });
      child.on("error", error => {
        signal?.removeEventListener("abort", onAbort);
        if (this.activeChild === child) {
          this.activeChild = null;
        }
        reject(error);
      });
      child.on("exit", code => {
        signal?.removeEventListener("abort", onAbort);
        if (this.activeChild === child) {
          this.activeChild = null;
        }

        if (signal?.aborted) {
          reject(new DownloadCancelledError());
          return;
        }

        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(
          new Error(
            (stderr || stdout).trim() || `${command} exited with code ${code}`,
          ),
        );
      });
    });
  }

  private async recordViaYtDlp(
    videoId: string,
    outputPath: string,
    signal: AbortSignal,
  ): Promise<void> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const config = getConfigService();
    const ytdlpArgs = [
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--continue",
      "--js-runtimes",
      "node",
      "-f",
      "bestaudio",
      "--output",
      // yt-dlp treats --output as a template; titles containing e.g.
      // "%(id)s" would otherwise be expanded and the file never found.
      outputPath.replace(/%/g, "%%"),
    ];
    appendYtDlpCookieArgs(ytdlpArgs, {
      cookiesFile: config.get("cookiesFile"),
      cookiesFromBrowser: config.get("cookiesFromBrowser"),
    });
    ytdlpArgs.push(watchUrl);

    await this.runProcess("yt-dlp", ytdlpArgs, signal);
    if (!existsSync(outputPath)) {
      throw new Error(
        "yt-dlp exited successfully but no output file was found",
      );
    }
  }

  private async downloadCoverArt(
    videoId: string,
    outputPath: string,
    signal: AbortSignal,
  ): Promise<boolean> {
    const candidates = [
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ];
    for (const url of candidates) {
      this.throwIfAborted(signal);
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) continue;
        const image = Buffer.from(await response.arrayBuffer());
        if (image.length === 0) continue;
        writeFileSync(outputPath, image);
        return true;
      } catch (error) {
        if (isDownloadCancelledError(error) || signal.aborted) {
          throw new DownloadCancelledError();
        }
        continue;
      }
    }

    return false;
  }

  private async recordViaMpv(
    videoId: string,
    outputPath: string,
    signal: AbortSignal,
  ): Promise<void> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    await this.runProcess(
      "mpv",
      [
        watchUrl,
        "--no-video",
        "--ao=null",
        "--ytdl=yes",
        "--really-quiet",
        `--stream-record=${outputPath}`,
      ],
      signal,
    );
    if (!existsSync(outputPath)) {
      throw new Error("mpv exited successfully but no output file was found");
    }
  }
}

let downloadServiceInstance: DownloadService | null = null;

export function getDownloadService(): DownloadService {
  if (!downloadServiceInstance) {
    downloadServiceInstance = new DownloadService();
  }
  return downloadServiceInstance;
}

export function resetDownloadServiceForTests(): void {
  if (downloadServiceInstance?.isDownloading()) {
    downloadServiceInstance.cancel();
  }
  downloadServiceInstance = null;
}
