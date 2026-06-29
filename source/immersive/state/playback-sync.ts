export {
	ADVANCE_DEBOUNCE_MS,
	EOF_PAUSE_SUPPRESSION_MS,
	shouldApplyMpvPauseSync,
	shouldDebounceAdvance,
} from '../../services/player/mpv-event-policy.ts';

/** @deprecated Use shouldApplyMpvPauseSync from mpv-event-policy */
export {shouldApplyMpvPauseSync as shouldSyncPauseFromMpv} from '../../services/player/mpv-event-policy.ts';
