import {afterEach, expect, test} from 'bun:test';

const __fileTeardowns = [];
afterEach(() => {
	while (__fileTeardowns.length) {
		const fn = __fileTeardowns.pop();
		fn();
	}
});

test(
	'parseKeyName maps arrow keys and control keys',
	async () => {
		const {parseKeyName} =
			await import('../source/immersive/input/key-parser.ts');

		expect(parseKeyName('\x1B[A')).toBe('up');
		expect(parseKeyName('\x1B[B')).toBe('down');
		expect(parseKeyName('\x1B[C')).toBe('right');
		expect(parseKeyName('\x1B[D')).toBe('left');
		expect(parseKeyName(' ')).toBe(' ');
		expect(parseKeyName('\x03')).toBe('Ctrl+C');
		expect(parseKeyName('/')).toBe('/');
		expect(parseKeyName('\r')).toBe('enter');
		expect(parseKeyName('S')).toBe('Shift+S');
		expect(parseKeyName('D')).toBe('Shift+D');
		expect(parseKeyName('s')).toBe('s');
		expect(parseKeyName(',')).toBe(',');
		expect(parseKeyName('\t')).toBe('tab');
		expect(parseKeyName('\x01')).toBe('Ctrl+A');
		expect(parseKeyName('\x0c')).toBe('Ctrl+L');
		expect(parseKeyName('+')).toBe('+');
		expect(parseKeyName('=')).toBe('+');
		expect(parseKeyName('-')).toBe('-');
		expect(parseKeyName('\x1b[44;5u')).toBe('Ctrl+,');
		expect(parseKeyName('\x1b[44;5;1u')).toBe('Ctrl+,');
		expect(parseKeyName('\x1c')).toBe(null);
	},
	{timeout: 60000},
);

test(
	'StdinKeyBuffer assembles chunked Ctrl+, sequences',
	async () => {
		const {StdinKeyBuffer} =
			await import('../source/immersive/input/stdin-buffer.ts');

		const keys = [];
		const buffer = new StdinKeyBuffer(key => {
			keys.push(key);
		});

		buffer.push('\x1b');
		expect(keys.length).toBe(0);

		buffer.push('[44;5;1u');
		expect(keys).toEqual(['Ctrl+,']);

		buffer.dispose();
	},
	{timeout: 60000},
);

test(
	'AudioCollector processes frequency bands',
	async () => {
		const {AudioCollector} =
			await import('../source/immersive/visualizer/audio-collector.ts');

		const collector = new AudioCollector(256);
		const samples = new Float32Array(256);
		for (let i = 0; i < samples.length; i++) {
			samples[i] = Math.sin(i / 10);
		}

		const processed = collector.processAudioData(samples);
		const bands = collector.getFrequencyBands(processed);

		expect(processed.length > 0).toBe(true);
		expect(bands.bass >= 0).toBe(true);
		expect(bands.treble >= 0).toBe(true);
	},
	{timeout: 60000},
);

test(
	'FrameBuffer setText and clear work',
	async () => {
		const {FrameBuffer} =
			await import('../source/immersive/renderer/frame-buffer.ts');

		const fb = new FrameBuffer(20, 5);
		fb.setText(2, 1, 'Hello', null, null, {bold: true});
		expect(fb.getCell(2, 1)?.char).toBe('H');
		expect(fb.getCell(2, 1)?.bold).toBe(true);

		fb.clear();
		expect(fb.getCell(2, 1)?.char).toBe(' ');
	},
	{timeout: 60000},
);

test(
	'BrailleCanvas accumulates dots in the same cell',
	async () => {
		const {FrameBuffer} =
			await import('../source/immersive/renderer/frame-buffer.ts');
		const {BrailleCanvas} =
			await import('../source/immersive/renderer/braille-canvas.ts');

		const fb = new FrameBuffer(10, 10);
		const canvas = new BrailleCanvas(fb);

		canvas.setPixel(0, 0, [255, 0, 0]);
		canvas.setPixel(1, 0, [0, 255, 0]);

		const cell = fb.getCell(0, 0);
		expect(cell?.char).not.toBe(' ');
		expect(cell?.char).not.toBe(String.fromCharCode(0x2800));
	},
	{timeout: 60000},
);

