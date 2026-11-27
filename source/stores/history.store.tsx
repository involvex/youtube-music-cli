import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { usePlayer } from "../hooks/usePlayer.ts";
import {
  getMaxHistoryEntries,
  loadHistory,
  saveHistory,
  trimHistoryEntries,
} from "../services/history/history.service.ts";
import type { HistoryEntry } from "../types/history.types.ts";

type HistoryAction =
  | { category: "SET_HISTORY"; entries: HistoryEntry[] }
  | { category: "ADD_ENTRY"; entry: HistoryEntry };

type HistoryState = HistoryEntry[];

function historyReducer(
  state: HistoryState,
  action: HistoryAction,
): HistoryState {
  switch (action.category) {
    case "SET_HISTORY":
      return trimHistoryEntries(action.entries, getMaxHistoryEntries());
    case "ADD_ENTRY":
      return trimHistoryEntries(
        [action.entry, ...state],
        getMaxHistoryEntries(),
      );
    default:
      return state;
  }
}

type HistoryContextValue = {
  history: HistoryState;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(historyReducer, []);
  const { state: playerState } = usePlayer();
  const lastLoggedId = useRef<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadHistory().then(entries => {
      if (!cancelled) {
        hydrated.current = true;
        dispatch({ category: "SET_HISTORY", entries });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playerState.currentTrack) {
      lastLoggedId.current = null;
      return;
    }

    if (!playerState.isPlaying) {
      lastLoggedId.current = null;
      return;
    }

    const videoId = playerState.currentTrack.videoId;
    if (lastLoggedId.current === videoId) {
      return;
    }

    lastLoggedId.current = videoId;
    const entry: HistoryEntry = {
      track: playerState.currentTrack,
      playedAt: new Date().toISOString(),
    };
    dispatch({ category: "ADD_ENTRY", entry });
  }, [playerState.currentTrack, playerState.isPlaying]);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    void saveHistory(state, { allowEmptyOverwrite: true });
  }, [state]);

  const value = useMemo(() => ({ history: state }), [state]);

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const context = useContext(HistoryContext);

  if (!context) {
    throw new Error("useHistory must be used within HistoryProvider");
  }

  return context;
}
