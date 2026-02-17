// Navigation store - manages view routing and UI state
import type {
	NavigationState,
	NavigationAction,
} from '../types/navigation.types.ts';
import {
	createContext,
	useContext,
	useReducer,
	useMemo,
	type ReactNode,
} from 'react';

const initialState: NavigationState = {
	currentView: 'player',
	previousView: null,
	searchQuery: '',
	searchCategory: 'all',
	searchType: 'all',
	selectedResult: 0,
	selectedPlaylist: 0,
	hasSearched: false,
	searchLimit: 10,
	history: [],
};

function navigationReducer(
	state: NavigationState,
	action: NavigationAction,
): NavigationState {
	switch (action.category) {
		case 'NAVIGATE':
			return {
				...state,
				currentView: action.view,
				previousView: state.currentView,
				history: [...state.history, state.currentView],
			};

		case 'GO_BACK':
			if (state.history.length === 0) {
				return state;
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
