import test from 'ava';

test('parseKeyName maps arrow keys and control keys', async t => {
	const {parseKeyName} =
		await import('../source/immersive/input/key-parser.ts');

	t.is(parseKeyName('\x1B[A'), 'up');
	t.is(parseKeyName('\x1B[B'), 'down');
	t.is(parseKeyName('\x1B[C'), 'right');
	t.is(parseKeyName('\x1B[D'), 'left');
	t.is(parseKeyName(' '), ' ');
	t.is(parseKeyName('\x03'), 'Ctrl+C');
	t.is(parseKeyName('/'), '/');
	t.is(parseKeyName('\r'), 'enter');
	t.is(parseKeyName('S'), 'Shift+S');
	t.is(parseKeyName('D'), 'Shift+D');
	t.is(parseKeyName('s'), 's');
	t.is(parseKeyName(','), ',');
	t.is(parseKeyName('\t'), 'tab');
	t.is(parseKeyName('\x01'), 'Ctrl+A');
	t.is(parseKeyName('\x0c'), 'Ctrl+L');
	t.is(parseKeyName('+'), '+');
	t.is(parseKeyName('='), '+');
	t.is(parseKeyName('-'), '-');
	t.is(parseKeyName('\x1b[44;5u'), 'Ctrl+,');
	t.is(parseKeyName('\x1b[44;5;1u'), 'Ctrl+,');
	t.is(parseKeyName('\x1c'), null);
});

test('StdinKeyBuffer assembles chunked Ctrl+, sequences', async t => {
	const {StdinKeyBuffer} =
		await import('../source/immersive/input/stdin-buffer.ts');

	const keys = [];
	const buffer = new StdinKeyBuffer(key => {
		keys.push(key);
	});

	buffer.push('\x1b');
	t.is(keys.length, 0);

	buffer.push('[44;5;1u');
	t.deepEqual(keys, ['Ctrl+,']);

	buffer.dispose();
});

test('AudioCollector processes frequency bands', async t => {
	const {AudioCollector} =
		await import('../source/immersive/visualizer/audio-collector.ts');

	const collector = new AudioCollector(256);
	const samples = new Float32Array(256);
	for (let i = 0; i < samples.length; i++) {
		samples[i] = Math.sin(i / 10);
	}

	const processed = collector.processAudioData(samples);
	const bands = collector.getFrequencyBands(processed);

	t.true(processed.length > 0);
	t.true(bands.bass >= 0);
	t.true(bands.treble >= 0);
});

test('FrameBuffer setText and clear work', async t => {
	const {FrameBuffer} =
		await import('../source/immersive/renderer/frame-buffer.ts');

	const fb = new FrameBuffer(20, 5);
	fb.setText(2, 1, 'Hello', null, null, {bold: true});
	t.is(fb.getCell(2, 1)?.char, 'H');
	t.is(fb.getCell(2, 1)?.bold, true);

	fb.clear();
	t.is(fb.getCell(2, 1)?.char, ' ');
});

test('BrailleCanvas accumulates dots in the same cell', async t => {
	const {FrameBuffer} =
		await import('../source/immersive/renderer/frame-buffer.ts');
	const {BrailleCanvas} =
		await import('../source/immersive/renderer/braille-canvas.ts');

	const fb = new FrameBuffer(10, 10);
	const canvas = new BrailleCanvas(fb);

	canvas.setPixel(0, 0, [255, 0, 0]);
	canvas.setPixel(1, 0, [0, 255, 0]);

	const cell = fb.getCell(0, 0);
	t.not(cell?.char, ' ');
	t.not(cell?.char, String.fromCharCode(0x2800));
});

test('queue-state advances and rewinds queue', async t => {
	const {advanceQueue, createInitialImmersiveState, previousQueue, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState();
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);

	t.is(state.currentTrack?.videoId, 'a');
	t.is(advanceQueue(state)?.videoId, 'b');
	t.is(advanceQueue(state)?.videoId, 'c');
	t.is(advanceQueue(state), null);

	state.currentTime = 1;
	state.queueIndex = 2;
	state.currentTrack = state.queue[2] ?? null;
	t.is(previousQueue(state)?.videoId, 'b');
});

