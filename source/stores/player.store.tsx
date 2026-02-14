// Player store - manages player state
import React from 'react';
import {createContext, useContext, useReducer} from 'react';
import type {PlayerState, PlayerAction} from '../types/player.types.ts';

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
						currentTrack: state.queue[0],
						progress: 0,
					};
				}
				return state;
			}
			return {
				...state,
				queuePosition: nextPosition,
				currentTrack: state.queue[nextPosition],
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
				currentTrack: state.queue[prevPosition],
				progress: 0,
			};

		case 'SEEK':
			return {
				...state,
				progress: Math.max(0, Math.min(action.position, state.duration)),
			};

		case 'SET_VOLUME':
			return {...state, volume: Math.max(0, Math.min(100, action.volume))};

		case 'VOLUME_UP':
			return {...state, volume: Math.min(100, state.volume + 10)};

		case 'VOLUME_DOWN':
			return {...state, volume: Math.max(0, state.volume - 10)};

		case 'TOGGLE_SHUFFLE':
			return {...state, shuffle: !state.shuffle};

		case 'TOGGLE_REPEAT':
			const repeatModes: Array = ['off', 'all', 'one'];
			const currentIndex = repeatModes.indexOf(state.repeat);
			return {...state, repeat: repeatModes[(currentIndex + 1) % 3]};

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
			if (action.index >= 0 && action.index < state.queue.length) {
				return {
					...state,
					queuePosition: action.index,
					currentTrack: state.queue[action.index],
					progress: 0,
				};
			}
			return state;

		case 'UPDATE_PROGRESS':
			return {...state, progress: action.progress};

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

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({children}: {children: React.ReactNode}) {
	const [state, dispatch] = useReducer(playerReducer, initialState);

	const play = (track: Track) => dispatch({category: 'PLAY', track});
	const pause = () => dispatch({category: 'PAUSE'});
	const resume = () => dispatch({category: 'RESUME'});
	const next = () => dispatch({category: 'NEXT'});
	const previous = () => dispatch({category: 'PREVIOUS'});
	const seek = (position: number) => dispatch({category: 'SEEK', position});
	const setVolume = (volume: number) =>
		dispatch({category: 'SET_VOLUME', volume});
	const volumeUp = () => dispatch({category: 'VOLUME_UP'});
	const volumeDown = () => dispatch({category: 'VOLUME_DOWN'});
	const toggleShuffle = () => dispatch({category: 'TOGGLE_SHUFFLE'});
	const toggleRepeat = () => dispatch({category: 'TOGGLE_REPEAT'});
	const setQueue = (queue: Track[]) => dispatch({category: 'SET_QUEUE', queue});
	const addToQueue = (track: Track) =>
		dispatch({category: 'ADD_TO_QUEUE', track});
	const removeFromQueue = (index: number) =>
		dispatch({category: 'REMOVE_FROM_QUEUE', index});
	const clearQueue = () => dispatch({category: 'CLEAR_QUEUE'});
	const setQueuePosition = (position: number) =>
		dispatch({category: 'SET_QUEUE_POSITION', position});

	return (
		<PlayerContext.Provider
			value={{
				state,
				dispatch,
				play,
				pause,
				resume,
				next,
				previous,
				seek,
				setVolume,
				volumeUp,
				volumeDown,
				toggleShuffle,
				toggleRepeat,
				setQueue,
				addToQueue,
				removeFromQueue,
				clearQueue,
				setQueuePosition,
			}}
		>
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