test(
	'queue-state advances and rewinds queue',
	async () => {
		const {advanceQueue, createInitialImmersiveState, previousQueue, setQueue} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState();
		setQueue(state, [
			{videoId: 'a', title: 'A', artists: []},
			{videoId: 'b', title: 'B', artists: []},
			{videoId: 'c', title: 'C', artists: []},
		]);

		expect(state.currentTrack?.videoId).toBe('a');
		expect(advanceQueue(state)?.videoId).toBe('b');
		expect(advanceQueue(state)?.videoId).toBe('c');
		expect(advanceQueue(state)).toBe(null);

		state.currentTime = 1;
		state.queueIndex = 2;
		state.currentTrack = state.queue[2] ?? null;
		expect(previousQueue(state)?.videoId).toBe('b');
	},
	{timeout: 60000},
);

test(
	'queue-state supports shuffle and repeat-all',
	async () => {
		const {advanceQueue, createInitialImmersiveState, setQueue} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState({shuffle: true});
		setQueue(state, [
			{videoId: 'a', title: 'A', artists: []},
			{videoId: 'b', title: 'B', artists: []},
			{videoId: 'c', title: 'C', artists: []},
		]);

		const first = advanceQueue(state)?.videoId;
		expect(first).not.toBe('a');
		expect(['b', 'c'].includes(first ?? '')).toBe(true);

		state.shuffle = false;
		state.repeat = 'all';
		state.autoplay = false;
		state.queueIndex = 2;
		state.currentTrack = state.queue[2] ?? null;
		expect(advanceQueue(state)?.videoId).toBe('a');
	},
	{timeout: 60000},
);

test(
	'queue-state shuffle with repeat-all at end picks a different track',
	async () => {
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
		expect(next).toBeTruthy();
		expect(next?.videoId).not.toBe('c');
		expect(['a', 'b'].includes(next?.videoId ?? '')).toBe(true);
	},
	{timeout: 60000},
);

test(
	'getUpcomingTracks wraps with repeat-all at last shuffle index',
	async () => {
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
		expect(upcoming.length >= 2).toBe(true);
		expect(upcoming[0]?.videoId).not.toBe('c');
	},
	{timeout: 60000},
);

test(
	'getUpcomingTracks wraps sequentially with repeat-all at queue end',
	async () => {
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
		expect(upcoming.map(track => track.videoId)).toEqual(['a', 'b']);
	},
	{timeout: 60000},
);

test(
	'advanceQueue with playbackOrder does not repeat current track',
	async () => {
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
		expect(second?.videoId).not.toBe(firstId);
	},
	{timeout: 60000},
);

test(
	'resolveRandomFavoriteStartIndex stays within queue bounds',
	async () => {
		const {resolveRandomFavoriteStartIndex} =
			await import('../source/immersive/state/queue-state.ts');

		for (let i = 0; i < 20; i++) {
			const index = resolveRandomFavoriteStartIndex(15);
			expect(index >= 0).toBe(true);
			expect(index < 15).toBe(true);
		}
		expect(resolveRandomFavoriteStartIndex(0)).toBe(0);
	},
	{timeout: 60000},
);

test(
	'toggleShuffle rebuilds and clears playback order',
	async () => {
		const {createInitialImmersiveState, setQueue, toggleShuffle} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState();
		setQueue(state, [
			{videoId: 'a', title: 'A', artists: []},
			{videoId: 'b', title: 'B', artists: []},
		]);
		expect(state.playbackOrder).toBe(null);

		expect(toggleShuffle(state)).toBe(true);
		expect(state.playbackOrder).toBeTruthy();
		expect(state.playbackOrder?.length).toBe(2);

		expect(toggleShuffle(state)).toBe(false);
		expect(state.playbackOrder).toBe(null);
	},
	{timeout: 60000},
);