test('queue-state supports shuffle and repeat-all', async t => {
	const {advanceQueue, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({shuffle: true});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);

	const first = advanceQueue(state)?.videoId;
	t.not(first, 'a');
	t.true(['b', 'c'].includes(first ?? ''));

	state.shuffle = false;
	state.repeat = 'all';
	state.autoplay = false;
	state.queueIndex = 2;
	state.currentTrack = state.queue[2] ?? null;
	t.is(advanceQueue(state)?.videoId, 'a');
});

test('queue-state shuffle with repeat-all at end picks a different track', async t => {
	const {
		advanceQueue,
		createInitialImmersiveState,
		setQueue,
		shuffleQueueOrder,
	} = await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({
		shuffle: true,
		repeat: 'all',
		autoplay: false,
	});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);
	state.queueIndex = 2;
	state.currentTrack = state.queue[2] ?? null;
	shuffleQueueOrder(state, 2);

	const next = advanceQueue(state);
	t.truthy(next);
	t.not(next?.videoId, 'c');
	t.true(['a', 'b'].includes(next?.videoId ?? ''));
});

test('getUpcomingTracks wraps with repeat-all at last shuffle index', async t => {
	const {
		createInitialImmersiveState,
		getUpcomingTracks,
		setQueue,
		shuffleQueueOrder,
	} = await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({
		shuffle: true,
		repeat: 'all',
		autoplay: false,
	});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);
	state.queueIndex = 2;
	state.currentTrack = state.queue[2] ?? null;
	shuffleQueueOrder(state, 2);

	const upcoming = getUpcomingTracks(state, 5);
	t.true(upcoming.length >= 2);
	t.not(upcoming[0]?.videoId, 'c');
});

test('getUpcomingTracks wraps sequentially with repeat-all at queue end', async t => {
	const {createInitialImmersiveState, getUpcomingTracks, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({repeat: 'all', autoplay: false});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);
	state.queueIndex = 2;
	state.currentTrack = state.queue[2] ?? null;

	const upcoming = getUpcomingTracks(state, 3);
	t.deepEqual(
		upcoming.map(track => track.videoId),
		['a', 'b'],
	);
});

test('advanceQueue with playbackOrder does not repeat current track', async t => {
	const {advanceQueue, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({
		shuffle: true,
		repeat: 'all',
		autoplay: false,
	});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);

	const firstId = state.currentTrack?.videoId;
	const second = advanceQueue(state);
	t.not(second?.videoId, firstId);
});

test('resolveRandomFavoriteStartIndex stays within queue bounds', async t => {
	const {resolveRandomFavoriteStartIndex} =
		await import('../source/immersive/state/queue-state.ts');

	for (let i = 0; i < 20; i++) {
		const index = resolveRandomFavoriteStartIndex(15);
		t.true(index >= 0);
		t.true(index < 15);
	}
	t.is(resolveRandomFavoriteStartIndex(0), 0);
});

test('toggleShuffle rebuilds and clears playback order', async t => {
	const {createInitialImmersiveState, setQueue, toggleShuffle} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState();
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
	]);
	t.is(state.playbackOrder, null);

	t.true(toggleShuffle(state));
	t.truthy(state.playbackOrder);
	t.is(state.playbackOrder?.length, 2);

	t.false(toggleShuffle(state));
	t.is(state.playbackOrder, null);
});

test('playback-sync re-exports mpv-event-policy helpers', async t => {
	const {ADVANCE_DEBOUNCE_MS, shouldDebounceAdvance, shouldSyncPauseFromMpv} =
		await import('../source/immersive/state/playback-sync.ts');

	const now = 10_000;
	t.false(
		shouldSyncPauseFromMpv({
			paused: true,
			isAdvancing: true,
			eofTimestamp: 0,
			now,
		}),
	);
	t.true(
		shouldSyncPauseFromMpv({
			paused: true,
			eofTimestamp: 0,
			now,
		}),
	);

	t.true(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS - 1));
	t.false(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS));
});

