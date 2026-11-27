import { getConfigService } from "../../services/config/config.service.ts";
import { shouldLoopExplicitQueue } from "../../services/player/autoplay-coordinator.ts";
import {
  advanceInPlaybackOrder,
  appendIndexToPlaybackOrder,
  buildShuffledOrder,
  previousInPlaybackOrder,
  resolvePlaybackOrder,
} from "../../services/player/playback-order.ts";
import type {
  PlaybackMode,
  RadioStation,
  StreamNowPlaying,
} from "../../types/radio-station.types.ts";
import type { RadioSeed } from "../../types/radio.types.ts";
import type { Track } from "../../types/youtube-music.types.ts";
import { resolveTrackPlayUrl } from "../../utils/local-track.ts";

export type RepeatMode = "off" | "all" | "one";

export interface ImmersivePlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  playbackOrder: number[] | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isDiscoMode: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  autoplay: boolean;
  /** User-queued tracks count; autoplay extensions sit beyond this boundary. */
  explicitQueueLength: number;
  radioIsActive: boolean;
  radioSeed: RadioSeed | null;
  playbackMode: PlaybackMode;
  currentStation: RadioStation | null;
  streamNowPlaying: StreamNowPlaying | null;
}

export function createInitialImmersiveState(
  overrides: Partial<ImmersivePlayerState> = {},
): ImmersivePlayerState {
  return {
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    playbackOrder: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 70,
    isDiscoMode: false,
    shuffle: false,
    repeat: "off",
    autoplay: true,
    explicitQueueLength: 0,
    radioIsActive: false,
    radioSeed: null,
    playbackMode: "youtube",
    currentStation: null,
    streamNowPlaying: null,
    ...overrides,
  };
}

export { buildShuffledOrder };

export function shuffleQueueOrder(
  state: ImmersivePlayerState,
  startAt = state.queueIndex,
): void {
  state.playbackOrder = resolvePlaybackOrder(true, state.queue.length, startAt);
}

export function setQueue(
  state: ImmersivePlayerState,
  tracks: Track[],
  startIndex = 0,
): void {
  const safeStart = Math.min(
    Math.max(0, startIndex),
    Math.max(0, tracks.length - 1),
  );
  state.queue = [...tracks];
  state.queueIndex = safeStart;
  state.currentTrack = tracks[safeStart] ?? tracks[0] ?? null;
  state.explicitQueueLength = tracks.length;
  state.playbackOrder = resolvePlaybackOrder(
    state.shuffle,
    tracks.length,
    safeStart,
  );
}

export function addToQueue(state: ImmersivePlayerState, track: Track): void {
  state.queue.push(track);
  if (!state.currentTrack) {
    state.currentTrack = track;
    state.queueIndex = 0;
  }
  if (state.shuffle && state.queue.length > 1) {
    shuffleQueueOrder(state, state.queueIndex);
  } else {
    state.playbackOrder = null;
  }
}

/** Append autoplay suggestions without reshuffling the active playback order. */
export function appendTracksForAutoplay(
  state: ImmersivePlayerState,
  tracks: Track[],
): number {
  const existingIds = new Set(
    state.queue.map(track => track.videoId).filter(Boolean),
  );
  let added = 0;

  for (const track of tracks) {
    if (!track.videoId || existingIds.has(track.videoId)) {
      continue;
    }

    existingIds.add(track.videoId);
    state.queue.push(track);
    const newIndex = state.queue.length - 1;
    state.playbackOrder = appendIndexToPlaybackOrder(
      state.playbackOrder,
      newIndex,
      state.shuffle,
      state.queue.length,
      state.queueIndex,
    );
    added++;
  }

  return added;
}

export function toggleAutoplay(state: ImmersivePlayerState): boolean {
  state.autoplay = !state.autoplay;
  return state.autoplay;
}

export function toggleShuffle(state: ImmersivePlayerState): boolean {
  state.shuffle = !state.shuffle;
  state.playbackOrder = resolvePlaybackOrder(
    state.shuffle,
    state.queue.length,
    state.queueIndex,
  );
  return state.shuffle;
}

