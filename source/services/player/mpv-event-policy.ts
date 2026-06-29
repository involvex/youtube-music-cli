/** mpv pause events that follow EOF are spurious (idle state) — match Ink TUI. */
export const EOF_PAUSE_SUPPRESSION_MS = 2000;

/** Minimum gap between immersive EOF auto-advance calls. */
export const ADVANCE_DEBOUNCE_MS = 1500;

/** Immersive: time-pos unchanged this long while "playing" → sync UI to paused. */
export const PLAYBACK_STALL_MS = 3000;

/** Background detach reattach older than this is treated as stale. */
export const BACKGROUND_PLAYBACK_TTL_MS = 30 * 60 * 1000;

export type MpvPauseSyncInput = {
	paused: boolean;
	isAdvancing?: boolean;
	eofTimestamp: number;
	now?: number;
};

/**
 * Returns true when an mpv `pause` property change should update app/UI state.
 * Suppresses only during track advance or immediately after EOF (Ink parity).
 */
export function shouldApplyMpvPauseSync(input: MpvPauseSyncInput): boolean {
	if (!input.paused) {
		return true;
	}

	if (input.isAdvancing) {
		return false;
	}

	const now = input.now ?? Date.now();
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