test('queue-state cycles repeat modes', async t => {
	const {createInitialImmersiveState, cycleRepeat} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState();
	t.is(cycleRepeat(state), 'all');
	t.is(cycleRepeat(state), 'one');
	t.is(cycleRepeat(state), 'off');
});

test('settings overlay navigates and cycles rows', async t => {
	const {
		closeSettingsOverlay,
		createSettingsOverlayState,
		handleSettingsInput,
		openSettingsOverlay,
		SETTINGS_ROW_COUNT,
	} = await import('../source/immersive/ui/settings-overlay.ts');

	const overlay = createSettingsOverlayState();
	openSettingsOverlay(overlay);
	t.true(overlay.active);
	t.is(SETTINGS_ROW_COUNT, 23);

	t.is(handleSettingsInput(overlay, 'down', SETTINGS_ROW_COUNT), 'none');
	t.is(overlay.selectedIndex, 1);
	t.is(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT), 'cycle');
	overlay.selectedIndex = 10;
	t.is(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT), 'begin_text');
	overlay.selectedIndex = 19;
	t.is(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT), 'navigate');
	t.is(handleSettingsInput(overlay, 'escape', SETTINGS_ROW_COUNT), 'close');
	t.false(overlay.active);

	closeSettingsOverlay(overlay);
});

test('immersive settings items match TUI row count and cycle values', async t => {
	const {
		buildImmersiveSettingsRows,
		cycleImmersiveSetting,
		createSleepTimerState,
	} = await import('../source/immersive/settings/settings-items.ts');
	const {getConfigService} =
		await import('../source/services/config/config.service.ts');

	const config = getConfigService();
	const sleepTimer = createSleepTimerState();
	const rows = buildImmersiveSettingsRows(config);

	t.is(rows.length, 23);
	t.true(rows[0]?.label.includes('Stream Quality'));
	t.true(rows[18]?.label.includes('Sleep Timer'));
	t.true(rows[22]?.label.includes('Manage Plugins'));

	const message = cycleImmersiveSetting(config, 6, {
		sleepTimer,
		onSleepTimerExpire: () => {},
	});
	t.true(message?.includes('Subtitles'));
});

test('tray helpers parse actions and resolve icon path', async t => {
	const {parseTrayActionLine, resolveTrayIconPath, truncateTrayTooltip} =
		await import('../source/immersive/native/tray.ts');

	t.is(parseTrayActionLine('ACTION:settings'), 'settings');
	t.is(parseTrayActionLine('ACTION:exit'), 'exit');
	t.is(parseTrayActionLine('TOOLTIP:foo'), null);

	const iconPath = resolveTrayIconPath();
	t.true(iconPath === null || /\.(ico|png|jpe?g)$/i.test(iconPath));

	const long = 'A'.repeat(80);
	t.is(truncateTrayTooltip(long).length, 63);
});

test('player shortcut line includes volume keys', async t => {
	const {buildPlayerShortcutLine} =
		await import('../source/immersive/ui/layout.ts');

	const line = buildPlayerShortcutLine(120);
	t.true(line.includes('[+/-]'));
});

test('HybridAudioSource reacts to playback state', async t => {
	const {HybridAudioSource} =
		await import('../source/immersive/visualizer/hybrid-audio.ts');

	const source = new HybridAudioSource(64);

	for (let i = 0; i < 20; i++) {
		source.update(
			{currentTime: i, duration: 180, isPlaying: true, volume: 80},
			16,
		);
	}
	const playing = source.generateSamples();

	for (let i = 0; i < 20; i++) {
		source.update(
			{currentTime: i, duration: 180, isPlaying: false, volume: 80},
			16,
		);
	}
	const paused = source.generateSamples();

	const playingEnergy = playing.reduce((sum, value) => sum + value, 0);
	const pausedEnergy = paused.reduce((sum, value) => sum + value, 0);
	t.true(playingEnergy >= pausedEnergy);
});

