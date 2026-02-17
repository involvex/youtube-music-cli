// Navigation store type definitions
import type {
	NavigateAction,
	GoBackAction,
	SetSearchQueryAction,
	SetSearchCategoryAction,
	SetSelectedResultAction,
	SetSelectedPlaylistAction,
	SetHasSearchedAction,
} from './actions.ts';

export interface NavigationState {
	currentView: string;
	previousView: string | null;
	searchQuery: string;
	searchCategory: string;
	searchType: 'all' | 'songs' | 'albums' | 'artists' | 'playlists';
	selectedResult: number;
	selectedPlaylist: number;
	hasSearched: boolean;
	history: string[];
}

export type NavigationAction =
	| NavigateAction
	| GoBackAction
	| SetSearchQueryAction
	| SetSearchCategoryAction
	| SetSelectedResultAction
	| SetSelectedPlaylistAction
	| SetHasSearchedAction;
