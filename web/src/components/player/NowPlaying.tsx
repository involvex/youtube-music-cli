import { Heart, Radio } from "lucide-react";

import type {
  Artist,
  RadioStation,
  StreamNowPlaying,
  Track,
} from "../../types";

interface NowPlayingProps {
  track: Track | null;
  isPlaying: boolean;
  autoplay: boolean;
  playbackMode?: "youtube" | "stream";
  station?: RadioStation | null;
  streamNowPlaying?: StreamNowPlaying | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isConnected?: boolean;
}

export default function NowPlaying({
  track,
  isPlaying,
  autoplay,
  playbackMode,
  station,
  streamNowPlaying,
  isFavorite = false,
  onToggleFavorite,
  isConnected = false,
}: NowPlayingProps) {
  if (playbackMode === "stream" && station) {
    const title = streamNowPlaying?.title || station.name;
    const artist = streamNowPlaying?.artist;

    return (
      <div
        key={station.id}
        className="now-playing track-fade-in"
      >
        <div className="now-playing__art now-playing__art--stream">
          <Radio
            size={48}
            aria-hidden
          />
        </div>
        <div className="now-playing__status">
          {isPlaying ? "Live Now" : "Paused"} · Radio
        </div>
        <h2 className="now-playing__title">{title}</h2>
        <p className="now-playing__artists">{artist || station.name}</p>
        {station.genre && <p className="now-playing__album">{station.genre}</p>}
      </div>
    );
  }

  if (!track) {
    return (
      <div className="now-playing">
        <div className="now-playing__art now-playing__art--empty">
          no signal
        </div>
        <p className="now-playing__artists">Nothing playing</p>
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${track.videoId}/hqdefault.jpg`;
  const artists = track.artists.map((a: Artist) => a.name).join(", ");

  return (
    <div
      key={track.videoId}
      className="now-playing track-fade-in"
    >
      <img
        className="now-playing__art"
        src={thumbnailUrl}
        alt=""
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="now-playing__status">
        {isPlaying ? "Now Playing" : "Paused"}
        {autoplay ? " · Radio" : ""}
      </div>
      <div className="now-playing__title-row">
        <h2 className="now-playing__title">{track.title}</h2>
        {onToggleFavorite && (
          <button
            type="button"
            className={`heart-btn${isFavorite ? " heart-btn--active" : ""}`}
            disabled={!isConnected}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
          >
            <Heart
              size={22}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        )}
      </div>
      <p className="now-playing__artists">{artists}</p>
      {track.album && <p className="now-playing__album">{track.album.name}</p>}
    </div>
  );
}
