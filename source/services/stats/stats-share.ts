import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ListeningStats } from "../../types/stats.types.ts";
import { CONFIG_DIR } from "../../utils/constants.ts";

export const STATS_SHARE_DEFAULT_PATH = path.join(
  CONFIG_DIR,
  "stats-share.txt",
);

const REPO_URL = "https://github.com/involvex/youtube-music-cli";

function formatListeningTime(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

export function formatStatsShareCard(stats: ListeningStats): string {
  const topTracks =
    stats.topTracks.length === 0
      ? "  (none yet)"
      : stats.topTracks
          .slice(0, 5)
          .map((item, index) => {
            const artist =
              item.track.artists?.map(a => a.name).join(", ") || "Unknown";
            return `  ${index + 1}. ${item.track.title} — ${artist} (${item.playCount})`;
          })
          .join("\n");

  const topArtists =
    stats.topArtists.length === 0
      ? "  (none yet)"
      : stats.topArtists
          .slice(0, 5)
          .map(
            (item, index) => `  ${index + 1}. ${item.name} (${item.playCount})`,
          )
          .join("\n");

  return [
    "My youtube-music-cli statistics:",
    "",
    `  Total plays: ${stats.totalPlays.toLocaleString()}`,
    `  Listening time: ${formatListeningTime(stats.totalListeningMinutes)}`,
    `  Unique tracks: ${stats.uniqueTracks} · Unique artists: ${stats.uniqueArtists}`,
    `  Current streak: ${stats.currentStreak}d · Longest: ${stats.longestStreak}d`,
    "",
    "  Top tracks:",
    topTracks,
    "",
    "  Top artists:",
    topArtists,
    "",
    `Get your stats with youtube-music-cli — ${REPO_URL}`,
  ].join("\n");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("clip", [], {
          stdio: ["pipe", "ignore", "ignore"],
        });
        child.on("error", reject);
        child.on("close", code => {
          if (code === 0) resolve();
          else reject(new Error(`clip exited ${code}`));
        });
        child.stdin.end(text, "utf8");
      });
      return true;
    }

    if (platform === "darwin") {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("pbcopy", [], {
          stdio: ["pipe", "ignore", "ignore"],
        });
        child.on("error", reject);
        child.on("close", code => {
          if (code === 0) resolve();
          else reject(new Error(`pbcopy exited ${code}`));
        });
        child.stdin.end(text, "utf8");
      });
      return true;
    }

    const linuxTools = ["wl-copy", "xclip"] as const;
    for (const tool of linuxTools) {
      try {
        await new Promise<void>((resolve, reject) => {
          const args = tool === "xclip" ? ["-selection", "clipboard"] : [];
          const child = spawn(tool, args, {
            stdio: ["pipe", "ignore", "ignore"],
          });
          child.on("error", reject);
          child.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`${tool} exited ${code}`));
          });
          child.stdin.end(text, "utf8");
        });
        return true;
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export async function writeStatsShareFile(
  card: string,
  filePath: string = STATS_SHARE_DEFAULT_PATH,
): Promise<string> {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(resolved, `${card}\n`, "utf8");
  return resolved;
}
