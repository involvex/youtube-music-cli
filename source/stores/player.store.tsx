// Player store - manages player state
import {createContext, useContext, useReducer, type ReactNode} from 'react';
import type {PlayerState, PlayerAction} from '../types/player.types.ts';
import {getPlayerService} from '../services/player/player.service.ts';

const initialState: PlayerState = {
	currentTrack: null,
	isPlaying: false,
	volume: 70,
	progress: 0,
	duration: 0,
	queue: [],
	queuePosition: 0,
	repeat: 'off',
	shuffle: false,
	isLoading: false,
	error: null,
};

// Get player service instance
const playerService = getPlayerService();

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
	switch (action.category) {
		case 'PLAY':
			return {
				...state,
				currentTrack: action.track,
				isPlaying: true,
				progress: 0,
				error: null,
			};

		case 'PAUSE':
			return {...state, isPlaying: false};

		case 'RESUME':
			return {...state, isPlaying: true};

		case 'STOP':
			return {
				...state,
				isPlaying: false,
				progress: 0,
				currentTrack: null,
			};

		case 'NEXT':
			const nextPosition = state.queuePosition + 1;
			if (nextPosition >= state.queue.length) {
				if (state.repeat === 'all') {
					return {
						...state,
						queuePosition: 0,
						currentTrack: state.queue[0] ?? null,
						progress: 0,
					};
				}
				return state;
			}
			return {
				...state,
				queuePosition: nextPosition,
				currentTrack: state.queue[nextPosition] ?? null,
				progress: 0,
			};

		case 'PREVIOUS':
			const prevPosition = state.queuePosition - 1;
			if (prevPosition < 0) {
				return state;
			}
			if (state.progress > 3) {
				return {
					...state,
					progress: 0,
				};
			}
			return {
				...state,
				queuePosition: prevPosition,
				currentTrack: state.queue[prevPosition] ?? null,
				progress: 0,
			};

		case 'SEEK':
			return {
				...state,
				progress: Math.max(0, Math.min(action.position, state.duration)),
			};

		case 'SET_VOLUME': {
			const newVolume = Math.max(0, Math.min(100, action.volume));
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_UP': {
			const newVolume = Math.min(100, state.volume + 10);
			logger.debug('PlayerReducer', 'VOLUME_UP', {
				oldVolume: state.volume,
				newVolume,
			});
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_DOWN': {
			const newVolume = Math.max(0, state.volume - 10);
			logger.debug('PlayerReducer', 'VOLUME_DOWN', {
				oldVolume: state.volume,
				newVolume,
			});
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'TOGGLE_SHUFFLE':
			return {...state, shuffle: !state.shuffle};

		case 'TOGGLE_REPEAT':
			const repeatModes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
			const currentIndex = repeatModes.indexOf(state.repeat);
			const nextRepeat: 'off' | 'all' | 'one' =
				repeatModes[(currentIndex + 1) % 3] ?? 'off';
			return {...state, repeat: nextRepeat};

		case 'SET_QUEUE':
			return {
				...state,
				queue: action.queue,
				queuePosition: 0,
			};

		case 'ADD_TO_QUEUE':
			return {...state, queue: [...state.queue, action.track]};

		case 'REMOVE_FROM_QUEUE':
			const newQueue = [...state.queue];
			newQueue.splice(action.index, 1);
			return {...state, queue: newQueue};

		case 'CLEAR_QUEUE':
			return {
				...state,
				queue: [],
				queuePosition: 0,
				isPlaying: false,
			};

		case 'SET_QUEUE_POSITION':
			if (action.position >= 0 && action.position < state.queue.length) {
				return {
					...state,
					queuePosition: action.position,
					currentTrack: state.queue[action.position] ?? null,
					progress: 0,
				};
			}
			return state;

		case 'UPDATE_PROGRESS':
			return {...state, progress: action.progress};

		case 'TICK':
			if (state.isPlaying) {
				return {...state, progress: state.progress + 1};
			}
			return state;

		case 'SET_LOADING':
			return {...state, isLoading: action.loading};

		case 'SET_ERROR':
			return {...state, error: action.error, isLoading: false};

		default:
			return state;
	}
}

import type {Track} from '../types/youtube-music.types.ts';

type PlayerContextValue = {
	state: PlayerState;
	dispatch: (action: PlayerAction) => void;
	play: (track: Track) => void;
	pause: () => void;
	resume: () => void;
	next: () => void;
	previous: () => void;
	seek: (position: number) => void;
	setVolume: (volume: number) => void;
	volumeUp: () => void;
	volumeDown: () => void;
	toggleShuffle: () => void;
	toggleRepeat: () => void;
	setQueue: (queue: Track[]) => void;
	addToQueue: (track: Track) => void;
	removeFromQueue: (index: number) => void;
	clearQueue: () => void;
	setQueuePosition: (position: number) => void;
};

import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {useEffect, useRef, useMemo} from 'react';
import {logger} from '../services/logger/logger.service.ts';

const PlayerContext = createContext<PlayerContextValue | null>(null);

