// Player hook - audio playback orchestration
import {useEffect, useRef, useCallback} from 'react';
import {usePlayer as usePlayerStore} from '../stores/player.store.tsx';
import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import type {Track} from '../types/youtube-music.types.ts';

export function usePlayer() {
	const {state, dispatch, ...playerStore} = usePlayerStore();
	const audioRef = useRef<unknown | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const musicService = getMusicService();

	// Initialize audio on mount
	useEffect(() => {
		const config = getConfigService();
		dispatch({type: 'SET_VOLUME', volume: config.get('volume')});

		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
		};
	}, []);

	// Handle track changes
	useEffect(() => {
		if (!state.currentTrack) {
			return;
		}

		const loadAndPlayTrack = async () => {
			dispatch({type: 'SET_LOADING', loading: true});

			try {
				await musicService.getStreamUrl(state.currentTrack!.videoId);

				// Clean up previous audio
				if (audioRef.current) {
					audioRef.current.pause();
					audioRef.current = null;
				}

				// Create new audio element (browser-style API simulation)
				// Note: In a real CLI, we'd use a library like play-sound or speaker
				// For now, this is a placeholder for the actual audio playback
				audioRef.current = {
					play: async () => {
						// Placeholder: would actually play audio here
						console.log(`Playing: ${state.currentTrack!.title}`);
					},
					pause: () => {
						// Placeholder
					},
					seek: (_time: number) => {
						void _time;
					},
					setVolume: () => {
						// Placeholder
					},
				};

				dispatch({type: 'SET_LOADING', loading: false});

				// Start progress tracking
				if (progressIntervalRef.current) {
					clearInterval(progressIntervalRef.current);
				}

				progressIntervalRef.current = setInterval(() => {
					dispatch({type: 'UPDATE_PROGRESS', progress: state.progress + 0.1});
				}, 100);

				await audioRef.current.play();
			} catch (error) {
				dispatch({
					type: 'SET_ERROR',
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
	}, [state.currentTrack?.videoId]);

	// Handle play/pause state
	useEffect(() => {
		if (!audioRef.current) {
			return;
		}

		if (state.isPlaying) {
			audioRef.current.play();
		} else {
			audioRef.current.pause();
		}
	}, [state.isPlaying]);

	// Handle volume changes
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.setVolume(state.volume / 100);
		}

		// Save to config
		const config = getConfigService();
		config.set('volume', state.volume);
	}, [state.volume]);

	// Handle track completion
	useEffect(() => {
		if (state.duration > 0 && state.progress >= state.duration) {
			if (state.repeat === 'one') {
				dispatch({type: 'SEEK', position: 0});
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
				dispatch({type: 'ADD_TO_QUEUE', track});
			}

			// Find position and play
			const position = state.queue.findIndex(t => t.videoId === track.videoId);
			if (position >= 0) {
				dispatch({type: 'SET_QUEUE_POSITION', position});
			} else {
				dispatch({type: 'PLAY', track});
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
