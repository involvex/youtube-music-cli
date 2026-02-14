// YouTube Music API integration hook
import type {SearchOptions} from '../types/youtube-music.types.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {useState, useCallback} from 'react';

export function useYouTubeMusic() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const musicService = getMusicService();

	const search = useCallback(
		async (query: string, options: SearchOptions = {}): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const response = await musicService.search(query, options);
				return response;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed');
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	const getTrack = useCallback(
		async (videoId: string): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const track = await musicService.getTrack(videoId);
				return track;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to get track');
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	const getAlbum = useCallback(
		async (albumId: string): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const album = await musicService.getAlbum(albumId);
				return album;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to get album');
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	const getArtist = useCallback(
		async (artistId: string): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const artist = await musicService.getArtist(artistId);
				return artist;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to get artist');
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	const getPlaylist = useCallback(
		async (playlistId: string): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const playlist = await musicService.getPlaylist(playlistId);
				return playlist;
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to get playlist');
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	const getSuggestions = useCallback(
		async (trackId: string): Promise => {
			setIsLoading(true);
			setError(null);

			try {
				const suggestions = await musicService.getSuggestions(trackId);
				return suggestions;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to get suggestions',
				);
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[musicService],
	);

	return {
		isLoading,
		error,
		search,
		getTrack,
		getAlbum,
		getArtist,
		getPlaylist,
		getSuggestions,
	};
}
