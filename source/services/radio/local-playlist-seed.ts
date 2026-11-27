// Pure helpers for seeding radio from a locally saved playlist.
// Kept dependency-free so tests can exercise them without loading
// the heavy music API stack.
import type { Track } from "../../types/youtube-music.types.ts";

export interface LocalPlaylistRef {
  playlistId: string;
  tracks: Track[];
}

export function shuffleTracks(tracks: Track[]): Track[] {
  const result = [...tracks];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i]!;
    const other = result[j]!;
    result[i] = other;
    result[j] = current;
  }
  return result;
}

/** Returns shuffled tracks for the given playlist, or null when missing. */
export function findLocalPlaylistTracks(
  playlists: readonly LocalPlaylistRef[],
  playlistId: string,
): Track[] | null {
  const playlist = playlists.find(entry => entry.playlistId === playlistId);
  if (!playlist) return null;
  return shuffleTracks(playlist.tracks ?? []);
}