function PlayerManager() {
	const {state, dispatch, next} = usePlayer();
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const musicService = getMusicService();
	const playerService = getPlayerService();

	// Initialize audio on mount
	useEffect(() => {
		const config = getConfigService();
		dispatch({category: 'SET_VOLUME', volume: config.get('volume')});

		const currentInterval = progressIntervalRef.current;
		return () => {
			if (currentInterval) {
				clearInterval(currentInterval);
			}
			playerService.stop();
		};
	}, [dispatch]);

	// Handle track changes
	useEffect(() => {
		const track = state.currentTrack;
		if (!track) {
			logger.debug('PlayerManager', 'No current track');
			return;
		}

		logger.info('PlayerManager', 'Loading track', {
			title: track.title,
			videoId: track.videoId,
		});

		const loadAndPlayTrack = async () => {
			dispatch({category: 'SET_LOADING', loading: true});

			try {
				logger.debug('PlayerManager', 'Starting playback with mpv', {
					videoId: track.videoId,
					volume: state.volume,
				});

				// Pass YouTube URL directly to mpv (it handles stream extraction via yt-dlp)
				const youtubeUrl = `https://www.youtube.com/watch?v=${track.videoId}`;

				await playerService.play(youtubeUrl, {
					volume: state.volume,
				});

				logger.info('PlayerManager', 'Playback started successfully');
				dispatch({category: 'SET_LOADING', loading: false});
			} catch (error) {
				logger.error('PlayerManager', 'Failed to load track', {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					track: {title: track.title, videoId: track.videoId},
				});
				dispatch({
					category: 'SET_ERROR',
					error:
						error instanceof Error ? error.message : 'Failed to load track',
				});
			}
		};

		void loadAndPlayTrack();
		// Note: state.volume intentionally excluded - volume changes should not restart playback
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.currentTrack, dispatch, musicService]);

	// Handle progress tracking
	useEffect(() => {
		if (state.isPlaying && state.currentTrack) {
			const interval = setInterval(() => {
				dispatch({category: 'TICK'});
			}, 1000);

			return () => {
				clearInterval(interval);
			};
		}

		return undefined;
	}, [state.isPlaying, state.currentTrack, dispatch]);

	// Handle play/pause state
	useEffect(() => {
		if (!state.isPlaying) {
			playerService.pause();
		}
	}, [state.isPlaying, playerService]);

	// Handle volume changes
	useEffect(() => {
		const config = getConfigService();
		config.set('volume', state.volume);
	}, [state.volume]);

	// Handle track completion
	useEffect(() => {
		if (state.duration > 0 && state.progress >= state.duration) {
			if (state.repeat === 'one') {
				dispatch({category: 'SEEK', position: 0});
			} else {
				next();
			}
		}
	}, [state.progress, state.duration, state.repeat, next, dispatch]);

	return null;
}

export function PlayerProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(playerReducer, initialState);

	const actions = useMemo(
		() => ({
			play: (track: Track) => {
				logger.info('PlayerProvider', 'play() action dispatched', {
					title: track.title,
					videoId: track.videoId,
				});
				dispatch({category: 'PLAY', track});
			},
			pause: () => dispatch({category: 'PAUSE'}),
			resume: () => dispatch({category: 'RESUME'}),
			next: () => dispatch({category: 'NEXT'}),
			previous: () => dispatch({category: 'PREVIOUS'}),
			seek: (position: number) => dispatch({category: 'SEEK', position}),
			setVolume: (volume: number) => dispatch({category: 'SET_VOLUME', volume}),
			volumeUp: () => {
				logger.debug('PlayerActions', 'volumeUp called');
				dispatch({category: 'VOLUME_UP'});
			},
			volumeDown: () => {
				logger.debug('PlayerActions', 'volumeDown called');
				dispatch({category: 'VOLUME_DOWN'});
			},
			toggleShuffle: () => dispatch({category: 'TOGGLE_SHUFFLE'}),
			toggleRepeat: () => dispatch({category: 'TOGGLE_REPEAT'}),
			setQueue: (queue: Track[]) => dispatch({category: 'SET_QUEUE', queue}),
			addToQueue: (track: Track) => dispatch({category: 'ADD_TO_QUEUE', track}),
			removeFromQueue: (index: number) =>
				dispatch({category: 'REMOVE_FROM_QUEUE', index}),
			clearQueue: () => dispatch({category: 'CLEAR_QUEUE'}),
			setQueuePosition: (position: number) =>
				dispatch({category: 'SET_QUEUE_POSITION', position}),
		}),
		[],
	);

	const contextValue = useMemo(
		() => ({
			state,
			dispatch,
			...actions,
		}),
		[state, actions],
	);

	return (
		<PlayerContext.Provider value={contextValue}>
			<PlayerManager />
			{children}
		</PlayerContext.Provider>
	);
}

export function usePlayer(): PlayerContextValue {
	const context = useContext(PlayerContext);

	if (!context) {
		throw new Error('usePlayer must be used within PlayerProvider');
	}

	return context;
}
