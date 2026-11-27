import { create } from "zustand";

import type { PlayerAction, PlayerState } from "../types";

// External dispatch function - will be set by the WebSocket hook
let externalDispatch: ((action: PlayerAction) => void) | null = null;

export function setExternalDispatch(fn: (action: PlayerAction) => void): void {
  externalDispatch = fn;
}

export interface PlayerStore extends PlayerState {
  setState: (update: Partial<PlayerState>) => void;
  dispatch: (action: PlayerAction) => void;
}

export const usePlayerStore = create<PlayerStore>(
  (
    set: (
      partial: Partial<PlayerStore> | ((state: PlayerStore) => PlayerStore),
    ) => void,
  ) => ({
    // Initial state
    currentTrack: null,
    isPlaying: false,
    volume: 70,
    speed: 1,
    progress: 0,
    duration: 0,
    queue: [],
    queuePosition: 0,
    repeat: "off",
    shuffle: false,
    autoplay: true,
    isLoading: false,
    error: null,

    // Set state from WebSocket updates - properly merge to trigger re-renders
    setState: (update: Partial<PlayerState>) => {
      set((state: PlayerStore) => {
        const newState = { ...state };
        for (const [key, value] of Object.entries(update)) {
          (newState as Record<string, unknown>)[key] = value;
        }
        return newState;
      });
    },

    // Dispatch actions to be sent to server
    dispatch: (action: PlayerAction) => {
      if (externalDispatch) {
        externalDispatch(action);
      }
    },
  }),
);
