import { useEffect } from "react";

import type { RadioStation, StreamNowPlaying, Track } from "../types";

interface UseMediaSessionOptions {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackMode?: string;
  duration: number;
  progress: number;
  currentStation: RadioStation | null;
  streamNowPlaying: StreamNowPlaying | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
}

function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

export function useMediaSession(options: UseMediaSessionOptions): void {
  const {
    currentTrack,
    isPlaying,
    playbackMode,
    duration,
    progress,
    currentStation,
    streamNowPlaying,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    onSeek,
  } = options;

  useEffect(() => {
    if (!isMediaSessionSupported()) {
      return;
    }

    if (playbackMode === "stream" && currentStation) {
      const title = streamNowPlaying?.title || currentStation.name;
      const artist =
        streamNowPlaying?.artist || currentStation.genre || "Radio";

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: currentStation.name,
        artwork: [],
      });
      return;
    }

    if (currentTrack) {
      const artists = currentTrack.artists.map(a => a.name).join(", ");
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: artists,
        album: currentTrack.album?.name ?? "",
        artwork: [
          {
            src: `https://img.youtube.com/vi/${currentTrack.videoId}/hqdefault.jpg`,
            sizes: "480x360",
            type: "image/jpeg",
          },
          {
            src: `https://img.youtube.com/vi/${currentTrack.videoId}/mqdefault.jpg`,
            sizes: "320x180",
            type: "image/jpeg",
          },
          {
            src: `https://img.youtube.com/vi/${currentTrack.videoId}/default.jpg`,
            sizes: "120x90",
            type: "image/jpeg",
          },
        ],
      });
      return;
    }

    navigator.mediaSession.metadata = null;
  }, [currentTrack, playbackMode, currentStation, streamNowPlaying]);

  useEffect(() => {
    if (!isMediaSessionSupported()) {
      return;
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore - some browsers restrict playbackState
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isMediaSessionSupported()) {
      return;
    }

    if (
      playbackMode === "stream" ||
      !currentTrack ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      try {
        const nav = navigator.mediaSession as unknown as {
          setPositionState?: (state: unknown) => void;
        };
        nav.setPositionState?.({
          duration: 0,
          playbackRate: 1,
          position: 0,
        });
      } catch {
        // Ignore
      }
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.max(0, Math.min(duration, progress)),
      });
    } catch {
      // Ignore - duration must be finite positive
    }
  }, [currentTrack, playbackMode, duration, progress]);

  useEffect(() => {
    if (!isMediaSessionSupported()) {
      return;
    }

    const setHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ): void => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Log but tolerate unsupported actions
      }
    };

    setHandler("play", () => onPlay());
    setHandler("pause", () => onPause());
    setHandler("previoustrack", () => onPrevious());
    setHandler("nexttrack", () => onNext());
    setHandler("seekbackward", details => {
      const offset = details.seekOffset ?? 10;
      const target = Math.max(0, progress - offset);
      onSeek(target);
    });
    setHandler("seekforward", details => {
      const offset = details.seekOffset ?? 10;
      const dur = Number.isFinite(duration)
        ? duration
        : Number.MAX_SAFE_INTEGER;
      const target = Math.min(dur, progress + offset);
      onSeek(target);
    });
    setHandler("seekto", details => {
      if (
        details.seekTime !== null &&
        details.seekTime !== undefined &&
        Number.isFinite(details.seekTime)
      ) {
        onSeek(details.seekTime);
      }
    });
    setHandler("stop", () => onPause());

    return () => {
      setHandler("play", null);
      setHandler("pause", null);
      setHandler("previoustrack", null);
      setHandler("nexttrack", null);
      setHandler("seekbackward", null);
      setHandler("seekforward", null);
      setHandler("seekto", null);
      setHandler("stop", null);
    };
  }, [onPlay, onPause, onNext, onPrevious, onSeek, progress, duration]);
}
