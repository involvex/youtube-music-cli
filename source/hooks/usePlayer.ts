// Player hook - audio playback orchestration
import {useCallback} from 'react';
import {usePlayer as usePlayerStore} from '../stores/player.store.tsx';
import {getConfigService} from '../services/config/config.service.ts';
import type {Track} from '../types/youtube-music.types.ts';

export function usePlayer() {
	const {state, dispatch, ...playerStore} = usePlayerStore();

	const play = useCallback(
		(track: Track, options?: {clearQueue?: boolean}) => {
			if (options?.clearQueue) {
				// When clearing the queue, always dispatch fresh play commands rather
				// than relying on the stale queue state captured in this closure.
				// This fixes a bug where a track already in the queue wouldn't replay
				// after clearQueue because SET_QUEUE_POSITION would be dispatched
				// against the (now-empty) queue.
				dispatch({category: 'CLEAR_QUEUE'});
				dispatch({category: 'ADD_TO_QUEUE', track});
				dispatch({category: 'PLAY', track});
			} else {
				// Add to queue if not already there
				const isInQueue = state.queue.some(t => t.videoId === track.videoId);

				if (!isInQueue) {
					dispatch({category: 'ADD_TO_QUEUE', track});
				}

				// Find position and play
				const position = state.queue.findIndex(
					t => t.videoId === track.videoId,
				);
				if (position >= 0) {
					dispatch({category: 'SET_QUEUE_POSITION', position});
				} else {
					dispatch({category: 'PLAY', track});
				}
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
