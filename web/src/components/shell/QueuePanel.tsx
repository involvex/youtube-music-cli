import { X } from "lucide-react";

import type { Track } from "../../types";

interface QueuePanelProps {
  queue: Track[];
  queuePosition: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  showHeader?: boolean;
  variant?: "panel" | "sheet";
}

export default function QueuePanel({
  queue,
  queuePosition,
  onSelectTrack,
  onRemoveTrack,
  showHeader = true,
  variant = "panel",
}: QueuePanelProps) {
  const className =
    variant === "sheet" ? "queue-panel queue-panel--sheet" : "queue-panel";

  return (
    <aside className={className}>
      {showHeader && (
        <div className="queue-panel__header">Up Next · {queue.length}</div>
      )}
      <div className="queue-panel__body">
        {queue.length === 0 ? (
          <div className="empty-state">Queue is empty</div>
        ) : (
          queue.map((track, index) => (
            <div
              key={`${track.videoId}-${index}`}
              className={`queue-row${index === queuePosition ? " queue-row--current" : ""}`}
              onClick={() => onSelectTrack(index)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTrack(index);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="queue-row__index">
                {index === queuePosition
                  ? "▸"
                  : String(index + 1).padStart(2, "0")}
              </span>
              <div className="queue-row__meta">
                <div className="queue-row__title">{track.title}</div>
                <div className="queue-row__artist">
                  {track.artists.map(a => a.name).join(", ")}
                </div>
              </div>
              <button
                type="button"
                className="queue-row__remove"
                aria-label={`Remove ${track.title} from queue`}
                onClick={e => {
                  e.stopPropagation();
                  onRemoveTrack(index);
                }}
              >
                <X
                  size={16}
                  aria-hidden
                />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
