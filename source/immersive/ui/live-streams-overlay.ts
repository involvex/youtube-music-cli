import {
  getLiveStreams,
  toRadioStation,
} from "../../services/live-streams/live-streams.service.ts";
import type { LiveStreamEntry } from "../../types/live-stream.types.ts";
import type { RadioStation } from "../../types/radio-station.types.ts";
import { truncate } from "../../utils/format.ts";
import type { FrameBuffer } from "../renderer/frame-buffer.ts";

export interface LiveStreamsOverlayState {
  active: boolean;
  selectedIndex: number;
  status: string | null;
  streams: readonly LiveStreamEntry[];
}

export function createLiveStreamsOverlayState(): LiveStreamsOverlayState {
  return {
    active: false,
    selectedIndex: 0,
    status: null,
    streams: getLiveStreams(),
  };
}

export function openLiveStreamsOverlay(state: LiveStreamsOverlayState): void {
  state.active = true;
  state.selectedIndex = 0;
  state.streams = getLiveStreams();
  state.status = `${state.streams.length} streams · yt-dlp / mpv · Enter play`;
}

export function closeLiveStreamsOverlay(state: LiveStreamsOverlayState): void {
  state.active = false;
  state.selectedIndex = 0;
  state.status = null;
}

export function getSelectedLiveStream(
  state: LiveStreamsOverlayState,
): LiveStreamEntry | null {
  return state.streams[state.selectedIndex] ?? null;
}

export function getSelectedLiveStation(
  state: LiveStreamsOverlayState,
): RadioStation | null {
  const entry = getSelectedLiveStream(state);
  return entry ? toRadioStation(entry) : null;
}

export function handleLiveStreamsOverlayInput(
  state: LiveStreamsOverlayState,
  key: string,
): "none" | "close" | "play" {
  if (key === "escape" || key === "q") {
    closeLiveStreamsOverlay(state);
    return "close";
  }

  const count = state.streams.length;
  if (count === 0) {
    return "none";
  }

  if (key === "up") {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    return "none";
  }

  if (key === "down") {
    state.selectedIndex = Math.min(count - 1, state.selectedIndex + 1);
    return "none";
  }

  if (key === "enter") {
    return "play";
  }

  return "none";
}

export function renderLiveStreamsOverlay(
  fb: FrameBuffer,
  width: number,
  height: number,
  overlay: LiveStreamsOverlayState,
): void {
  if (!overlay.active) {
    return;
  }

  const streams = overlay.streams;
  const boxH = Math.min(Math.max(10, Math.floor(height * 0.55)), height - 6);
  const boxY = Math.max(2, Math.floor((height - boxH) / 2));
  const boxW = Math.min(width - 4, 72);
  const boxX = Math.floor((width - boxW) / 2);

  fb.drawRect(boxX, boxY, boxW, boxH, null, null, "single");
  fb.setText(boxX + 2, boxY, " LIVE STREAMS ", null, null, { bold: true });

  if (streams.length === 0) {
    fb.setText(boxX + 2, boxY + 2, "No live streams in catalog", null, null, {
      dim: true,
    });
    return;
  }

  const maxLines = boxH - 4;
  const start = Math.max(
    0,
    Math.min(
      overlay.selectedIndex - Math.floor(maxLines / 2),
      Math.max(0, streams.length - maxLines),
    ),
  );
  const visible = streams.slice(start, start + maxLines);

  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i];
    if (!entry) {
      continue;
    }

    const flatIndex = start + i;
    const isSelected = flatIndex === overlay.selectedIndex;
    const marker = isSelected ? ">" : " ";
    const tags = entry.tags.join(", ");
    const line = truncate(`${marker} ${entry.name} · ${tags}`, boxW - 4);
    fb.setText(
      boxX + 2,
      boxY + 2 + i,
      line,
      null,
      null,
      isSelected ? { bold: true } : { dim: true },
    );
  }

  if (overlay.status) {
    fb.setText(
      boxX + 2,
      boxY + boxH - 2,
      truncate(overlay.status, boxW - 4),
      null,
      null,
      { dim: true },
    );
  }
}
