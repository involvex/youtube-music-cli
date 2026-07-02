import {shouldLoopExplicitQueue} from '../../services/player/autoplay-coordinator.ts';
import type {RadioSeed} from '../../types/radio.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';

export type RepeatMode = 'off' | 'all' | 'one';

export interface ImmersivePlayerState {
	currentTrack: Track | null;
	queue: Track[];
	queueIndex: number;
	playbackOrder: number[] | null;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isDiscoMode: boolean;
	shuffle: boolean;
	repeat: RepeatMode;
	autoplay: boolean;
	/** User-queued tracks count; autoplay extensions sit beyond this boundary. */
	explicitQueueLength: number;
	radioIsActive: boolean;
	radioSeed: RadioSeed | null;
}

export function createInitialImmersiveState(
	overrides: Partial<ImmersivePlayerState> = {},
): ImmersivePlayerState {
	return {
		currentTrack: null,
		queue: [],
		queueIndex: 0,
		playbackOrder: null,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		volume: 70,
		isDiscoMode: false,
		shuffle: false,
		repeat: 'off',
		autoplay: true,
		explicitQueueLength: 0,
		radioIsActive: false,
		radioSeed: null,
		...overrides,
	};
}

function fisherYatesShuffle(length: number): number[] {
	const order = Array.from({length}, (_, index) => index);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j]!, order[i]!];
	}
	return order;
}

/** Shuffled queue indices with `startAt` rotated to the front of playback order. */
export function buildShuffledOrder(length: number, startAt = 0): number[] {
	if (length <= 1) {
		return length === 1 ? [0] : [];
	}

	const order = fisherYatesShuffle(length);
	const startPos = order.indexOf(startAt);
	if (startPos <= 0) {
		return order;
	}

	return [...order.slice(startPos), ...order.slice(0, startPos)];
}

export function shuffleQueueOrder(
	state: ImmersivePlayerState,
	startAt = state.queueIndex,
): void {
	if (state.queue.length <= 1) {
		state.playbackOrder = null;
		return;
	}

	state.playbackOrder = buildShuffledOrder(state.queue.length, startAt);
}

export function setQueue(
	state: ImmersivePlayerState,
	tracks: Track[],
	startIndex = 0,
): void {
	const safeStart = Math.min(
		Math.max(0, startIndex),
		Math.max(0, tracks.length - 1),
	);
	state.queue = [...tracks];
	state.queueIndex = safeStart;
	state.currentTrack = tracks[safeStart] ?? tracks[0] ?? null;
	state.explicitQueueLength = tracks.length;

	if (state.shuffle && tracks.length > 1) {
		shuffleQueueOrder(state, safeStart);
	} else {
		state.playbackOrder = null;
	}
}

export function addToQueue(state: ImmersivePlayerState, track: Track): void {
	state.queue.push(track);
	if (!state.currentTrack) {
		state.currentTrack = track;
		state.queueIndex = 0;
	}
	if (state.shuffle && state.queue.length > 1) {
		shuffleQueueOrder(state, state.queueIndex);
	}
}

/** Append autoplay suggestions without reshuffling the active playback order. */
export function appendTracksForAutoplay(
	state: ImmersivePlayerState,
	tracks: Track[],
): number {
	const existingIds = new Set(
		state.queue.map(track => track.videoId).filter(Boolean),
	);
	let added = 0;

	for (const track of tracks) {
		if (!track.videoId || existingIds.has(track.videoId)) {
			continue;
		}

		existingIds.add(track.videoId);
		state.queue.push(track);
		const newIndex = state.queue.length - 1;
		if (state.shuffle && state.playbackOrder) {
			state.playbackOrder.push(newIndex);
		}
		added++;
	}

	if (
		added > 0 &&
		state.shuffle &&
		state.queue.length > 1 &&
		!state.playbackOrder
	) {
		shuffleQueueOrder(state, state.queueIndex);
	}

	return added;
}

export function toggleAutoplay(state: ImmersivePlayerState): boolean {
	state.autoplay = !state.autoplay;
	return state.autoplay;
}

export function toggleShuffle(state: ImmersivePlayerState): boolean {
	state.shuffle = !state.shuffle;
	if (state.shuffle && state.queue.length > 1) {
		shuffleQueueOrder(state, state.queueIndex);
	} else {
		state.playbackOrder = null;
	}
	return state.shuffle;
}

export function cycleRepeat(state: ImmersivePlayerState): RepeatMode {
	const modes: RepeatMode[] = ['off', 'all', 'one'];
	const index = modes.indexOf(state.repeat);
	state.repeat = modes[(index + 1) % modes.length] ?? 'off';
	return state.repeat;
}

