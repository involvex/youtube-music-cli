import test from 'ava';

test('shouldPrefetchAutoplay allows repeat-all and shuffle when autoplay on', async t => {
	const {shouldPrefetchAutoplay} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const base = {
		autoplay: true,
		isPlaying: true,
		repeat: 'off',
		shuffle: false,
		queueLength: 3,
		queuePosition: 2,
		currentTrackVideoId: 'seed',
		radioIsActive: false,
		explicitQueueLength: 3,
	};

	t.true(
		shouldPrefetchAutoplay(base, {
			fetchedForVideoId: null,
			isFetching: false,
		}),
	);

	t.true(
		shouldPrefetchAutoplay(
			{...base, repeat: 'all'},
			{fetchedForVideoId: null, isFetching: false},
		),
	);

	t.true(
		shouldPrefetchAutoplay(
			{...base, shuffle: true, queueLength: 4, explicitQueueLength: 4},
			{fetchedForVideoId: null, isFetching: false},
		),
	);

	t.false(
		shouldPrefetchAutoplay(
			{...base, autoplay: false},
			{fetchedForVideoId: null, isFetching: false},
		),
	);

	t.false(
		shouldPrefetchAutoplay(
			{...base, repeat: 'one'},
			{fetchedForVideoId: null, isFetching: false},
		),
	);

	t.false(
		shouldPrefetchAutoplay(
			{...base, queuePosition: 0},
			{
				fetchedForVideoId: 'seed',
				isFetching: false,
			},
		),
	);

	t.true(
		shouldPrefetchAutoplay(base, {
			fetchedForVideoId: 'seed',
			isFetching: false,
		}),
	);

	t.true(
		shouldPrefetchAutoplay(
			{...base, isPlaying: false},
			{
				fetchedForVideoId: 'seed',
				isFetching: false,
				waitingAtQueueEnd: true,
			},
		),
	);
});

test('shouldLoopExplicitQueue defers repeat-all when autoplay on', async t => {
	const {shouldLoopExplicitQueue} =
		await import('../source/services/player/autoplay-coordinator.ts');

	t.false(shouldLoopExplicitQueue({autoplay: true, repeat: 'all'}));
	t.true(shouldLoopExplicitQueue({autoplay: false, repeat: 'all'}));
	t.false(shouldLoopExplicitQueue({autoplay: false, repeat: 'off'}));
});

test('buildAutoplaySeedPlan rotates through session history', async t => {
	const {buildAutoplaySeedPlan} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const {seeds, nextCursor} = buildAutoplaySeedPlan('current', ['a', 'b'], 0);
	t.deepEqual(seeds, ['current', 'a', 'b']);
	t.is(nextCursor, 0);

	const second = buildAutoplaySeedPlan('current', ['a', 'b'], nextCursor);
	t.true(second.seeds.includes('current'));
});

test('mergeSuggestionTracksForAutoplay dedupes recent plays and queue', async t => {
	const {mergeSuggestionTracksForAutoplay} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const recent = new Set(['a']);
	const queue = new Set(['b']);
	const merged = mergeSuggestionTracksForAutoplay(recent, queue, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);

	t.is(merged.length, 1);
	t.is(merged[0]?.videoId, 'c');
});

test('shouldResumeAfterPrefetch triggers near end without isPlaying check', async t => {
	const {shouldResumeAfterPrefetch} =
		await import('../source/services/player/autoplay-coordinator.ts');

	t.false(shouldResumeAfterPrefetch(false, 98, 100));
	t.true(shouldResumeAfterPrefetch(true, 96, 100));
	t.true(shouldResumeAfterPrefetch(true, 0, 0));
	t.false(shouldResumeAfterPrefetch(true, 10, 100));
});

test('mergeSuggestionTracks dedupes against existing queue ids', async t => {
	const {mergeSuggestionTracks} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const existing = new Set(['a', 'b']);
	const merged = mergeSuggestionTracks(existing, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'c', title: 'C', artists: []},
		{videoId: 'c', title: 'C duplicate', artists: []},
	]);

	t.is(merged.length, 1);
	t.is(merged[0]?.videoId, 'c');
});

test('recordSessionTrack keeps recent unique ids', async t => {
	const {recordSessionTrack, SESSION_HISTORY_MAX} =
		await import('../source/services/player/autoplay-coordinator.ts');

	let history = [];
	history = recordSessionTrack(history, 'a');
	history = recordSessionTrack(history, 'b');
	history = recordSessionTrack(history, 'a');

	t.deepEqual(history, ['b', 'a']);

	for (let i = 0; i < SESSION_HISTORY_MAX + 5; i++) {
		history = recordSessionTrack(history, `track-${i}`);
	}
	t.is(history.length, SESSION_HISTORY_MAX);
});

test('pickHistoryFallbackSeed rotates through session history', async t => {
	const {pickHistoryFallbackSeed} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const history = ['a', 'b', 'c'];
	const exclude = new Set(['a']);

	const first = pickHistoryFallbackSeed(history, 0, exclude);
	t.is(first.seed, 'b');

	const second = pickHistoryFallbackSeed(history, first.nextCursor, exclude);
	t.is(second.seed, 'c');
});

test('shouldDeferPauseAtQueueEnd waits while autoplay is enabled or fetching', async t => {
	const {shouldDeferPauseAtQueueEnd} =
		await import('../source/services/player/autoplay-coordinator.ts');

	t.true(shouldDeferPauseAtQueueEnd(true, false));
	t.true(shouldDeferPauseAtQueueEnd(false, true));
	t.false(shouldDeferPauseAtQueueEnd(false, false));
});
