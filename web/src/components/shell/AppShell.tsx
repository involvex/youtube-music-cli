import type { ReactNode } from "react";

import type { Track } from "../../types";
import Transport, { type TransportProps } from "../player/Transport";
import Nav, { type AppView } from "./Nav";
import QueuePanel from "./QueuePanel";
import TopBar from "./TopBar";

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isConnected: boolean;
  isConnecting: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  queue: Track[];
  queuePosition: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  transport: TransportProps;
  children: ReactNode;
}

export default function AppShell({
  currentView,
  onNavigate,
  isConnected,
  isConnecting,
  volume,
  onVolumeChange,
  queue,
  queuePosition,
  onSelectTrack,
  onRemoveTrack,
  transport,
  children,
}: AppShellProps) {
  const showQueueSheet = currentView === "queue";
  const showPlayerChrome = currentView === "player" || currentView === "queue";

  return (
    <div className="app-shell">
      <TopBar
        isConnected={isConnected}
        isConnecting={isConnecting}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />

      <div className="shell-body">
        <Nav
          currentView={currentView === "queue" ? "player" : currentView}
          onNavigate={onNavigate}
          variant="rail"
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Nav
            currentView={currentView === "queue" ? "player" : currentView}
            onNavigate={onNavigate}
            variant="chips"
          />

          <div className="stage-queue">
            <main className="stage">
              <div className="stage-inner">
                {children}
                {showPlayerChrome && (
                  <div className="desktop-transport">
                    <Transport {...transport} />
                  </div>
                )}
              </div>
            </main>

            {showPlayerChrome && (
              <QueuePanel
                queue={queue}
                queuePosition={queuePosition}
                onSelectTrack={onSelectTrack}
                onRemoveTrack={onRemoveTrack}
              />
            )}
          </div>
        </div>
      </div>

      {showPlayerChrome && (
        <div className="mobile-dock">
          <Transport {...transport} />
        </div>
      )}

      <Nav
        currentView={currentView}
        onNavigate={onNavigate}
        variant="tabs"
      />

      {showQueueSheet && (
        <div
          className="sheet-overlay"
          role="dialog"
          aria-label="Queue"
          onClick={() => onNavigate("player")}
        >
          <div
            className="sheet"
            onClick={e => e.stopPropagation()}
          >
            <div className="queue-panel__header">Up Next · {queue.length}</div>
            <QueuePanel
              queue={queue}
              queuePosition={queuePosition}
              onSelectTrack={index => {
                onSelectTrack(index);
                onNavigate("player");
              }}
              onRemoveTrack={onRemoveTrack}
              showHeader={false}
              variant="sheet"
            />
          </div>
        </div>
      )}
    </div>
  );
}