function advanceShuffleQueue(state: ImmersivePlayerState): Track | null {
	if (!state.playbackOrder || state.playbackOrder.length <= 1) {
		if (state.queue.length <= 1) {
			return null;
		}

		let randomIndex = state.queueIndex;
		while (randomIndex === state.queueIndex) {
			randomIndex = Math.floor(Math.random() * state.queue.length);
		}
		state.queueIndex = randomIndex;
		state.currentTrack = state.queue[randomIndex] ?? null;
		state.currentTime = 0;
		return state.currentTrack;
	}

	let orderPos = state.playbackOrder.indexOf(state.queueIndex);
	if (orderPos === -1) {
		shuffleQueueOrder(state, state.queueIndex);
		orderPos = 0;
	}

	let nextOrderPos = orderPos + 1;
	if (nextOrderPos >= state.playbackOrder.length) {
		if (shouldLoopExplicitQueue(state)) {
			nextOrderPos = 0;
		} else {
			state.isPlaying = false;
			return null;
		}
	}

	const nextIndex = state.playbackOrder[nextOrderPos];
	if (nextIndex === undefined) {
		state.isPlaying = false;
		return null;
	}

	state.queueIndex = nextIndex;
	state.currentTrack = state.queue[nextIndex] ?? null;
	state.currentTime = 0;
	return state.currentTrack;
}

export function advanceQueue(state: ImmersivePlayerState): Track | null {
	if (state.queue.length === 0) {
		state.currentTrack = null;
		return null;
	}

	if (state.shuffle && state.queue.length > 1) {
		return advanceShuffleQueue(state);
	}

	const nextIndex = state.queueIndex + 1;
	if (nextIndex >= state.queue.length) {
		if (shouldLoopExplicitQueue(state)) {
			state.queueIndex = 0;
			state.currentTrack = state.queue[0] ?? null;
			state.currentTime = 0;
			return state.currentTrack;
		}
		state.isPlaying = false;
		return null;
	}

	state.queueIndex = nextIndex;
	state.currentTrack = state.queue[nextIndex] ?? null;
	state.currentTime = 0;
	return state.currentTrack;
}

export function previousQueue(state: ImmersivePlayerState): Track | null {
	if (state.queue.length === 0) {
		return null;
	}

	if (state.currentTime > 3 && state.currentTrack) {
		state.currentTime = 0;
		return state.currentTrack;
	}

	if (state.shuffle && state.playbackOrder && state.playbackOrder.length > 1) {
		const orderPos = state.playbackOrder.indexOf(state.queueIndex);
		const prevOrderPos = orderPos <= 0 ? 0 : orderPos - 1;
		const prevIndex = state.playbackOrder[prevOrderPos] ?? 0;
		state.queueIndex = prevIndex;
		state.currentTrack = state.queue[prevIndex] ?? null;
		state.currentTime = 0;
		return state.currentTrack;
	}

	const prevIndex = Math.max(0, state.queueIndex - 1);
	state.queueIndex = prevIndex;
	state.currentTrack = state.queue[prevIndex] ?? null;
	state.currentTime = 0;
	return state.currentTrack;
}

export function getUpcomingTracks(
	state: ImmersivePlayerState,
	count: number,
): Track[] {
	if (state.queue.length === 0 || count <= 0) {
		return [];
	}

	if (state.shuffle && state.queue.length > 1 && state.playbackOrder) {
		const orderPos = state.playbackOrder.indexOf(state.queueIndex);
		if (orderPos === -1) {
			return [];
		}

		const upcoming: Track[] = [];
		for (
			let step = 1;
			step < state.playbackOrder.length && upcoming.length < count;
			step++
		) {
			let pos = orderPos + step;
			if (pos >= state.playbackOrder.length) {
				if (!shouldLoopExplicitQueue(state)) {
					break;
				}
				pos %= state.playbackOrder.length;
			}

			const queueIndex = state.playbackOrder[pos];
			if (queueIndex === undefined) {
				continue;
			}

			const track = state.queue[queueIndex];
			if (track) {
				upcoming.push(track);
			}
		}
		return upcoming;
	}

	const upcoming: Track[] = [];
	for (let step = 1; upcoming.length < count; step++) {
		let idx = state.queueIndex + step;
		if (idx >= state.queue.length) {
			if (!shouldLoopExplicitQueue(state)) {
				break;
			}
			idx %= state.queue.length;
			if (idx === state.queueIndex) {
				break;
			}
		}

		const track = state.queue[idx];
		if (track) {
			upcoming.push(track);
		}
	}
	return upcoming;
}

export function resolveRandomFavoriteStartIndex(queueLength: number): number {
	if (queueLength <= 0) {
		return 0;
	}
	return Math.floor(Math.random() * queueLength);
}

export function trackArtists(track: Track): string {
	if (track.artists.length === 0) {
		return 'Unknown Artist';
	}
	return track.artists.map(artist => artist.name).join(', ');
}

export function trackYouTubeUrl(track: Track): string {
	return `https://www.youtube.com/watch?v=${track.videoId}`;
}

export function formatRepeatLabel(repeat: RepeatMode): string {
	if (repeat === 'all') {
		return 'ALL';
	}
	if (repeat === 'one') {
		return 'ONE';
	}
	return 'OFF';
}
