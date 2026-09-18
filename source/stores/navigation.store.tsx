// Navigation store - manages view routing and UI state
import type {
	NavigationState,
	NavigationAction,
} from '../types/navigation.types.ts';
import type {SearchFilters} from '../types/youtube-music.types.ts';
import {
	createContext,
	useContext,
	useReducer,
	useMemo,
	type ReactNode,
} from 'react';

import {VIEW} from '../utils/constants.ts';

const defaultSearchFilters: SearchFilters = {
	artist: '',
	album: '',
	year: '',
	duration: 'all',
};

export const initialState: NavigationState = {
	currentView: VIEW.HOME,
	previousView: null,
	searchQuery: '',
	searchCategory: 'all',
	searchType: 'all',
	selectedResult: 0,
	selectedPlaylist: 0,
	hasSearched: false,
	searchLimit: 10,
	history: [],
	playerMode: 'full',
	searchFilters: defaultSearchFilters,
};

export function navigationReducer(
	state: NavigationState,
	action: NavigationAction,
): NavigationState {
	switch (action.category) {
		case 'NAVIGATE':
			// Navigating to the view we're already in is a no-op. Without
			// this guard, repeat presses of a view's own shortcut (e.g. 'e'
			// while in Explore, '/' while in Search) stack duplicate entries
			// onto history, and a later GO_BACK pops back to the same view —
			// making Escape appear to do nothing.
			if (action.view === state.currentView) {
				return state;
			}
			return {
				...state,
				currentView: action.view,
				previousView: state.currentView,
				history: [...state.history, state.currentView],
			};

		case 'GO_BACK':
			if (state.history.length === 0) {
				// Nowhere to go back to: fall back to home (unless already
				// there) so Escape always produces a visible result instead
				// of silently doing nothing.
				if (state.currentView === VIEW.HOME) {
					return state;
				}
				return {
					...state,
					currentView: VIEW.HOME,
					previousView: state.currentView,
					history: [],
				};
			}
			const previousViews = [...state.history];
			const backView = previousViews.pop()!;

			return {
				...state,
				currentView: backView,
				previousView: state.currentView,
				history: previousViews,
			};

		case 'SET_SEARCH_QUERY':
			return {...state, searchQuery: action.query};

		case 'SET_SEARCH_CATEGORY':
			return {...state, searchCategory: action.category};

		case 'SET_SEARCH_FILTERS':
			return {
				...state,
				searchFilters: {...state.searchFilters, ...action.filters},
			};

		case 'CLEAR_SEARCH_FILTERS':
			return {
				...state,
				searchFilters: defaultSearchFilters,
			};

		case 'SET_SELECTED_RESULT':
			return {...state, selectedResult: action.index};

		case 'SET_SELECTED_PLAYLIST':
			return {...state, selectedPlaylist: action.index};

		case 'SET_HAS_SEARCHED':
			return {...state, hasSearched: action.hasSearched};

		case 'SET_SEARCH_LIMIT':
			return {
				...state,
				searchLimit: Math.max(1, Math.min(50, action.limit)),
			};

		case 'TOGGLE_PLAYER_MODE':
			return {
				...state,
				playerMode: state.playerMode === 'full' ? 'mini' : 'full',
			};

		default:
			return state;
	}
}

export type NavigationContextValue = {
	state: NavigationState;
	dispatch: (action: NavigationAction) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(navigationReducer, initialState);

	const contextValue = useMemo(() => ({state, dispatch}), [state, dispatch]);

	return (
		<NavigationContext.Provider value={contextValue}>
			{children}
		</NavigationContext.Provider>
	);
}

export function useNavigation(): NavigationContextValue {
	const context = useContext(NavigationContext);

	if (!context) {
		throw new Error('useNavigation must be used within NavigationProvider');
	}

	return context;
}
