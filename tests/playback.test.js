import test from 'ava';

test('player service exposes singleton without starting mpv', async t => {
	const {getPlayerService} =
		await import('../source/services/player/player.service.ts');

	const a = getPlayerService();
	const b = getPlayerService();

	t.is(a, b);

	// Should allow pause/resume/stop without crashing when mpv is not running
	t.notThrows(() => {
		a.pause();
		a.resume();
		a.stop();
	});
});

// ── Shuffle reducer tests ─────────────────────────────────────────────────────

/** Build a minimal PlayerState for reducer tests */
function makeState(overrides = {}) {
	return {
		currentTrack: null,
		isPlaying: false,
		volume: 70,
		speed: 1.0,
		progress: 0,
		duration: 0,
		queue: [],
		queuePosition: 0,
		repeat: 'off',
		shuffle: false,
		isLoading: false,
		error: null,
		...overrides,
	};
}

/** Build a minimal Track object */
function makeTrack(id) {
	return {videoId: id, title: `Track ${id}`, artists: [], duration: 200};
}

test('TOGGLE_SHUFFLE flips shuffle from false to true', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const state = makeState({shuffle: false});
	const next = playerReducer(state, {category: 'TOGGLE_SHUFFLE'});
	t.true(next.shuffle);
});

test('TOGGLE_SHUFFLE flips shuffle from true to false', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const state = makeState({shuffle: true});
	const next = playerReducer(state, {category: 'TOGGLE_SHUFFLE'});
	t.false(next.shuffle);
});

test('NEXT with empty queue returns unchanged state', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const state = makeState({shuffle: true, queue: [], queuePosition: 0});
	const next = playerReducer(state, {category: 'NEXT'});
	t.is(next, state); // referential equality — no change
});

test('NEXT with shuffle=true and single-track queue falls through sequentially (no-op)', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const track = makeTrack('a');
	const state = makeState({
		shuffle: true,
		queue: [track],
		queuePosition: 0,
		currentTrack: track,
		repeat: 'off',
	});
	// Only 1 track — sequential logic applies, nextPosition (1) >= queue.length (1) → return state
	const next = playerReducer(state, {category: 'NEXT'});
	t.is(next.queuePosition, 0); // position unchanged
});

test('NEXT with shuffle=true and multi-track queue returns a different position', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const tracks = ['a', 'b', 'c', 'd', 'e'].map(makeTrack);
	const state = makeState({
		shuffle: true,
		queue: tracks,
		queuePosition: 2,
		currentTrack: tracks[2],
	});

	// Run many times to verify we never stay at position 2
	for (let i = 0; i < 20; i++) {
		const next = playerReducer(state, {category: 'NEXT'});
		t.not(next.queuePosition, 2, 'shuffle must not repeat current position');
		t.true(
			next.queuePosition >= 0 && next.queuePosition < tracks.length,
			'new position must be in valid range',
		);
		t.is(next.progress, 0, 'progress must reset to 0');
	}
});

test('NEXT with shuffle=false uses sequential order', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const tracks = ['a', 'b', 'c'].map(makeTrack);
	const state = makeState({
		shuffle: false,
		queue: tracks,
		queuePosition: 1,
		currentTrack: tracks[1],
	});
	const next = playerReducer(state, {category: 'NEXT'});
	t.is(next.queuePosition, 2);
	t.is(next.currentTrack?.videoId, 'c');
});

test('PREVIOUS is unaffected by shuffle state', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const tracks = ['a', 'b', 'c'].map(makeTrack);
	const state = makeState({
		shuffle: true,
		queue: tracks,
		queuePosition: 2,
		currentTrack: tracks[2],
		progress: 0,
	});
	const next = playerReducer(state, {category: 'PREVIOUS'});
	t.is(next.queuePosition, 1); // always goes to sequential previous
	t.is(next.currentTrack?.videoId, 'b');
});

test('NEXT with shuffle=true wraps with repeat=all using random pick', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const tracks = ['a', 'b', 'c'].map(makeTrack);
	const state = makeState({
		shuffle: true,
		queue: tracks,
		queuePosition: 0,
		currentTrack: tracks[0],
		repeat: 'all',
	});
	// Shuffle is active and queue has 3 tracks — should always return a position != 0
	for (let i = 0; i < 10; i++) {
		const next = playerReducer(state, {category: 'NEXT'});
		t.not(next.queuePosition, 0, 'shuffle must not return current position');
	}
});

test('discord rpc service no-ops when disabled', async t => {
	const {getDiscordRpcService} =
		await import('../source/services/discord/discord-rpc.service.ts');
	const rpc = getDiscordRpcService();

	rpc.setEnabled(false);
	await rpc.connect();
	await rpc.updateActivity({
		title: 'Song',
		artist: 'Artist',
		startTimestamp: Date.now(),
	});
	await rpc.clearActivity();

	t.pass();
});
