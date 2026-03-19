import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	type ReactNode,
} from 'react';
import type {Track} from '../types/youtube-music.types.ts';
import {
	loadFavorites,
	saveFavorites,
} from '../services/favorites/favorites.service.ts';
import {logger} from '../services/logger/logger.service.ts';

type FavoritesAction =
	| {category: 'SET_FAVORITES'; tracks: Track[]}
	| {category: 'ADD_FAVORITE'; track: Track}
	| {category: 'REMOVE_FAVORITE'; trackId: string};

type FavoritesState = Track[];

function favoritesReducer(
	state: FavoritesState,
	action: FavoritesAction,
): FavoritesState {
	switch (action.category) {
		case 'SET_FAVORITES':
			return action.tracks;
		case 'ADD_FAVORITE':
			if (state.some(t => t.videoId === action.track.videoId)) {
				return state;
			}
			return [action.track, ...state];
		case 'REMOVE_FAVORITE':
			return state.filter(t => t.videoId !== action.trackId);
		default:
			return state;
	}
}

type FavoritesContextValue = {
	favorites: FavoritesState;
	addFavorite: (track: Track) => void;
	removeFavorite: (trackId: string) => void;
	toggleFavorite: (track: Track) => void;
	isFavorite: (trackId: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(favoritesReducer, []);

	// Load favorites on mount
	useEffect(() => {
		void loadFavorites().then(tracks => {
			dispatch({category: 'SET_FAVORITES', tracks});
		});
	}, []);

	// Save favorites on change
	useEffect(() => {
		void saveFavorites(state);
	}, [state]);

	const actions = useMemo(
		() => ({
			addFavorite: (track: Track) => {
				dispatch({category: 'ADD_FAVORITE', track});
				logger.debug('FavoritesStore', 'Added favorite', {
					title: track.title,
					videoId: track.videoId,
				});
			},
			removeFavorite: (trackId: string) => {
				dispatch({category: 'REMOVE_FAVORITE', trackId});
				logger.debug('FavoritesStore', 'Removed favorite', {trackId});
			},
			toggleFavorite: (track: Track) => {
				const isFav = state.some(t => t.videoId === track.videoId);
				if (isFav) {
					dispatch({category: 'REMOVE_FAVORITE', trackId: track.videoId});
					logger.debug('FavoritesStore', 'Removed favorite (toggle)', {
						title: track.title,
					});
				} else {
					dispatch({category: 'ADD_FAVORITE', track});
					logger.debug('FavoritesStore', 'Added favorite (toggle)', {
						title: track.title,
					});
				}
			},
			isFavorite: (trackId: string) => state.some(t => t.videoId === trackId),
		}),
		[state],
	);

	const value = useMemo(
		() => ({
			favorites: state,
			...actions,
		}),
		[state, actions],
	);

	return (
		<FavoritesContext.Provider value={value}>
			{children}
		</FavoritesContext.Provider>
	);
}

export function useFavorites(): FavoritesContextValue {
	const context = useContext(FavoritesContext);

	if (!context) {
		throw new Error('useFavorites must be used within FavoritesProvider');
	}

	return context;
}
