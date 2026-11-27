import { Heart, Shuffle } from "lucide-react";
import { useEffect } from "react";

import type { Track } from "../../types";

interface FavoritesViewProps {
  favorites: Track[];
  isConnected: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  onRequestFavorites: () => void;
  onToggleFavorite: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  onPlayRandom: () => void;
  onAddCurrent: () => void;
}

export default function FavoritesView({
  favorites,
  isConnected,
  currentTrack,
  isPlaying,
  onRequestFavorites,
  onToggleFavorite,
  onPlayTrack,
  onPlayRandom,
  onAddCurrent,
}: FavoritesViewProps) {
  useEffect(() => {
    if (isConnected) {
      onRequestFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const currentIsFavorite = Boolean(
    currentTrack &&
    favorites.some(track => track.videoId === currentTrack.videoId),
  );

  return (
    <div className="view-panel">
      <div className="view-panel__header">
        <h2>Favorites</h2>
        <div className="view-panel__actions">
          {currentTrack && !currentIsFavorite && (
            <button
              type="button"
              className="secondary"
              disabled={!isConnected}
              onClick={onAddCurrent}
            >
              Add current
            </button>
          )}
          <button
            type="button"
            disabled={!isConnected || favorites.length === 0}
            onClick={onPlayRandom}
          >
            <Shuffle
              size={14}
              aria-hidden
            />
            Play random
          </button>
        </div>
      </div>

      {favorites.length > 0 ? (
        favorites.map(track => {
          const isActive = currentTrack?.videoId === track.videoId;
          return (
            <div
              key={track.videoId}
              className="result-row"
            >
              <img
                src={`https://img.youtube.com/vi/${track.videoId}/default.jpg`}
                alt=""
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="result-row__meta">
                <div className="result-row__title">{track.title}</div>
                <div className="result-row__artist">
                  {track.artists.map(a => a.name).join(", ")}
                </div>
                {isActive && (
                  <span className="result-row__badge">
                    {isPlaying ? "Playing" : "Paused"}
                  </span>
                )}
              </div>
              <div className="result-actions">
                <button
                  type="button"
                  disabled={!isConnected}
                  onClick={() => onPlayTrack(track)}
                >
                  {isActive && isPlaying ? "Playing" : "Play"}
                </button>
                <button
                  type="button"
                  className="secondary heart-btn heart-btn--active"
                  disabled={!isConnected}
                  aria-label={`Remove ${track.title} from favorites`}
                  onClick={() => onToggleFavorite(track)}
                >
                  <Heart
                    size={16}
                    fill="currentColor"
                    aria-hidden
                  />
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <p className="empty-state">
          {isConnected
            ? "No favorites yet. Tap the heart on the player or add from search."
            : "Connecting…"}
        </p>
      )}
    </div>
  );
}
