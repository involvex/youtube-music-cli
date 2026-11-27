// Playlist import type definitions

import type { Track } from "./youtube-music.types.ts";

/** Supported import sources */
export type ImportSource = "spotify" | "youtube";

/** Import operation status */
export type ImportStatus =
  | "idle"
  | "fetching"
  | "matching"
  | "creating"
  | "completed"
  | "failed"
  | "cancelled";

/** Match confidence level */
export type MatchConfidence = "high" | "medium" | "low" | "none";

/** Import progress information */
export interface ImportProgress {
  status: ImportStatus;
  current: number;
  total: number;
  currentTrack?: string;
  message: string;
}

/** Track match result */
export interface TrackMatch {
  originalTrack: SpotifyTrack | YouTubeTrack;
  matchedTrack: Track | null;
  confidence: MatchConfidence;
  error?: string;
}

/** Import result summary */
export interface ImportResult {
  playlistId: string;
  playlistName: string;
  source: ImportSource;
  total: number;
  matched: number;
  failed: number;
  matches: TrackMatch[];
  errors: string[];
  duration: number; // ms
}

// Spotify types

/** Spotify track data */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album?: string;
  duration: number;
  trackNumber?: number;
}

/** Spotify playlist data */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  tracks: SpotifyTrack[];
  isPublic: boolean;
  owner?: string;
  url?: string;
}

// YouTube types

/** YouTube track data (for import) */
export interface YouTubeTrack {
  id: string;
  title: string;
  name: string; // Alias for title for compatibility with SpotifyTrack
  artists: string[];
  album?: string;
  duration: number;
  thumbnail?: string;
}

/** YouTube playlist data (for import) */
export interface YouTubePlaylist {
  id: string;
  name: string;
  description?: string;
  tracks: YouTubeTrack[];
  channelTitle?: string;
  url?: string;
}
