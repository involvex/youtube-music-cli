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
	const {buildProgressBar, buildVolumeBar, computeLayout} =
		await import('../source/immersive/ui/layout.ts');

	const layout = computeLayout(100, 30);
	t.true(layout.vizH >= 7);
	t.true(layout.vizW > 0);
	t.true(layout.nowPlayingW > 0);

	const {bar} = buildProgressBar(0.5, 10);
	t.is(bar.length, 10);
	t.true(bar.includes('█'));
	t.true(bar.includes('░'));

	const vol = buildVolumeBar(50, 8);
	t.is(vol.length, 8);
});

test('search overlay handles submit and cancel', async t => {
	const {
		closeSearchOverlay,
		createSearchOverlayState,
		handleSearchInput,
		openSearchOverlay,
	} = await import('../source/immersive/ui/search-overlay.ts');

	const overlay = createSearchOverlayState();
	openSearchOverlay(overlay);
	t.true(overlay.active);

	t.is(handleSearchInput(overlay, 't'), 'none');
	t.is(handleSearchInput(overlay, 'e'), 'none');
	t.is(handleSearchInput(overlay, 's'), 'none');
	t.is(handleSearchInput(overlay, 't'), 'none');
	t.is(overlay.query, 'test');
	t.is(handleSearchInput(overlay, 'enter'), 'submit');

	closeSearchOverlay(overlay);
	t.false(overlay.active);
	t.is(handleSearchInput(overlay, 'escape'), 'cancel');
});
