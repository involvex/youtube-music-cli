import { BUILTIN_MOODS } from "../../data/builtin-moods.ts";
import type { MoodPreset } from "../../types/mood.types.ts";
import { truncate } from "../../utils/format.ts";
import type { FrameBuffer } from "../renderer/frame-buffer.ts";

export interface MoodRadioOverlayState {
  active: boolean;
  selectedIndex: number;
  status: string | null;
}

export function createMoodRadioOverlayState(): MoodRadioOverlayState {
  return {
    active: false,
    selectedIndex: 0,
    status: null,
  };
}

export function openMoodRadioOverlay(state: MoodRadioOverlayState): void {
  state.active = true;
  state.selectedIndex = 0;
  state.status = `${BUILTIN_MOODS.length} moods · Enter to start radio`;
}

export function closeMoodRadioOverlay(state: MoodRadioOverlayState): void {
  state.active = false;
  state.selectedIndex = 0;
  state.status = null;
}

export function getSelectedMood(
  state: MoodRadioOverlayState,
): MoodPreset | null {
  return BUILTIN_MOODS[state.selectedIndex] ?? null;
}

export function handleMoodRadioOverlayInput(
  state: MoodRadioOverlayState,
  key: string,
): "none" | "close" | "play" {
  if (key === "escape" || key === "q") {
    closeMoodRadioOverlay(state);
    return "close";
  }

  const count = BUILTIN_MOODS.length;
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

export function renderMoodRadioOverlay(
  fb: FrameBuffer,
  width: number,
  height: number,
  overlay: MoodRadioOverlayState,
): void {
  if (!overlay.active) {
    return;
  }

  const moods = BUILTIN_MOODS;
  const boxH = Math.min(Math.max(10, Math.floor(height * 0.55)), height - 6);
  const boxY = Math.max(2, Math.floor((height - boxH) / 2));
  const boxW = Math.min(width - 4, 72);
  const boxX = Math.floor((width - boxW) / 2);

  fb.drawRect(boxX, boxY, boxW, boxH, null, null, "single");
  fb.setText(boxX + 2, boxY, " MOOD RADIO ", null, null, { bold: true });

  if (moods.length === 0) {
    fb.setText(boxX + 2, boxY + 2, "No moods available", null, null, {
      dim: true,
    });
    return;
  }

  const maxLines = boxH - 4;
  const start = Math.max(
    0,
    Math.min(
      overlay.selectedIndex - Math.floor(maxLines / 2),
      Math.max(0, moods.length - maxLines),
    ),
  );
  const visible = moods.slice(start, start + maxLines);

  for (let i = 0; i < visible.length; i++) {
    const mood = visible[i];
    if (!mood) {
      continue;
    }

    const flatIndex = start + i;
    const isSelected = flatIndex === overlay.selectedIndex;
    const marker = isSelected ? ">" : " ";
    const line = truncate(`${marker} ${mood.name}`, boxW - 4);
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