export function cycleRepeat(state: ImmersivePlayerState): RepeatMode {
  const modes: RepeatMode[] = ["off", "all", "one"];
  const index = modes.indexOf(state.repeat);
  state.repeat = modes[(index + 1) % modes.length] ?? "off";
  return state.repeat;
}

export function advanceQueue(state: ImmersivePlayerState): Track | null {
  if (state.queue.length === 0) {
    state.currentTrack = null;
    return null;
  }

  const result = advanceInPlaybackOrder({
    queueLength: state.queue.length,
    queueIndex: state.queueIndex,
    playbackOrder: state.playbackOrder,
    shuffle: state.shuffle,
    shouldLoop: shouldLoopExplicitQueue(state),
  });
  state.playbackOrder = result.playbackOrder;

  if (!result.advanced) {
    state.isPlaying = false;
    return null;
  }

  state.queueIndex = result.queueIndex;
  state.currentTrack = state.queue[result.queueIndex] ?? null;
  state.currentTime = 0;
  return state.currentTrack;
}

export function previousQueue(state: ImmersivePlayerState): Track | null {
  if (state.queue.length === 0) {
    return null;
  }

  if (state.currentTime > 3 && state.currentTrack) {
    state.currentTime = 0;
    return state.currentTrack;
  }

  const result = previousInPlaybackOrder({
    queueLength: state.queue.length,
    queueIndex: state.queueIndex,
    playbackOrder: state.playbackOrder,
    shuffle: state.shuffle,
  });
  state.playbackOrder = result.playbackOrder;
  state.queueIndex = result.queueIndex;
  state.currentTrack = state.queue[result.queueIndex] ?? null;
  state.currentTime = 0;
  return state.currentTrack;
}

export function getUpcomingTracks(
  state: ImmersivePlayerState,
  count: number,
): Track[] {
  if (state.queue.length === 0 || count <= 0) {
    return [];
  }

  if (state.shuffle && state.queue.length > 1 && state.playbackOrder) {
    const orderPos = state.playbackOrder.indexOf(state.queueIndex);
    if (orderPos === -1) {
      return [];
    }

    const upcoming: Track[] = [];
    for (
      let step = 1;
      step < state.playbackOrder.length && upcoming.length < count;
      step++
    ) {
      let pos = orderPos + step;
      if (pos >= state.playbackOrder.length) {
        if (!shouldLoopExplicitQueue(state)) {
          break;
        }
        pos %= state.playbackOrder.length;
      }

      const queueIndex = state.playbackOrder[pos];
      if (queueIndex === undefined) {
        continue;
      }

      const track = state.queue[queueIndex];
      if (track) {
        upcoming.push(track);
      }
    }
    return upcoming;
  }

  const upcoming: Track[] = [];
  for (let step = 1; upcoming.length < count; step++) {
    let idx = state.queueIndex + step;
    if (idx >= state.queue.length) {
      if (!shouldLoopExplicitQueue(state)) {
        break;
      }
      idx %= state.queue.length;
      if (idx === state.queueIndex) {
        break;
      }
    }

    const track = state.queue[idx];
    if (track) {
      upcoming.push(track);
    }
  }
  return upcoming;
}

export function resolveRandomFavoriteStartIndex(queueLength: number): number {
  if (queueLength <= 0) {
    return 0;
  }
  return Math.floor(Math.random() * queueLength);
}

export function trackArtists(track: Track): string {
  if (track.artists.length === 0) {
    return "Unknown Artist";
  }
  return track.artists.map(artist => artist.name).join(", ");
}

export function trackYouTubeUrl(track: Track): string {
  return `https://www.youtube.com/watch?v=${track.videoId}`;
}

export function resolveImmersiveTrackPlayUrl(track: Track): {
  url: string;
  source: "local" | "youtube";
} {
  const config = getConfigService();
  return resolveTrackPlayUrl(track, {
    preferLocal: config.get("preferLocalPlayback") ?? true,
    downloadDirectory: config.get("downloadDirectory"),
    downloadFormat: config.get("downloadFormat") ?? "mp3",
  });
}

export function formatRepeatLabel(repeat: RepeatMode): string {
  if (repeat === "all") {
    return "ALL";
  }
  if (repeat === "one") {
    return "ONE";
  }
  return "OFF";
}
