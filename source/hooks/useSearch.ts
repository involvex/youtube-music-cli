// Search hook
import {getSearchService} from '../services/youtube-music/search.service.ts';
import {useState, useCallback} from 'react';

export function useSearch() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const searchService = getSearchService();

	const searchSongs = useCallback(
		async (query: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const results = await searchService.searchSongs(query);
				return results;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed');
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[searchService],
	);

	const searchAlbums = useCallback(
		async (query: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const results = await searchService.searchAlbums(query);
				return results;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed');
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[searchService],
	);

	const searchArtists = useCallback(
		async (query: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const results = await searchService.searchArtists(query);
				return results;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed');
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[searchService],
	);

	const searchPlaylists = useCallback(
		async (query: string) => {
			setIsLoading(true);
			setError(null);

			try {
				const results = await searchService.searchPlaylists(query);
				return results;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed');
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[searchService],
	);

	return {
		isLoading,
		error,
		searchSongs,
		searchAlbums,
		searchArtists,
		searchPlaylists,
	};
}
