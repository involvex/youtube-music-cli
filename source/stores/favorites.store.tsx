import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	type ReactNode,
} from 'react';
import type {Track} from '../types/youtube-music.types.ts';
import {getFavoritesManager} from '../services/favorites/favorites.service.ts';
import {logger} from '../services/logger/logger.service.ts';

type FavoritesAction = {category: 'SET_FAVORITES'; tracks: Track[]};

type FavoritesState = Track[];

function favoritesReducer(
	state: FavoritesState,
	action: FavoritesAction,
): FavoritesState {
	switch (action.category) {
		case 'SET_FAVORITES':
			return action.tracks;
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

function refreshFavorites(dispatch: (action: FavoritesAction) => void): void {
	dispatch({
		category: 'SET_FAVORITES',
		tracks: getFavoritesManager().getAllTracks(),
	});
}

export function FavoritesProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(favoritesReducer, []);

	useEffect(() => {
		let cancelled = false;
		const manager = getFavoritesManager();

		void manager.ensureLoaded().then(() => {
			if (cancelled) {
				return;
			}

			refreshFavorites(dispatch);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	const actions = useMemo(
		() => ({
			addFavorite: (track: Track) => {
				void getFavoritesManager()
					.add(track)
					.then(() => {
						refreshFavorites(dispatch);
						logger.debug('FavoritesStore', 'Added favorite', {
							title: track.title,
							videoId: track.videoId,
						});
					});
			},
			removeFavorite: (trackId: string) => {
				void getFavoritesManager()
					.remove(trackId)
					.then(() => {
						refreshFavorites(dispatch);
						logger.debug('FavoritesStore', 'Removed favorite', {trackId});
					});
			},
			toggleFavorite: (track: Track) => {
				void getFavoritesManager()
					.toggle(track)
					.then(added => {
						refreshFavorites(dispatch);
						logger.debug(
							'FavoritesStore',
							added ? 'Added favorite (toggle)' : 'Removed favorite (toggle)',
							{title: track.title},
						);
					});
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
