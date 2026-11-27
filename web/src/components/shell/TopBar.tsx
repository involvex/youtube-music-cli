import { Maximize2, Moon, Sun } from "lucide-react";

import { useTheme } from "../../hooks/useTheme";

interface TopBarProps {
  isConnected: boolean;
  isConnecting: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export default function TopBar({
  isConnected,
  isConnecting,
  volume,
  onVolumeChange,
}: TopBarProps) {
  const theme = useTheme(s => s.theme);
  const toggleTheme = useTheme(s => s.toggleTheme);

  const syncClass = [
    "sync-pip",
    isConnected ? "sync-pip--ok" : "",
    isConnecting && !isConnected ? "sync-pip--connecting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const syncText = isConnected
    ? "Synced"
    : isConnecting
      ? "Connecting"
      : "Offline";

  return (
    <header className="top-bar">
      <div className="brand-mark">
        <span>ymc</span>
        <span
          className={syncClass}
          aria-hidden
        />
        <span className="sync-label">{syncText}</span>
      </div>
      <div className="utility-cluster">
        <label
          className="sr-only"
          htmlFor="volume-slider"
        >
          Volume
        </label>
        <input
          id="volume-slider"
          className="volume-slider"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={e => onVolumeChange(parseInt(e.target.value, 10))}
          aria-valuetext={`${volume} percent`}
        />
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
        >
          {theme === "dark" ? (
            <Sun
              size={18}
              aria-hidden
            />
          ) : (
            <Moon
              size={18}
              aria-hidden
            />
          )}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() =>
            window.open("/mini", "ymc-mini", "width=360,height=560")
          }
          aria-label="Open mini player"
          title="Open mini player (/mini)"
        >
          <Maximize2
            size={18}
            aria-hidden
          />
        </button>
      </div>
    </header>
  );
}
