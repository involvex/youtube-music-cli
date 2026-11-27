import { Radio, Signal } from "lucide-react";
import { useEffect, useState } from "react";

import { RADIO_COUNTRY_OPTIONS, type RadioStation } from "../../types";

type LiveSubView = "catalog" | "search";

interface LiveViewProps {
  liveStations: RadioStation[];
  radioResults: RadioStation[];
  isConnected: boolean;
  isSearching: boolean;
  currentStation: RadioStation | null;
  isStationPlaying: boolean;
  onPlayStation: (station: RadioStation) => void;
  onRequestLiveStreams: () => void;
  onSearchRadio: (query: string, countrycode?: string) => void;
}

export default function LiveView({
  liveStations,
  radioResults,
  isConnected,
  isSearching,
  currentStation,
  isStationPlaying,
  onPlayStation,
  onRequestLiveStreams,
  onSearchRadio,
}: LiveViewProps) {
  const [subView, setSubView] = useState<LiveSubView>("catalog");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (isConnected && liveStations.length === 0) {
      onRequestLiveStreams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const renderStationRow = (station: RadioStation) => {
    const isActive = currentStation?.id === station.id;
    return (
      <div
        key={station.id}
        className="result-row"
      >
        <div className="result-row__icon">
          <Radio
            size={20}
            aria-hidden
          />
        </div>
        <div className="result-row__meta">
          <div className="result-row__title">{station.name}</div>
          <div className="result-row__artist">
            {[station.genre, station.region].filter(Boolean).join(" · ") ||
              "Radio station"}
          </div>
          {isActive && (
            <span className="result-row__badge">
              {isStationPlaying ? "Live now" : "Paused"}
            </span>
          )}
        </div>
        <div className="result-actions">
          <button
            type="button"
            disabled={!isConnected}
            onClick={() => onPlayStation(station)}
          >
            {isActive && isStationPlaying ? "Playing" : "Play"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="view-panel">
      <h2>Live &amp; Radio</h2>

      <div
        className="subtabs"
        role="tablist"
        aria-label="Live streams mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subView === "catalog"}
          className={`subtab${subView === "catalog" ? " subtab--active" : ""}`}
          onClick={() => setSubView("catalog")}
        >
          Live Streams
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subView === "search"}
          className={`subtab${subView === "search" ? " subtab--active" : ""}`}
          onClick={() => setSubView("search")}
        >
          Radio Search
        </button>
      </div>

      {subView === "catalog" ? (
        liveStations.length > 0 ? (
          liveStations.map(renderStationRow)
        ) : (
          <p className="empty-state">
            <Signal
              size={24}
              aria-hidden
              style={{ marginBottom: "var(--space-2)" }}
            />
            <br />
            {isConnected ? "Loading live streams…" : "Connecting…"}
          </p>
        )
      ) : (
        <>
          <form
            className="search-form"
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const query = (formData.get("query") as string) ?? "";
              const countrycode = formData.get("countrycode") as string;
              setHasSearched(true);
              onSearchRadio(
                query,
                countrycode === "ALL" ? undefined : countrycode,
              );
            }}
          >
            <select
              name="countrycode"
              defaultValue="ALL"
              aria-label="Country"
            >
              {RADIO_COUNTRY_OPTIONS.map(option => (
                <option
                  key={option.code}
                  value={option.code}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="query"
              placeholder="Search radio stations..."
              disabled={!isConnected}
              aria-label="Radio station search query"
            />
            <button
              type="submit"
              disabled={!isConnected || isSearching}
            >
              {isSearching ? "Searching…" : "Search"}
            </button>
          </form>

          {radioResults.length > 0 ? (
            radioResults.map(renderStationRow)
          ) : (
            <p className="empty-state">
              {hasSearched
                ? "No stations found. Try a different search or country."
                : "Search for a station by name, or browse by country."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
