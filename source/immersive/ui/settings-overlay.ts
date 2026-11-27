import {
  getSettingsRowKind,
  getSettingsTextField,
  IMMERSIVE_SETTINGS_COUNT,
  type SettingsTextField,
} from "../settings/settings-items.ts";

export interface SettingsRow {
  label: string;
  value: string;
}

export interface SettingsOverlayState {
  active: boolean;
  selectedIndex: number;
  status: string | null;
  textEdit: SettingsTextField | null;
  textDraft: string;
}

export const SETTINGS_ROW_COUNT = IMMERSIVE_SETTINGS_COUNT;

export function createSettingsOverlayState(): SettingsOverlayState {
  return {
    active: false,
    selectedIndex: 0,
    status: null,
    textEdit: null,
    textDraft: "",
  };
}

export function openSettingsOverlay(state: SettingsOverlayState): void {
  state.active = true;
  state.selectedIndex = 0;
  state.status = null;
  state.textEdit = null;
  state.textDraft = "";
}

export function closeSettingsOverlay(state: SettingsOverlayState): void {
  state.active = false;
  state.selectedIndex = 0;
  state.status = null;
  state.textEdit = null;
  state.textDraft = "";
}

export type SettingsInputAction =
  "none" | "close" | "cycle" | "navigate" | "begin_text";

export function beginSettingsTextEdit(
  state: SettingsOverlayState,
  field: SettingsTextField,
  draft: string,
): void {
  state.textEdit = field;
  state.textDraft = draft;
  state.status = `Editing ${field}: ${draft || "(empty)"}`;
}

export function cancelSettingsTextEdit(state: SettingsOverlayState): void {
  state.textEdit = null;
  state.textDraft = "";
  state.status = null;
}

export type SettingsTextEditAction = "save" | "cancel" | "none";

export function handleSettingsTextEditInput(
  state: SettingsOverlayState,
  key: string,
): SettingsTextEditAction {
  if (key === "escape") {
    cancelSettingsTextEdit(state);
    return "cancel";
  }

  if (key === "enter") {
    return "save";
  }

  if (key === "backspace") {
    state.textDraft = state.textDraft.slice(0, -1);
    state.status = `Editing ${state.textEdit}: ${state.textDraft || "(empty)"}`;
    return "none";
  }

  if (key.length === 1 && key >= " " && key <= "~") {
    if (state.textDraft.length < 120) {
      state.textDraft += key;
      state.status = `Editing ${state.textEdit}: ${state.textDraft}`;
    }
  }

  return "none";
}

export function handleSettingsInput(
  state: SettingsOverlayState,
  key: string,
  rowCount: number,
): SettingsInputAction {
  if (state.textEdit) {
    return "none";
  }

  if (key === "escape") {
    closeSettingsOverlay(state);
    return "close";
  }

  if (rowCount === 0) {
    return "none";
  }

  if (key === "up") {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    state.status = null;
    return "none";
  }

  if (key === "down") {
    state.selectedIndex = Math.min(rowCount - 1, state.selectedIndex + 1);
    state.status = null;
    return "none";
  }

  if (key === "enter") {
    const kind = getSettingsRowKind(state.selectedIndex);
    if (kind === "text") {
      return "begin_text";
    }
    if (kind === "navigate") {
      return "navigate";
    }
    return "cycle";
  }

  return "none";
}

export function getSelectedTextField(
  state: SettingsOverlayState,
): SettingsTextField | null {
  return getSettingsTextField(state.selectedIndex);
}
