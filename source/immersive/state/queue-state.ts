import type {Track} from '../../types/youtube-music.types.ts';

export interface ImmersivePlayerState {
	currentTrack: Track | null;
	queue: Track[];
	queueIndex: number;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isDiscoMode: boolean;
}

export function createInitialImmersiveState(
	overrides: Partial<ImmersivePlayerState> = {},
): ImmersivePlayerState {
	return {
		currentTrack: null,
		queue: [],
		queueIndex: 0,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		volume: 70,
		isDiscoMode: false,
		...overrides,
	};
}

export function setQueue(state: ImmersivePlayerState, tracks: Track[]): void {
	state.queue = [...tracks];
	state.queueIndex = 0;
	state.currentTrack = tracks[0] ?? null;
}

export function addToQueue(state: ImmersivePlayerState, track: Track): void {
	state.queue.push(track);
	if (!state.currentTrack) {
		state.currentTrack = track;
		state.queueIndex = 0;
	}
}

export function advanceQueue(state: ImmersivePlayerState): Track | null {
	if (state.queue.length === 0) {
		state.currentTrack = null;
		return null;
	}

	const nextIndex = state.queueIndex + 1;
	if (nextIndex >= state.queue.length) {
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
	const upcoming: Track[] = [];
	for (
		let i = state.queueIndex + 1;
		i < state.queue.length && upcoming.length < count;
		i++
	) {
		const track = state.queue[i];
		if (track) {
			upcoming.push(track);
		}
	}
	return upcoming;
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