test(
	'playback-sync re-exports mpv-event-policy helpers',
	async () => {
		const {ADVANCE_DEBOUNCE_MS, shouldDebounceAdvance, shouldSyncPauseFromMpv} =
			await import('../source/immersive/state/playback-sync.ts');

		const now = 10_000;
		expect(
			shouldSyncPauseFromMpv({
				paused: true,
				isAdvancing: true,
				eofTimestamp: 0,
				now,
			}),
		).toBe(false);
		expect(
			shouldSyncPauseFromMpv({
				paused: true,
				eofTimestamp: 0,
				now,
			}),
		).toBe(true);

		expect(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS - 1)).toBe(true);
		expect(shouldDebounceAdvance(0, ADVANCE_DEBOUNCE_MS)).toBe(false);
	},
	{timeout: 60000},
);

test(
	'queue-state cycles repeat modes',
	async () => {
		const {createInitialImmersiveState, cycleRepeat} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState();
		expect(cycleRepeat(state)).toBe('all');
		expect(cycleRepeat(state)).toBe('one');
		expect(cycleRepeat(state)).toBe('off');
	},
	{timeout: 60000},
);

test(
	'settings overlay navigates and cycles rows',
	async () => {
		const {
			closeSettingsOverlay,
			createSettingsOverlayState,
			handleSettingsInput,
			openSettingsOverlay,
			SETTINGS_ROW_COUNT,
		} = await import('../source/immersive/ui/settings-overlay.ts');

		const overlay = createSettingsOverlayState();
		openSettingsOverlay(overlay);
		expect(overlay.active).toBe(true);
		expect(SETTINGS_ROW_COUNT).toBe(30);

		expect(handleSettingsInput(overlay, 'down', SETTINGS_ROW_COUNT)).toBe(
			'none',
		);
		expect(overlay.selectedIndex).toBe(1);
		expect(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT)).toBe(
			'cycle',
		);
		overlay.selectedIndex = 12;
		expect(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT)).toBe(
			'begin_text',
		);
		overlay.selectedIndex = 24;
		expect(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT)).toBe(
			'navigate',
		);
		overlay.selectedIndex = 1;
		expect(handleSettingsInput(overlay, 'enter', SETTINGS_ROW_COUNT)).toBe(
			'cycle',
		);
		expect(handleSettingsInput(overlay, 'escape', SETTINGS_ROW_COUNT)).toBe(
			'close',
		);
		expect(overlay.active).toBe(false);

		closeSettingsOverlay(overlay);
	},
	{timeout: 60000},
);

test(
	'immersive settings items match TUI row count and cycle values',
	async () => {
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

		expect(rows.length).toBe(30);
		expect(rows[1]?.label.includes('Theme')).toBe(true);
		expect(rows[2]?.label.includes('Stream Quality')).toBe(true);
		expect(rows[20]?.label.includes('Prefer Local')).toBe(true);
		expect(rows[23]?.label.includes('Sleep Timer')).toBe(true);
		expect(rows[27]?.label.includes('Manage Plugins')).toBe(true);
		expect(rows[28]?.label.includes('Cache TTL')).toBe(true);
		expect(rows[29]?.label.includes('Cache Entries')).toBe(true);

		const themeMessage = await cycleImmersiveSetting(config, 1, {
			sleepTimer,
			onSleepTimerExpire: () => {},
		});
		expect(themeMessage?.includes('Theme:')).toBe(true);

		const message = await cycleImmersiveSetting(config, 8, {
			sleepTimer,
			onSleepTimerExpire: () => {},
		});
		expect(message?.includes('Subtitles')).toBe(true);

		const cacheTtlMessage = await cycleImmersiveSetting(config, 28, {
			sleepTimer,
			onSleepTimerExpire: () => {},
		});
		expect(cacheTtlMessage?.includes('Cache TTL')).toBe(true);
		expect([1, 5, 10, 15, 30]).toContain(config.get('cacheTtlMinutes'));

		const cacheEntriesMessage = await cycleImmersiveSetting(config, 29, {
			sleepTimer,
			onSleepTimerExpire: () => {},
		});
		expect(cacheEntriesMessage?.includes('Cache entries')).toBe(true);
		expect([50, 100, 200, 500]).toContain(config.get('cacheMaxEntries'));
	},
	{timeout: 60000},
);