test('layout helpers compute regions and progress bars', async t => {
	const {
		buildModeStatusLine,
		buildPlayerShortcutLine,
		buildProgressBar,
		buildVolumeBar,
		computeLayout,
	} = await import('../source/immersive/ui/layout.ts');

	const layout = computeLayout(100, 30);
	t.true(layout.vizH >= 6);
	t.true(layout.vizW > 0);
	t.true(layout.nowPlayingW > 0);
	t.true(layout.nowPlayingH >= 8);
	t.true(layout.footerStartY > 0);

	const {bar} = buildProgressBar(0.5, 10);
	t.is(bar.length, 10);
	t.true(bar.includes('█'));
	t.true(bar.includes('░'));

	const vol = buildVolumeBar(50, 8);
	t.is(vol.length, 8);

	const modeLine = buildModeStatusLine({
		shuffle: true,
		repeat: 'all',
		isDiscoMode: false,
		autoplay: true,
	});
	t.true(modeLine.includes('Shuffle ON'));
	t.true(modeLine.includes('Repeat ALL'));
	t.true(modeLine.includes('Autoplay ON'));

	const shortcuts = buildPlayerShortcutLine(160);
	t.true(shortcuts.includes('[Shift+S] Shuffle'));
	t.true(shortcuts.includes('[Shift+A] Autoplay'));
	t.true(shortcuts.includes('[,] Settings'));
});

test('search overlay supports type, limit, filters, and download', async t => {
	const {
		beginFilterEdit,
		buildSearchHeaderLine,
		createSearchOverlayState,
		decreaseSearchLimit,
		handleFilterEditInput,
		handleSearchQueryMetaKey,
		handleSearchResultsInput,
		openSearchOverlay,
		setSearchResults,
	} = await import('../source/immersive/ui/search-overlay.ts');

	const overlay = createSearchOverlayState();
	openSearchOverlay(overlay);
	t.is(overlay.searchLimit, 25);

	t.true(handleSearchQueryMetaKey(overlay, 'tab'));
	t.is(overlay.searchType, 'songs');

	t.true(handleSearchQueryMetaKey(overlay, '+'));
	t.is(overlay.searchLimit, 30);
	decreaseSearchLimit(overlay);
	t.is(overlay.searchLimit, 25);

	beginFilterEdit(overlay, 'artist');
	handleFilterEditInput(overlay, 'm');
	handleFilterEditInput(overlay, 'i');
	handleFilterEditInput(overlay, 'c');
	handleFilterEditInput(overlay, 'h');
	handleFilterEditInput(overlay, 'a');
	handleFilterEditInput(overlay, 'e');
	handleFilterEditInput(overlay, 'l');
	handleFilterEditInput(overlay, 'enter');
	t.is(overlay.filters.artist, 'michael');

	setSearchResults(overlay, [
		{
			type: 'song',
			data: {
				videoId: 'a',
				title: 'Beat It',
				artists: [{name: 'Michael Jackson'}],
			},
		},
		{
			type: 'song',
			data: {
				videoId: 'b',
				title: 'Other',
				artists: [{name: 'Someone Else'}],
			},
		},
	]);
	t.is(overlay.results.length, 1);
	t.true(buildSearchHeaderLine(overlay).includes('SONGS'));

	t.is(handleSearchResultsInput(overlay, 'Shift+D'), 'download');
});

