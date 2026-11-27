import { spawn } from "node:child_process";

import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";
import { appendYtDlpCookieArgs } from "../player/ytdl-cookies.ts";

// The signed URL itself carries the authoritative expiry (~6h); this
// cap only stops a URL without `expire` from living forever.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const urlCache = new Map<string, { url: string; expiresAt: number }>();

function readCachedUrl(videoId: string): string | null {
  const entry = urlCache.get(videoId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    urlCache.delete(videoId);
    return null;
  }
  urlCache.delete(videoId);
  urlCache.set(videoId, entry);
  return entry.url;
}

function expiryFromUrl(url: string): number {
  const match = /[?&]expire=(\d+)/.exec(url);
  const cap = Date.now() + CACHE_TTL_MS;
  if (!match) return cap;
  return Math.min(cap, Number(match[1]) * 1000 - 5 * 60 * 1000);
}

/** Drop a cached URL so the next resolve hits yt-dlp again. */
export function invalidateCachedStreamUrl(videoId: string): void {
  urlCache.delete(videoId);
}

function storeCachedUrl(videoId: string, url: string): void {
  urlCache.set(videoId, { url, expiresAt: expiryFromUrl(url) });
  while (urlCache.size > CACHE_MAX_ENTRIES) {
    const oldest = urlCache.keys().next().value;
    if (oldest === undefined) break;
    urlCache.delete(oldest);
  }
}

/**
 * Resolve a direct audio URL via yt-dlp. Used when youtubei.js cannot
 * decipher formats (SABR / empty cipher — "No valid URL to decipher").
 *
 * yt-dlp (>= 2026) only solves the YouTube `n` signature challenge when it
 * actually downloads, so `-g`/`-j` output carries an untransformed `n` and
 * googlevideo answers 403. Forcing `--no-simulate` plus a 1-byte size cap makes
 * yt-dlp run the JS challenge without downloading anything.
 */
export async function getYtDlpStreamUrl(videoId: string): Promise<string> {
  const cached = readCachedUrl(videoId);
  if (cached) {
    logger.debug("YtDlpStreamUrl", "Using cached stream URL", { videoId });
    return cached;
  }

  const config = getConfigService();
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    "-f",
    "ba/bestaudio/best",
    "--no-simulate",
    "--max-filesize",
    "1k",
    "--print",
    "%(url)s",
    "--no-playlist",
    "--no-warnings",
  ];
  const proxy = config.get("proxy");
  if (proxy) {
    args.push("--proxy", proxy);
  }
  appendYtDlpCookieArgs(args, {
    cookiesFile: config.get("cookiesFile"),
    cookiesFromBrowser: config.get("cookiesFromBrowser"),
  });
  args.push(watchUrl);

  logger.debug("YtDlpStreamUrl", "Resolving stream URL", { videoId });

  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", error => {
      reject(
        new Error(
          `yt-dlp failed to start: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    });

    child.on("close", code => {
      const url = stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(
          line => line.startsWith("http://") || line.startsWith("https://"),
        );

      if (code === 0 && url) {
        logger.info("YtDlpStreamUrl", "Resolved stream URL via yt-dlp", {
          videoId,
          urlLength: url.length,
        });
        storeCachedUrl(videoId, url);
        resolve(url);
        return;
      }

      reject(
        new Error(
          `yt-dlp stream resolution failed (code ${code ?? "null"}): ${stderr.trim() || "no url"}`,
        ),
      );
    });
  });
}