test(
	'tray helpers parse actions and resolve icon path',
	async () => {
		const {parseTrayActionLine, resolveTrayIconPath, truncateTrayTooltip} =
			await import('../source/immersive/native/tray.ts');

		expect(parseTrayActionLine('ACTION:settings')).toBe('settings');
		expect(parseTrayActionLine('ACTION:exit')).toBe('exit');
		expect(parseTrayActionLine('TOOLTIP:foo')).toBe(null);

		const iconPath = resolveTrayIconPath();
		expect(iconPath === null || /\.(ico|png|jpe?g)$/i.test(iconPath)).toBe(
			true,
		);

		const long = 'A'.repeat(80);
		expect(truncateTrayTooltip(long).length).toBe(63);
	},
	{timeout: 60000},
);

test(
	'player shortcut line includes volume keys',
	async () => {
		const {buildPlayerShortcutLine} =
			await import('../source/immersive/ui/layout.ts');

		const line = buildPlayerShortcutLine(120);
		expect(line.includes('[+/-]')).toBe(true);
	},
	{timeout: 60000},
);

test(
	'HybridAudioSource reacts to playback state',
	async () => {
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
		expect(playingEnergy >= pausedEnergy).toBe(true);
	},
	{timeout: 60000},
);

test(
	'layout helpers compute regions and progress bars',
	async () => {
		const {
			buildModeStatusLine,
			buildPlayerShortcutLine,
			buildProgressBar,
			buildVolumeBar,
			computeLayout,
		} = await import('../source/immersive/ui/layout.ts');

		const layout = computeLayout(100, 30);
		expect(layout.vizH >= 6).toBe(true);
		expect(layout.vizW > 0).toBe(true);
		expect(layout.nowPlayingW > 0).toBe(true);
		expect(layout.nowPlayingH >= 8).toBe(true);
		expect(layout.footerStartY > 0).toBe(true);

		const {bar} = buildProgressBar(0.5, 10);
		expect(bar.length).toBe(10);
		expect(bar.includes('█')).toBe(true);
		expect(bar.includes('░')).toBe(true);

		const vol = buildVolumeBar(50, 8);
		expect(vol.length).toBe(8);

		const modeLine = buildModeStatusLine({
			shuffle: true,
			repeat: 'all',
			isDiscoMode: false,
			autoplay: true,
		});
		expect(modeLine.includes('Shuffle ON')).toBe(true);
		expect(modeLine.includes('Repeat ALL')).toBe(true);
		expect(modeLine.includes('Autoplay ON')).toBe(true);

		const shortcuts = buildPlayerShortcutLine(160);
		expect(shortcuts.includes('[Shift+S] Shuffle')).toBe(true);
		expect(shortcuts.includes('[Shift+A] Autoplay')).toBe(true);
		expect(shortcuts.includes('[,] Settings')).toBe(true);
	},
	{timeout: 60000},
);

test(
	'search overlay supports type, limit, filters, and download',
	async () => {
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
		expect(overlay.searchLimit).toBe(25);

		expect(handleSearchQueryMetaKey(overlay, 'tab')).toBe(true);
		expect(overlay.searchType).toBe('songs');

		expect(handleSearchQueryMetaKey(overlay, '+')).toBe(true);
		expect(overlay.searchLimit).toBe(30);
		decreaseSearchLimit(overlay);
		expect(overlay.searchLimit).toBe(25);

		beginFilterEdit(overlay, 'artist');
		handleFilterEditInput(overlay, 'm');
		handleFilterEditInput(overlay, 'i');
		handleFilterEditInput(overlay, 'c');
		handleFilterEditInput(overlay, 'h');
		handleFilterEditInput(overlay, 'a');
		handleFilterEditInput(overlay, 'e');
		handleFilterEditInput(overlay, 'l');
		handleFilterEditInput(overlay, 'enter');
		expect(overlay.filters.artist).toBe('michael');

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
		expect(overlay.results.length).toBe(1);
		expect(buildSearchHeaderLine(overlay).includes('SONGS')).toBe(true);

		expect(handleSearchResultsInput(overlay, 'Shift+D')).toBe('download');
	},
	{timeout: 60000},
);

