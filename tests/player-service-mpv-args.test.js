import test from 'ava';

const IPC_PATH = '/tmp/mpv-test';

test('player-service-mpv-args: buildMpvArgs respects the gapless playback toggle', async t => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		gaplessPlayback: false,
	});

	t.true(args.includes('--gapless-audio=no'));
	t.false(args.includes('--gapless-audio=yes'));
});

test('player-service-mpv-args: buildMpvArgs adds acrossfade and normalization filters when configured', async t => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		crossfadeDuration: 4,
		audioNormalization: true,
		volumeFadeDuration: 2,
		duration: 300,
	});

	const filterArg = args.find(arg => arg.startsWith('--af='));
	t.truthy(filterArg);
	t.true(filterArg?.includes('acrossfade=d=4'));
	t.true(filterArg?.includes('dynaudnorm'));
	t.true(filterArg?.includes('afade=t=in'));
	t.true(filterArg?.includes('afade=t=out'));
});

test('player-service-mpv-args: isValidIpcPipePath rejects null and empty paths', async t => {
	const {isValidIpcPipePath} =
		await import('../source/services/player/player.service.ts');

	t.false(isValidIpcPipePath(null));
	t.false(isValidIpcPipePath(undefined));
	t.false(isValidIpcPipePath(''));
	t.false(isValidIpcPipePath('   '));
});

test('player-service-mpv-args: normalizeIpcPipePath normalizes Windows pipe paths', async t => {
	const {normalizeIpcPipePath} =
		await import('../source/services/player/player.service.ts');

	if (process.platform === 'win32') {
		t.is(
			normalizeIpcPipePath('//./pipe/mpvsocket-123'),
			'\\\\.\\pipe\\mpvsocket-123',
		);
		t.throws(() => normalizeIpcPipePath('not-a-pipe'));
	} else {
		t.is(normalizeIpcPipePath('/tmp/mpvsocket-1'), '/tmp/mpvsocket-1');
	}
});

test('player-service-mpv-args: buildMpvArgs uses mpv slang option when subtitles are enabled', async t => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		subtitlesEnabled: true,
	});

	t.true(args.includes('--slang=en'));
	t.true(args.includes('--sub-scale=1.3'));
	t.false(args.includes('--sub-lang=en'));
});

test('player-service-mpv-args: connectToMpvIpc throws on invalid path instead of passing null', async t => {
	const {connectToMpvIpc} =
		await import('../source/services/player/player.service.ts');

	t.throws(() => connectToMpvIpc(''), {
		message: /IPC pipe path is empty/,
	});
});
