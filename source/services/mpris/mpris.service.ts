// MPRIS service — Linux only, enables playerctl / media key support
// No-ops on non-Linux platforms
import { logger } from "../logger/logger.service.ts";

interface TrackInfo {
  title: string;
  artist: string;
  duration: number; // microseconds (MPRIS standard)
}

type MprisPlayer = {
  metadata: Record<string, unknown>;
  playbackStatus: string;
  canPlay: boolean;
  canPause: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  canSeek: boolean;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  objectPath: string;
};

type MprisOptions = {
  name: string;
  identity: string;
  supportedInterfaces: string[];
};

type MprisModule = {
  /** Original package (v1) exposure. */
  createPlayer?: (opts: MprisOptions) => MprisPlayer;
  /** Original package (v2) and the maintained fork expose the class. */
  new (opts: MprisOptions): MprisPlayer;
};

type PlaybackCallbacks = {
  onPlay?: () => void;
  onPause?: () => void;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
};

export class MprisService {
  private player: MprisPlayer | null = null;
  private pendingTrack: TrackInfo | null = null;
  private pendingPlaying: boolean | null = null;

  get isSupported(): boolean {
    return process.platform === "linux";
  }

  async initialize(callbacks: PlaybackCallbacks = {}): Promise<void> {
    if (!this.isSupported) {
      logger.debug("MprisService", "MPRIS not supported on this platform", {
        platform: process.platform,
      });
      return;
    }

    try {
      // @jellybrick/mpris-service is ESM and default-exports the Player
      // class; the original package used a createPlayer factory (v1) or
      // the class (v2). Accept every shape.
      const imported =
        (await import("@jellybrick/mpris-service")) as unknown as {
          default?: MprisModule;
        } & MprisModule;
      const mpris = imported.default ?? imported;
      const options: MprisOptions = {
        name: "youtube-music-cli",
        identity: "YouTube Music CLI",
        supportedInterfaces: ["player"],
      };
      this.player =
        typeof mpris.createPlayer === "function"
          ? mpris.createPlayer(options)
          : new mpris(options);

      // Wire up MPRIS events to player callbacks
      if (callbacks.onPlay) this.player.on("play", callbacks.onPlay);
      if (callbacks.onPause) this.player.on("pause", callbacks.onPause);
      if (callbacks.onPlayPause)
        this.player.on("playpause", callbacks.onPlayPause);
      if (callbacks.onNext) this.player.on("next", callbacks.onNext);
      if (callbacks.onPrevious)
        this.player.on("previous", callbacks.onPrevious);

      this.player.canPlay = true;
      this.player.canPause = true;
      this.player.canGoNext = true;
      this.player.canGoPrevious = true;
      this.player.canSeek = false;

      if (this.pendingTrack) {
        this.updateTrack(this.pendingTrack, this.pendingPlaying ?? false);
      } else if (this.pendingPlaying !== null) {
        this.setPlaying(this.pendingPlaying);
      }

      logger.info("MprisService", "MPRIS player initialized");
    } catch (error) {
      logger.warn("MprisService", "Could not initialize MPRIS", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  updateTrack(track: TrackInfo, isPlaying: boolean): void {
    this.pendingTrack = track;
    this.pendingPlaying = isPlaying;
    if (!this.player) return;
    try {
      this.player.metadata = {
        "mpris:length": track.duration,
        "xesam:title": track.title,
        "xesam:artist": [track.artist],
      };
      this.player.playbackStatus = isPlaying ? "Playing" : "Paused";
    } catch {
      // Ignore MPRIS update errors
    }
  }

  setPlaying(playing: boolean): void {
    this.pendingPlaying = playing;
    if (!this.player) return;
    try {
      this.player.playbackStatus = playing ? "Playing" : "Paused";
    } catch {
      // Ignore
    }
  }
}

let instance: MprisService | null = null;
export const getMprisService = (): MprisService => {
  if (!instance) instance = new MprisService();
  return instance;
};