test(
	'search overlay handles query and results phases',
	async () => {
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
		expect(overlay.active).toBe(true);
		expect(overlay.phase).toBe('query');

		expect(handleSearchQueryInput(overlay, 't')).toBe('none');
		expect(handleSearchQueryInput(overlay, 'e')).toBe('none');
		expect(handleSearchQueryInput(overlay, 's')).toBe('none');
		expect(handleSearchQueryInput(overlay, 't')).toBe('none');
		expect(overlay.query).toBe('test');
		expect(handleSearchQueryInput(overlay, 'enter')).toBe('submit');

		setSearchResults(overlay, [
			{type: 'song', data: {videoId: 'a', title: 'Alpha', artists: []}},
			{type: 'album', data: {albumId: 'b', name: 'Beta', artists: []}},
		]);
		expect(overlay.phase).toBe('results');
		expect(overlay.selectedIndex).toBe(0);

		expect(handleSearchResultsInput(overlay, 'down')).toBe('none');
		expect(overlay.selectedIndex).toBe(1);
		expect(handleSearchResultsInput(overlay, 'enter')).toBe('play');
		expect(handleSearchResultsInput(overlay, 'm')).toBe('mix');
		expect(handleSearchResultsInput(overlay, 'f')).toBe('favorite');
		expect(handleSearchResultsInput(overlay, 'a')).toBe('add_to_playlist');

		expect(handleSearchResultsInput(overlay, 'escape')).toBe('back');
		expect(overlay.phase).toBe('query');

		closeSearchOverlay(overlay);
		expect(overlay.active).toBe(false);
		expect(handleSearchQueryInput(overlay, 'escape')).toBe('cancel');
	},
	{timeout: 60000},
);

