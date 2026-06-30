/** mpv pause events that follow EOF are spurious (idle state) — match Ink TUI. */
export const EOF_PAUSE_SUPPRESSION_MS = 2000;

/** Minimum gap between immersive EOF auto-advance calls. */
export const ADVANCE_DEBOUNCE_MS = 1500;

/** Immersive: suppress pause sync while loading the next track after EOF. */
export const ADVANCE_GRACE_MS = 15_000;

/** Immersive: time-pos unchanged this long while "playing" → sync UI to paused. */
export const PLAYBACK_STALL_MS = 3000;

/** Background detach reattach older than this is treated as stale. */
export const BACKGROUND_PLAYBACK_TTL_MS = 30 * 60 * 1000;

export type MpvPauseSyncInput = {
	paused: boolean;
	isAdvancing?: boolean;
	eofTimestamp: number;
	advanceGraceUntil?: number;
	now?: number;
};

/**
 * Returns true when an mpv `pause` property change should update app/UI state.
 * Suppresses during track advance, EOF idle pause, and post-EOF load grace.
 */
export function shouldApplyMpvPauseSync(input: MpvPauseSyncInput): boolean {
	if (!input.paused) {
		return true;
	}

	if (input.isAdvancing) {
		return false;
	}

	const now = input.now ?? Date.now();

	if (
		input.advanceGraceUntil !== undefined &&
		input.advanceGraceUntil > 0 &&
		now < input.advanceGraceUntil
	) {
		return false;
	}

	if (now - input.eofTimestamp < EOF_PAUSE_SUPPRESSION_MS) {
		return false;
	}

	return true;
}

export function shouldDebounceAdvance(
	lastAdvanceAt: number,
	now: number = Date.now(),
): boolean {
	return now - lastAdvanceAt < ADVANCE_DEBOUNCE_MS;
}
