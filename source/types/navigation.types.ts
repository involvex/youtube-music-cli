// Navigation store type definitions
import type {
  ClearSearchFiltersAction,
  DetachAction,
  GoBackAction,
  NavigateAction,
  SetHasSearchedAction,
  SetSearchCategoryAction,
  SetSearchFiltersAction,
  SetSearchLimitAction,
  SetSearchQueryAction,
  SetSelectedPlaylistAction,
  SetSelectedResultAction,
  TogglePlayerModeAction,
} from "./actions.ts";
import type { SearchFilters } from "./youtube-music.types.ts";

export interface NavigationState {
  currentView: string;
  previousView: string | null;
  searchQuery: string;
  searchCategory: string;
  searchType: "all" | "songs" | "albums" | "artists" | "playlists";
  selectedResult: number;
  selectedPlaylist: number;
  hasSearched: boolean;
  searchLimit: number;
  history: string[];
  playerMode: "full" | "mini";
  searchFilters: SearchFilters;
}

export type NavigationAction =
  | NavigateAction
  | GoBackAction
  | SetSearchQueryAction
  | SetSearchCategoryAction
  | SetSearchFiltersAction
  | ClearSearchFiltersAction
  | SetSelectedResultAction
  | SetSelectedPlaylistAction
  | SetHasSearchedAction
  | SetSearchLimitAction
  | TogglePlayerModeAction
  | DetachAction;