test(
	'library overlay navigates menu, playlists, and favorites',
	async () => {
		const {
			closeLibraryOverlay,
			createLibraryOverlayState,
			formatFavoriteLine,
			handleLibraryAddToPlaylistInput,
			handleLibraryFavoritesInput,
			handleLibraryMenuInput,
			handleLibraryPlaylistEditInput,
			handleLibraryPlaylistInput,
			openAddToPlaylistPicker,
			openFavoritesPicker,
			openLibraryMenu,
			openPlaylistEdit,
			openPlaylistPicker,
		} = await import('../source/immersive/ui/library-overlay.ts');

		const overlay = createLibraryOverlayState();
		openLibraryMenu(overlay);
		expect(overlay.active).toBe(true);
		expect(overlay.view).toBe('menu');

		expect(handleLibraryMenuInput(overlay, 'down')).toBe('none');
		expect(overlay.selectedIndex).toBe(1);

		openFavoritesPicker(overlay);
		expect(overlay.view).toBe('favorites');
		expect(handleLibraryFavoritesInput(overlay, 'down', 2)).toBe('none');
		expect(overlay.selectedIndex).toBe(1);
		expect(handleLibraryFavoritesInput(overlay, 'enter', 2)).toBe(
			'play_favorite',
		);
		expect(handleLibraryFavoritesInput(overlay, 'f', 2)).toBe(
			'remove_favorite',
		);
		expect(handleLibraryFavoritesInput(overlay, 'a', 2)).toBe(
			'pick_add_to_playlist',
		);
		expect(handleLibraryFavoritesInput(overlay, 'escape', 2)).toBe(
			'back_to_menu',
		);
		expect(overlay.view).toBe('menu');

		openPlaylistPicker(overlay);
		expect(overlay.view).toBe('playlists');
		expect(handleLibraryPlaylistInput(overlay, 'down', 3)).toBe('none');
		expect(overlay.selectedIndex).toBe(1);
		expect(handleLibraryPlaylistInput(overlay, 'e', 3)).toBe('edit_playlist');
		expect(handleLibraryPlaylistInput(overlay, 'escape', 3)).toBe(
			'back_to_menu',
		);
		expect(overlay.view).toBe('menu');

		openPlaylistEdit(overlay, 'playlist-1');
		expect(overlay.view).toBe('playlist_edit');
		expect(handleLibraryPlaylistEditInput(overlay, 'd', 2)).toBe(
			'remove_playlist_track',
		);
		expect(handleLibraryPlaylistEditInput(overlay, 'a', 2)).toBe(
			'add_current_to_playlist',
		);

		openAddToPlaylistPicker(
			overlay,
			{videoId: 'x', title: 'Track', artists: []},
			{returnToSearch: true},
		);
		expect(overlay.view).toBe('add_to_playlist');
		expect(handleLibraryAddToPlaylistInput(overlay, 'enter', 2)).toBe(
			'confirm_add_to_playlist',
		);
		expect(handleLibraryAddToPlaylistInput(overlay, 'escape', 2)).toBe(
			'cancel_add_to_playlist',
		);

		const line = formatFavoriteLine(
			{videoId: 'a', title: 'Favorite Song', artists: [{name: 'Artist'}]},
			40,
		);
		expect(line.includes('Favorite Song')).toBe(true);

		closeLibraryOverlay(overlay);
		expect(overlay.active).toBe(false);
	},
	{timeout: 60000},
);

test(
	'playback-actions playlist mutations add and remove tracks',
	async () => {
		const {getConfigService} =
			await import('../source/services/config/config.service.ts');
		const {
			addTrackToSavedPlaylist,
			loadPlaylists,
			removeTrackFromSavedPlaylist,
			trackFromSearchResult,
		} = await import('../source/immersive/actions/playback-actions.ts');

		const config = getConfigService();
		const previousPlaylists = config.get('playlists');
		config.set('playlists', [
			{
				playlistId: 'p1',
				name: 'Test',
				tracks: [{videoId: 'a', title: 'A', artists: []}],
			},
		]);

		expect(
			addTrackToSavedPlaylist('p1', {
				videoId: 'b',
				title: 'B',
				artists: [],
			}),
		).toBe('added');
		expect(loadPlaylists()[0].tracks.length).toBe(2);
		expect(
			addTrackToSavedPlaylist('p1', {
				videoId: 'b',
				title: 'B',
				artists: [],
			}),
		).toBe('duplicate');
		expect(removeTrackFromSavedPlaylist('p1', 0)).toBe(true);
		expect(loadPlaylists()[0].tracks[0].videoId).toBe('b');

		const track = trackFromSearchResult({
			type: 'song',
			data: {videoId: 'c', title: 'C', artists: []},
		});
		expect(track?.videoId).toBe('c');
		expect(
			trackFromSearchResult({
				type: 'album',
				data: {albumId: 'x', name: 'Album', artists: []},
			}),
		).toBe(null);

		config.set('playlists', previousPlaylists);
	},
	{timeout: 60000},
);

