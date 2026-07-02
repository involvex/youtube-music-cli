import type {Track} from '../../types/youtube-music.types.ts';

export const AUTOPLAY_TRACKS_AHEAD_NORMAL = 5;
export const AUTOPLAY_TRACKS_AHEAD_RADIO = 15;
export const AUTOPLAY_RESUME_NEAR_END_SECONDS = 5;
export const SESSION_HISTORY_MAX = 30;
export const AUTOPLAY_TICK_MS = 2000;
export const AUTOPLAY_SEED_ATTEMPTS = 5;
export const AUTOPLAY_RETRY_DELAY_MS = 5000;
export const AUTOPLAY_MAX_FAILED_CYCLES = 3;

export type AutoplayQueueState = {
	autoplay: boolean;
	isPlaying: boolean;
	repeat: 'off' | 'all' | 'one';
	shuffle: boolean;
	queueLength: number;
	queuePosition: number;
	currentTrackVideoId: string | null;
	radioIsActive: boolean;
	/** Length of user-queued tracks; appended autoplay tracks are beyond this. */
	explicitQueueLength: number;
};

export type AutoplayPrefetchContext = {
	fetchedForVideoId: string | null;
	isFetching: boolean;
	/** True when EOF hit queue end and we are waiting for suggestions. */
	waitingAtQueueEnd?: boolean;
};

export function isAtQueueEnd(state: {
	queueLength: number;
	queuePosition: number;
}): boolean {
	return state.queueLength > 0 && state.queuePosition >= state.queueLength - 1;
}

export function isAtExplicitQueueEnd(state: {
	queuePosition: number;
	explicitQueueLength: number;
}): boolean {
	return (
		state.explicitQueueLength > 0 &&
		state.queuePosition >= state.explicitQueueLength - 1
	);
}

export function isInRadioExtensionPhase(state: {
	queuePosition: number;
	explicitQueueLength: number;
}): boolean {
	return (
		state.explicitQueueLength > 0 &&
		state.queuePosition >= state.explicitQueueLength
	);
}

export function getTracksAhead(state: {
	queueLength: number;
	queuePosition: number;
}): number {
	return state.queueLength - state.queuePosition - 1;
}

export function getAutoplayTracksAheadThreshold(
	radioIsActive: boolean,
): number {
	return radioIsActive
		? AUTOPLAY_TRACKS_AHEAD_RADIO
		: AUTOPLAY_TRACKS_AHEAD_NORMAL;
}

/** When autoplay is on, explicit queue plays once; repeat/shuffle wrap only when autoplay is off. */
export function shouldLoopExplicitQueue(state: {
	autoplay: boolean;
	repeat: 'off' | 'all' | 'one';
}): boolean {
	if (state.autoplay) {
		return false;
	}
	return state.repeat === 'all';
}

export function shouldPrefetchAutoplay(
	state: AutoplayQueueState,
	context?: AutoplayPrefetchContext,
): boolean {
	if (!state.autoplay || !state.currentTrackVideoId) {
		return false;
	}

	if (state.repeat === 'one') {
		return false;
	}

	const waitingAtQueueEnd = context?.waitingAtQueueEnd === true;
	const atExplicitEnd = isAtExplicitQueueEnd(state);
	const atEnd = isAtQueueEnd(state);

	if (!state.isPlaying && !waitingAtQueueEnd) {
		return false;
	}

	if (context?.isFetching) {
		return false;
	}

	const threshold = getAutoplayTracksAheadThreshold(state.radioIsActive);
	const tracksAhead = getTracksAhead(state);

	if (waitingAtQueueEnd || atExplicitEnd || atEnd) {
		return true;
	}

	if (tracksAhead > threshold) {
		return false;
	}

	if (
		context?.fetchedForVideoId === state.currentTrackVideoId &&
		tracksAhead > 0
	) {
		return false;
	}

	return true;
}

export function shouldDeferPauseAtQueueEnd(
	autoplay: boolean,
	isFetchingAutoplay: boolean,
): boolean {
	return autoplay || isFetchingAutoplay;
}

export function mergeSuggestionTracks(
	existingVideoIds: ReadonlySet<string>,
	newTracks: Track[],
): Track[] {
	const result: Track[] = [];
	const seen = new Set(existingVideoIds);
	for (const track of newTracks) {
		if (!track.videoId || seen.has(track.videoId)) {
			continue;
		}
		seen.add(track.videoId);
		result.push(track);
	}
	return result;
}

/** Dedupe suggestions against recent session plays, not the full queue. */
export function mergeSuggestionTracksForAutoplay(
	recentPlayedIds: ReadonlySet<string>,
	queueVideoIds: ReadonlySet<string>,
	newTracks: Track[],
): Track[] {
	const result: Track[] = [];
	const seen = new Set(recentPlayedIds);
	for (const track of newTracks) {
		if (!track.videoId || seen.has(track.videoId)) {
			continue;
		}
		if (queueVideoIds.has(track.videoId)) {
			continue;
		}
		seen.add(track.videoId);
		result.push(track);
	}
	return result;
}

export function shouldResumeAfterPrefetch(
	wasAtEndOfQueue: boolean,
	progress: number,
	duration: number,
): boolean {
	if (!wasAtEndOfQueue) {
		return false;
	}

	if (duration <= 0) {
		return true;
	}

	return progress >= duration - AUTOPLAY_RESUME_NEAR_END_SECONDS;
}

export function recordSessionTrack(
	history: string[],
	videoId: string,
	maxSize = SESSION_HISTORY_MAX,
): string[] {
	if (!videoId) {
		return history;
	}

	const withoutCurrent = history.filter(id => id !== videoId);
	const next = [...withoutCurrent, videoId];
	if (next.length <= maxSize) {
		return next;
	}
	return next.slice(next.length - maxSize);
}

export function pickHistoryFallbackSeed(
	history: string[],
	cursor: number,
	excludeIds: ReadonlySet<string>,
): {seed: string | null; nextCursor: number} {
	if (history.length === 0) {
		return {seed: null, nextCursor: cursor};
	}

	for (let offset = 0; offset < history.length; offset++) {
		const index = (cursor + offset) % history.length;
		const seed = history[index];
		if (seed && !excludeIds.has(seed)) {
			return {seed, nextCursor: (index + 1) % history.length};
		}
	}

	return {seed: null, nextCursor: cursor};
}

export function buildAutoplaySeedPlan(
	currentVideoId: string | null,
	sessionHistory: string[],
	cursor: number,
	maxAttempts = AUTOPLAY_SEED_ATTEMPTS,
): {seeds: string[]; nextCursor: number} {
	const seeds: string[] = [];
	const seen = new Set<string>();

	if (currentVideoId) {
		seeds.push(currentVideoId);
		seen.add(currentVideoId);
	}

	let nextCursor = cursor;
	for (
		let added = 0;
		added < maxAttempts - seeds.length && sessionHistory.length > 0;
		added++
	) {
		const fallback = pickHistoryFallbackSeed(sessionHistory, nextCursor, seen);
		nextCursor = fallback.nextCursor;
		if (!fallback.seed) {
			break;
		}
		seeds.push(fallback.seed);
		seen.add(fallback.seed);
	}

	return {seeds, nextCursor};
}
