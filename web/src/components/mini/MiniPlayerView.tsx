import { ExternalLink, Maximize2 } from "lucide-react";

import type { RadioStation, StreamNowPlaying, Track } from "../../types";
import NowPlaying from "../player/NowPlaying";
import Transport, { type TransportProps } from "../player/Transport";
import ProgressBar from "../ProgressBar";

interface MiniPlayerViewProps {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  autoplay: boolean;
  progress: number;
  duration: number;
  playbackMode?: string;
  station: RadioStation | null;
  streamNowPlaying: StreamNowPlaying | null;
  isFavorite: boolean;
  isConnected: boolean;
  transport: TransportProps;
  onSeek: (position: number) => void;
  onToggleFavorite?: () => void;
}

export default function MiniPlayerView({
  track,
  isPlaying,
  isLoading,
  autoplay,
  progress,
  duration,
  playbackMode,
  station,
  streamNowPlaying,
  isFavorite,
  isConnected,
  transport,
  onSeek,
  onToggleFavorite,
}: MiniPlayerViewProps) {
  return (
    <div className="mini-shell">
      <header className="mini-header">
        <span className="mini-brand">ymc — mini</span>
        <div className="mini-header__actions">
          <a
            className="mini-link"
            href="/"
            target="_blank"
            rel="noreferrer"
            title="Open full player"
          >
            <Maximize2
              size={14}
              aria-hidden
            />
            full
          </a>
          <a
            className="mini-link"
            href="/"
            title="Back to full view"
            onClick={e => {
              e.preventDefault();
              const url = new URL(window.location.href);
              url.pathname = "/";
              url.searchParams.delete("mini");
              window.location.href = url.toString();
            }}
          >
            <ExternalLink
              size={14}
              aria-hidden
            />
            exit mini
          </a>
        </div>
      </header>

      <div className="mini-stage">
        {track || (playbackMode === "stream" && station) ? (
          <>
            <NowPlaying
              track={track}
              isPlaying={isPlaying}
              autoplay={autoplay}
              playbackMode={playbackMode as "youtube" | "stream" | undefined}
              station={station}
              streamNowPlaying={streamNowPlaying}
              isFavorite={isFavorite}
              isConnected={isConnected}
              onToggleFavorite={onToggleFavorite}
            />
            {playbackMode !== "stream" && (
              <ProgressBar
                progress={progress}
                duration={duration}
                onSeek={onSeek}
              />
            )}
          </>
        ) : (
          <div className="mini-empty">
            <p>Nothing playing</p>
            <a href="/">Open full player to search</a>
          </div>
        )}
      </div>

      <div className="mini-transport">
        <Transport {...transport} />
        {isLoading && <span className="mini-loading">loading…</span>}
      </div>

      <footer className="mini-footer">
        <span className={`mini-pip ${isConnected ? "mini-pip--ok" : ""}`} />
        <span className="mini-footer__label">
          {isConnected ? "connected" : "offline"}
        </span>
      </footer>
    </div>
  );
}
