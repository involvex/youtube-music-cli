// Shared types for web UI (copied from source/types/)

export interface Track {
  videoId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  duration?: number;
}

export interface Artist {
  artistId: string;
  name: string;
}

export interface Album {
  albumId: string;
  name: string;
  artists: Artist[];
}

export interface Playlist {
  playlistId: string;
  name: string;
  tracks: Track[];
}

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  region?: string;
  genre?: string;
  source?: "builtin" | "radio-browser" | "live-catalog";
  stationuuid?: string;
}

export interface StreamNowPlaying {
  title: string | null;
  artist: string | null;
  raw: string | null;
}

export type PlaybackMode = "youtube" | "stream";

export type RadioCountryOption = {
  code: string;
  label: string;
};

export const RADIO_COUNTRY_OPTIONS: readonly RadioCountryOption[] = [
  { code: "DE", label: "Germany" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "ALL", label: "All countries" },
] as const;

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  speed: number;
  progress: number;
  duration: number;
  queue: Track[];
  queuePosition: number;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
  autoplay: boolean;
  isLoading: boolean;
  error: string | null;
  playbackMode?: PlaybackMode;
  currentStation?: RadioStation | null;
  streamNowPlaying?: StreamNowPlaying | null;
  mediaSource?: "local" | "youtube" | null;
  radioIsActive?: boolean;
  explicitQueueLength?: number;
}

export interface PlayerAction {
  category:
    | "PLAY"
    | "PAUSE"
    | "RESUME"
    | "STOP"
    | "NEXT"
    | "PREVIOUS"
    | "SEEK"
    | "SET_VOLUME"
    | "VOLUME_UP"
    | "VOLUME_DOWN"
    | "VOLUME_FINE_UP"
    | "VOLUME_FINE_DOWN"
    | "TOGGLE_SHUFFLE"
    | "TOGGLE_REPEAT"
    | "TOGGLE_AUTOPLAY"
    | "SET_QUEUE"
    | "ADD_TO_QUEUE"
    | "REMOVE_FROM_QUEUE"
    | "CLEAR_QUEUE"
    | "SET_QUEUE_POSITION"
    | "UPDATE_PROGRESS"
    | "SET_DURATION"
    | "TICK"
    | "SET_LOADING"
    | "SET_ERROR"
    | "RESTORE_STATE"
    | "SET_SPEED"
    | "PLAY_STREAM";
  track?: Track;
  position?: number;
  volume?: number;
  speed?: number;
  queue?: Track[];
  index?: number;
  progress?: number;
  duration?: number;
  loading?: boolean;
  error?: string | null;
  currentTrack?: Track | null;
  queuePosition?: number;
  shuffle?: boolean;
  repeat?: "off" | "all" | "one";
  station?: RadioStation;
}

export interface SearchResult {
  type: "song" | "album" | "artist" | "playlist";
  data: Track | Album | Artist | Playlist;
}

export interface ServerMessage {
  type:
    | "state-update"
    | "event"
    | "error"
    | "auth"
    | "search-results"
    | "config-update"
    | "live-streams-list"
    | "radio-search-results"
    | "favorites-list";
  state?: Partial<PlayerState>;
  event?: string;
  data?: unknown;
  error?: string;
  results?: SearchResult[];
  config?: Partial<Config>;
  stations?: RadioStation[];
  tracks?: Track[];
}

export interface ClientMessage {
  type:
    | "command"
    | "auth-request"
    | "search-request"
    | "config-update"
    | "live-streams-request"
    | "radio-search-request"
    | "favorites-request"
    | "favorites-toggle";
  action?: PlayerAction;
  token?: string;
  query?: string;
  searchType?: "all" | "songs" | "artists" | "albums" | "playlists";
  config?: Partial<Config>;
  countrycode?: string;
  track?: Track;
}

export interface Config {
  theme: string;
  volume: number;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
  streamQuality: "low" | "medium" | "high";
  audioNormalization: boolean;
  notifications: boolean;
  discordRichPresence: boolean;
}

export interface ImportProgress {
  status:
    | "idle"
    | "fetching"
    | "matching"
    | "creating"
    | "completed"
    | "failed"
    | "cancelled";
  current: number;
  total: number;
  currentTrack?: string;
  message: string;
}