test('search overlay handles query and results phases', async t => {
	const {
		closeSearchOverlay,
		createSearchOverlayState,
		handleSearchQueryInput,
		handleSearchResultsInput,
		openSearchOverlay,
		setSearchResults,
	} = await import('../source/immersive/ui/search-overlay.ts');

	const overlay = createSearchOverlayState();
	openSearchOverlay(overlay);
	t.true(overlay.active);
	t.is(overlay.phase, 'query');

	t.is(handleSearchQueryInput(overlay, 't'), 'none');
	t.is(handleSearchQueryInput(overlay, 'e'), 'none');
	t.is(handleSearchQueryInput(overlay, 's'), 'none');
	t.is(handleSearchQueryInput(overlay, 't'), 'none');
	t.is(overlay.query, 'test');
	t.is(handleSearchQueryInput(overlay, 'enter'), 'submit');

	setSearchResults(overlay, [
		{type: 'song', data: {videoId: 'a', title: 'Alpha', artists: []}},
		{type: 'album', data: {albumId: 'b', name: 'Beta', artists: []}},
	]);
	t.is(overlay.phase, 'results');
	t.is(overlay.selectedIndex, 0);

	t.is(handleSearchResultsInput(overlay, 'down'), 'none');
	t.is(overlay.selectedIndex, 1);
	t.is(handleSearchResultsInput(overlay, 'enter'), 'play');
	t.is(handleSearchResultsInput(overlay, 'm'), 'mix');
	t.is(handleSearchResultsInput(overlay, 'f'), 'favorite');

	t.is(handleSearchResultsInput(overlay, 'escape'), 'back');
	t.is(overlay.phase, 'query');

	closeSearchOverlay(overlay);
	t.false(overlay.active);
	t.is(handleSearchQueryInput(overlay, 'escape'), 'cancel');
});

test('library overlay navigates menu, playlists, and favorites', async t => {
	const {
		closeLibraryOverlay,
		createLibraryOverlayState,
		formatFavoriteLine,
		handleLibraryFavoritesInput,
		handleLibraryMenuInput,
		handleLibraryPlaylistInput,
		openFavoritesPicker,
		openLibraryMenu,
		openPlaylistPicker,
	} = await import('../source/immersive/ui/library-overlay.ts');

	const overlay = createLibraryOverlayState();
	openLibraryMenu(overlay);
	t.true(overlay.active);
	t.is(overlay.view, 'menu');

	t.is(handleLibraryMenuInput(overlay, 'down'), 'none');
	t.is(overlay.selectedIndex, 1);

	openFavoritesPicker(overlay);
	t.is(overlay.view, 'favorites');
	t.is(handleLibraryFavoritesInput(overlay, 'down', 2), 'none');
	t.is(overlay.selectedIndex, 1);
	t.is(handleLibraryFavoritesInput(overlay, 'enter', 2), 'play_favorite');
	t.is(handleLibraryFavoritesInput(overlay, 'escape', 2), 'back_to_menu');
	t.is(overlay.view, 'menu');

	openPlaylistPicker(overlay);
	t.is(overlay.view, 'playlists');
	t.is(handleLibraryPlaylistInput(overlay, 'down', 3), 'none');
	t.is(overlay.selectedIndex, 1);
	t.is(handleLibraryPlaylistInput(overlay, 'escape', 3), 'back_to_menu');
	t.is(overlay.view, 'menu');

	const line = formatFavoriteLine(
		{videoId: 'a', title: 'Favorite Song', artists: [{name: 'Artist'}]},
		40,
	);
	t.true(line.includes('Favorite Song'));

	closeLibraryOverlay(overlay);
	t.false(overlay.active);
});

test('playback-actions dedupe tracks and favorites manager toggles', async t => {
	const {mkdtempSync, rmSync} = await import('node:fs');
	const {tmpdir} = await import('node:os');
	const {join} = await import('node:path');
	const {dedupeTracks} =
		await import('../source/immersive/actions/playback-actions.ts');
	const {
		FavoritesManager,
		resetFavoritesManagerForTests,
		setFavoritesFilePathForTests,
	} = await import('../source/services/favorites/favorites.service.ts');

	const deduped = dedupeTracks([
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'a', title: 'A duplicate', artists: []},
		{videoId: 'b', title: 'B', artists: []},
	]);
	t.is(deduped.length, 2);

	const tempDir = mkdtempSync(join(tmpdir(), 'ymc-favorites-test-'));
	const favoritesFile = join(tempDir, 'favorites.json');
	setFavoritesFilePathForTests(favoritesFile);
	t.teardown(() => {
		resetFavoritesManagerForTests();
		setFavoritesFilePathForTests(null);
		rmSync(tempDir, {force: true, recursive: true});
	});

	resetFavoritesManagerForTests();
	const manager = new FavoritesManager();
	manager['tracks'] = [];
	manager['loaded'] = true;

	const track = {videoId: 'x', title: 'Song', artists: []};
	t.false(manager.isFavorite('x'));
	const added = await manager.toggle(track);
	t.true(added);
	t.true(manager.isFavorite('x'));
	t.deepEqual(
		manager.getRecentTracks(8).map(entry => entry.videoId),
		['x'],
	);
	const removed = await manager.toggle(track);
	t.false(removed);
	t.false(manager.isFavorite('x'));
});

