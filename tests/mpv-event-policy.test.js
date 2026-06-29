import test from 'ava';

test('mpv-event-policy: suppresses pause only when advancing or after EOF', async t => {
	const {EOF_PAUSE_SUPPRESSION_MS, shouldApplyMpvPauseSync} =
		await import('../source/services/player/mpv-event-policy.ts');

	const now = 10_000;

	t.false(
		shouldApplyMpvPauseSync({
			paused: true,
			isAdvancing: true,
			eofTimestamp: 0,
			now,
		}),
	);
	t.false(
		shouldApplyMpvPauseSync({
			paused: true,
			eofTimestamp: now - (EOF_PAUSE_SUPPRESSION_MS - 1),
			now,
		}),
	);
	t.true(
		shouldApplyMpvPauseSync({
			paused: true,
			eofTimestamp: now - EOF_PAUSE_SUPPRESSION_MS,
			now,
		}),
	);
	t.true(
		shouldApplyMpvPauseSync({
			paused: true,
			eofTimestamp: 0,
			now,
		}),
	);
	t.true(shouldApplyMpvPauseSync({paused: false, eofTimestamp: 0, now}));
});

test('mpv-event-policy: debounces EOF advance', async t => {
	const {ADVANCE_DEBOUNCE_MS, shouldDebounceAdvance} =
		await import('../source/services/player/mpv-event-policy.ts');

	t.true(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS - 1));
	t.false(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS));
});
