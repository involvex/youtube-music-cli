// Player hook - audio playback orchestration
import {useCallback} from 'react';
import {usePlayer as usePlayerStore} from '../stores/player.store.tsx';
import {getConfigService} from '../services/config/config.service.ts';
import type {Track} from '../types/youtube-music.types.ts';

export function usePlayer() {
	const {state, dispatch, ...playerStore} = usePlayerStore();

	const play = useCallback(
		(track: Track, options?: {clearQueue?: boolean}) => {
			// Clear queue if requested (e.g., playing from search results)
			if (options?.clearQueue) {
				dispatch({category: 'CLEAR_QUEUE'});
			}

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
		[state.queue, dispatch],
	);

	return {
		...playerStore,
		state,
		dispatch,
		play,
	};
}