test('getSearchResultLabel and prefix format results', async t => {
	const {formatSearchResultLine, getSearchResultLabel, getSearchResultPrefix} =
		await import('../source/immersive/actions/playback-actions.ts');

	t.is(getSearchResultPrefix('song'), '♪');
	t.is(getSearchResultPrefix('album'), '◎');
	t.is(
		getSearchResultLabel({
			type: 'song',
			data: {videoId: '1', title: 'Hello', artists: []},
		}),
		'Hello',
	);

	const line = formatSearchResultLine(
		{
			type: 'song',
			data: {
				videoId: '1',
				title: 'Hello',
				artists: [{name: 'Artist'}],
				duration: 125,
			},
		},
		60,
	);
	t.true(line.includes('Hello'));
	t.true(line.includes('Artist'));
});

test('advanceQueue with autoplay on plays explicit queue once', async t => {
	const {advanceQueue, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({repeat: 'all', autoplay: true});
	setQueue(state, [
		{videoId: 'a', title: 'A', artists: []},
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);
	t.is(state.explicitQueueLength, 3);

	t.is(advanceQueue(state)?.videoId, 'b');
	t.is(advanceQueue(state)?.videoId, 'c');
	t.is(advanceQueue(state), null);
});

test('appendTracksForAutoplay appends without reshuffling playback order', async t => {
	const {appendTracksForAutoplay, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({shuffle: true});
	setQueue(
		state,
		[
			{videoId: 'a', title: 'A', artists: []},
			{videoId: 'b', title: 'B', artists: []},
		],
		0,
	);
	const orderBefore = [...(state.playbackOrder ?? [])];

	const added = appendTracksForAutoplay(state, [
		{videoId: 'c', title: 'C', artists: []},
		{videoId: 'a', title: 'A duplicate', artists: []},
		{videoId: 'd', title: 'D', artists: []},
	]);

	t.is(added, 2);
	t.is(state.queue.length, 4);
	t.deepEqual(state.playbackOrder?.slice(0, orderBefore.length), orderBefore);
	t.deepEqual(state.playbackOrder?.slice(orderBefore.length), [2, 3]);
});

test('appendTracksForAutoplay builds shuffle order from single-track queue', async t => {
	const {appendTracksForAutoplay, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({shuffle: true});
	setQueue(state, [{videoId: 'a', title: 'A', artists: []}], 0);
	t.is(state.playbackOrder, null);

	const added = appendTracksForAutoplay(state, [
		{videoId: 'b', title: 'B', artists: []},
		{videoId: 'c', title: 'C', artists: []},
	]);

	t.is(added, 2);
	t.is(state.playbackOrder?.length, 3);
	t.is(state.playbackOrder?.[0], 0);
});

test('advanceQueue with shuffle on single track returns null', async t => {
	const {advanceQueue, createInitialImmersiveState, setQueue} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState({shuffle: true});
	setQueue(state, [{videoId: 'a', title: 'A', artists: []}], 0);
	t.is(advanceQueue(state), null);
});

test('toggleAutoplay flips immersive autoplay flag', async t => {
	const {createInitialImmersiveState, toggleAutoplay} =
		await import('../source/immersive/state/queue-state.ts');

	const state = createInitialImmersiveState();
	t.true(state.autoplay);
	t.false(toggleAutoplay(state));
	t.false(state.autoplay);
	t.true(toggleAutoplay(state));
});
