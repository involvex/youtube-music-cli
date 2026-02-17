// Player hook - audio playback orchestration
import {useEffect, useRef, useCallback} from 'react';
import {usePlayer as usePlayerStore} from '../stores/player.store.tsx';
import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {getPlayerService} from '../services/player/player.service.ts';
import type {Track} from '../types/youtube-music.types.ts';

export function usePlayer() {
	const {state, dispatch, ...playerStore} = usePlayerStore();
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const musicService = getMusicService();
	const playerService = getPlayerService();

	// Initialize audio on mount
	useEffect(() => {
		const config = getConfigService();
		dispatch({category: 'SET_VOLUME', volume: config.get('volume')});

		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
			playerService.stop();
		};
	}, [dispatch, playerService]);

	// Handle track changes
	useEffect(() => {
		if (!state.currentTrack) {
			return;
		}

		const loadAndPlayTrack = async () => {
			dispatch({category: 'SET_LOADING', loading: true});

			try {
				const url = await musicService.getStreamUrl(
					state.currentTrack!.videoId,
				);

				if (!url) {
					throw new Error('Failed to get stream URL');
				}

				await playerService.play(url);

				dispatch({category: 'SET_LOADING', loading: false});

				// Start progress tracking
				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
				}

				progressIntervalRef.current = setInterval(() => {
					// In a real app, we'd get progress from the player service
					dispatch({
						category: 'UPDATE_PROGRESS',
						progress: (state.progress ?? 0) + 1,
					});
				}, 1000);
			} catch (error) {
				dispatch({
					category: 'SET_ERROR',
					error:
						error instanceof Error ? error.message : 'Failed to load track',
				});
			}
		};

		loadAndPlayTrack();

		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
		};
	}, [state.currentTrack?.videoId, dispatch, musicService, playerService]);

	// Handle play/pause state
	useEffect(() => {
		if (state.isPlaying) {
			if (state.currentTrack) {
				// We don't have the URL here easily without re-fetching or storing it
				// For now, assume playerService handles its internal state
			}
		} else {
			playerService.pause();
		}
	}, [state.isPlaying, playerService]);

	// Handle volume changes
	useEffect(() => {
		// Save to config
		const config = getConfigService();
		config.set('volume', state.volume);
	}, [state.volume]);

	// Handle track completion
	useEffect(() => {
		if (state.duration > 0 && state.progress >= state.duration) {
			if (state.repeat === 'one') {
				dispatch({category: 'SEEK', position: 0});
			} else {
				playerStore.next();
			}
		}
	}, [state.progress, state.duration, state.repeat]);

	const play = useCallback(
		(track: Track) => {
			// Add to queue if not already there
			const isInQueue = state.queue.some(t => t.videoId === track.videoId);

			if (!isInQueue) {
				dispatch({category: 'ADD_TO_QUEUE', track});
			}

			// Find position and play
			const position = state.queue.findIndex(t => t.videoId === track.videoId);
			if (position >= 0) {
				dispatch({category: 'SET_QUEUE_POSITION', position});
			} else {
				dispatch({category: 'PLAY', track});
			}

			// Add to history
			const config = getConfigService();
			config.addToHistory(track.videoId);
		},
		[state.queue],
	);

	return {
		...playerStore,
		state,
		play,
	};
}