test(
	'playback-actions dedupe tracks and favorites manager toggles',
	async () => {
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
		expect(deduped.length).toBe(2);

		const tempDir = mkdtempSync(join(tmpdir(), 'ymc-favorites-test-'));
		const favoritesFile = join(tempDir, 'favorites.json');
		setFavoritesFilePathForTests(favoritesFile);
		__fileTeardowns.push(() => {
			resetFavoritesManagerForTests();
			setFavoritesFilePathForTests(null);
			rmSync(tempDir, {force: true, recursive: true});
		});

		resetFavoritesManagerForTests();
		const manager = new FavoritesManager();
		manager['tracks'] = [];
		manager['loaded'] = true;

		const track = {videoId: 'x', title: 'Song', artists: []};
		expect(manager.isFavorite('x')).toBe(false);
		const added = await manager.toggle(track);
		expect(added).toBe(true);
		expect(manager.isFavorite('x')).toBe(true);
		expect(manager.getRecentTracks(8).map(entry => entry.videoId)).toEqual([
			'x',
		]);
		const removed = await manager.toggle(track);
		expect(removed).toBe(false);
		expect(manager.isFavorite('x')).toBe(false);
	},
	{timeout: 60000},
);

test(
	'getSearchResultLabel and prefix format results',
	async () => {
		const {
			formatSearchResultLine,
			getSearchResultLabel,
			getSearchResultPrefix,
		} = await import('../source/immersive/actions/playback-actions.ts');

		expect(getSearchResultPrefix('song')).toBe('♪');
		expect(getSearchResultPrefix('album')).toBe('◎');
		expect(
			getSearchResultLabel({
				type: 'song',
				data: {videoId: '1', title: 'Hello', artists: []},
			}),
		).toBe('Hello');

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
		expect(line.includes('Hello')).toBe(true);
		expect(line.includes('Artist')).toBe(true);
	},
	{timeout: 60000},
);

test(
	'advanceQueue with autoplay on plays explicit queue once',
	async () => {
		const {advanceQueue, createInitialImmersiveState, setQueue} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState({repeat: 'all', autoplay: true});
		setQueue(state, [
			{videoId: 'a', title: 'A', artists: []},
			{videoId: 'b', title: 'B', artists: []},
			{videoId: 'c', title: 'C', artists: []},
		]);
		expect(state.explicitQueueLength).toBe(3);

		expect(advanceQueue(state)?.videoId).toBe('b');
		expect(advanceQueue(state)?.videoId).toBe('c');
		expect(advanceQueue(state)).toBe(null);
	},
	{timeout: 60000},
);

test(
	'appendTracksForAutoplay appends without reshuffling playback order',
	async () => {
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

		expect(added).toBe(2);
		expect(state.queue.length).toBe(4);
		expect(state.playbackOrder?.slice(0, orderBefore.length)).toEqual(
			orderBefore,
		);
		expect(state.playbackOrder?.slice(orderBefore.length)).toEqual([2, 3]);
	},
	{timeout: 60000},
);

test(
	'appendTracksForAutoplay builds shuffle order from single-track queue',
	async () => {
		const {appendTracksForAutoplay, createInitialImmersiveState, setQueue} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState({shuffle: true});
		setQueue(state, [{videoId: 'a', title: 'A', artists: []}], 0);
		expect(state.playbackOrder).toBe(null);

		const added = appendTracksForAutoplay(state, [
			{videoId: 'b', title: 'B', artists: []},
			{videoId: 'c', title: 'C', artists: []},
		]);

		expect(added).toBe(2);
		expect(state.playbackOrder?.length).toBe(3);
		expect(state.playbackOrder?.[0]).toBe(0);
	},
	{timeout: 60000},
);

test(
	'advanceQueue with shuffle on single track returns null',
	async () => {
		const {advanceQueue, createInitialImmersiveState, setQueue} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState({shuffle: true});
		setQueue(state, [{videoId: 'a', title: 'A', artists: []}], 0);
		expect(advanceQueue(state)).toBe(null);
	},
	{timeout: 60000},
);

test(
	'toggleAutoplay flips immersive autoplay flag',
	async () => {
		const {createInitialImmersiveState, toggleAutoplay} =
			await import('../source/immersive/state/queue-state.ts');

		const state = createInitialImmersiveState();
		expect(state.autoplay).toBe(true);
		expect(toggleAutoplay(state)).toBe(false);
		expect(state.autoplay).toBe(false);
		expect(toggleAutoplay(state)).toBe(true);
	},
	{timeout: 60000},
);
