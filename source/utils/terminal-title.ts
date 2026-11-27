import type { Track } from "../types/youtube-music.types.ts";

export const DEFAULT_TERMINAL_TITLE = "youtube-music-cli";

const CSI_SEQUENCE = /\p{Cc}\[[0-9;?]*[ -/]*[@-~]/gu;
const OSC_SEQUENCE = /\p{Cc}\][^\p{Cc}]*\p{Cc}?/gu;
const ALL_CONTROLS = /\p{C}/gu;

export function sanitizeTitleText(value: string): string {
  return value
    .replace(OSC_SEQUENCE, "")
    .replace(CSI_SEQUENCE, "")
    .replace(ALL_CONTROLS, "")
    .trim();
}

export function buildTerminalTitle(options: {
  currentTrack: Track | null;
  isPlaying: boolean;
}): string {
  const { currentTrack, isPlaying } = options;
  if (!currentTrack) {
    return DEFAULT_TERMINAL_TITLE;
  }

  const title = sanitizeTitleText(currentTrack.title) || "Unknown";
  const artist = sanitizeTitleText(currentTrack.artists?.[0]?.name ?? "");
  const parts = [title];
  if (artist) {
    parts.push(artist);
  }
  parts.push(isPlaying ? "▶" : "⏸", "ymc");
  return parts.join(" · ");
}

export function formatTerminalTitleSequence(title: string): string {
  return `]0;${sanitizeTitleText(title)}`;
}
