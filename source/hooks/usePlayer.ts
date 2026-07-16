// Player hook - audio playback orchestration
import {useCallback} from 'react';
import {usePlayer as usePlayerStore} from '../stores/player.store.tsx';
import {getConfigService} from '../services/config/config.service.ts';
import {getRadioService} from '../services/radio/radio.service.ts';
import type {Track} from '../types/youtube-music.types.ts';
import type {RadioSeed} from '../types/radio.types.ts';
import type {RadioStation} from '../types/radio-station.types.ts';

export function usePlayer() {
	const {state, dispatch, ...playerStore} = usePlayerStore();

	const play = useCallback(
		(track: Track, options?: {clearQueue?: boolean}) => {
			if (options?.clearQueue) {
				dispatch({category: 'CLEAR_QUEUE'});
				dispatch({category: 'ADD_TO_QUEUE', track});
				dispatch({category: 'PLAY', track});
			} else {
				const isInQueue = state.queue.some(t => t.videoId === track.videoId);

				if (!isInQueue) {
					dispatch({category: 'ADD_TO_QUEUE', track});
				}

				const position = state.queue.findIndex(
					t => t.videoId === track.videoId,
				);
				if (position >= 0) {
					dispatch({category: 'SET_QUEUE_POSITION', position});
				} else {
					dispatch({category: 'PLAY', track});
				}
			}

			const config = getConfigService();
			config.addToHistory(track.videoId);
		},
		[state.queue, dispatch],
	);

	const startRadio = useCallback(
		async (seed: RadioSeed) => {
			const radioService = getRadioService();
			const tracks = await radioService.fetchTracksForSeed(seed);

			if (tracks.length === 0) {
				return;
			}

			dispatch({category: 'CLEAR_QUEUE'});
			for (const track of tracks) {
				dispatch({category: 'ADD_TO_QUEUE', track});
			}

			const firstTrack = tracks[0];
			if (firstTrack) {
				dispatch({category: 'PLAY', track: firstTrack});
				dispatch({category: 'SET_QUEUE_POSITION', position: 0});
			}

			dispatch({category: 'START_RADIO', seed});
		},
		[dispatch],
	);

	const stopRadio = useCallback(() => {
		dispatch({category: 'STOP_RADIO'});
	}, [dispatch]);

	const playStream = useCallback(
		(station: RadioStation) => {
			dispatch({category: 'PLAY_STREAM', station});
		},
		[dispatch],
	);

	return {
		...playerStore,
		state,
		dispatch,
		play,
		startRadio,
		stopRadio,
		playStream,
	};
}
