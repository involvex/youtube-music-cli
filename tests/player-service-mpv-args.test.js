import {expect, test} from 'bun:test';

const IPC_PATH = '/tmp/mpv-test';

test('player-service-mpv-args: buildMpvArgs respects the gapless playback toggle', async () => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		gaplessPlayback: false,
	});

	expect(args.includes('--gapless-audio=no')).toBe(true);
	expect(args.includes('--gapless-audio=yes')).toBe(false);
});

test('player-service-mpv-args: buildMpvArgs adds normalization filters and enables gapless for crossfade', async () => {
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
	expect(filterArg).toBeTruthy();
	expect(filterArg?.includes('acrossfade')).toBe(false);
	expect(filterArg?.includes('dynaudnorm')).toBe(true);
	expect(filterArg?.includes('afade=t=in')).toBe(true);
	expect(filterArg?.includes('afade=t=out')).toBe(true);
	expect(args.includes('--gapless-audio=yes')).toBe(true);
});

test('player-service-mpv-args: isValidIpcPipePath rejects null and empty paths', async () => {
	const {isValidIpcPipePath} =
		await import('../source/services/player/player.service.ts');

	expect(isValidIpcPipePath(null)).toBe(false);
	expect(isValidIpcPipePath(undefined)).toBe(false);
	expect(isValidIpcPipePath('')).toBe(false);
	expect(isValidIpcPipePath('   ')).toBe(false);
});

test('player-service-mpv-args: normalizeIpcPipePath normalizes Windows pipe paths', async () => {
	const {normalizeIpcPipePath} =
		await import('../source/services/player/player.service.ts');

	if (process.platform === 'win32') {
		expect(normalizeIpcPipePath('//./pipe/mpvsocket-123')).toBe(
			'\\\\.\\pipe\\mpvsocket-123',
		);
		expect(() => normalizeIpcPipePath('not-a-pipe')).toThrow();
	} else {
		expect(normalizeIpcPipePath('/tmp/mpvsocket-1')).toBe('/tmp/mpvsocket-1');
	}
});

test('player-service-mpv-args: buildMpvArgs uses mpv slang option when subtitles are enabled', async () => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		subtitlesEnabled: true,
	});

	expect(args.includes('--slang=en')).toBe(true);
	expect(args.includes('--sub-scale=1.3')).toBe(true);
	expect(args.includes('--sub-lang=en')).toBe(false);
});

test('player-service-mpv-args: buildMpvArgs adds cookies-from-browser for yt-dlp', async () => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		cookiesFromBrowser: 'edge',
	});

	expect(
		args.includes('--ytdl-raw-options-append=cookies-from-browser=edge'),
	).toBe(true);
});

test('player-service-mpv-args: buildMpvArgs prefers cookiesFile over browser', async () => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
		cookiesFile: 'C:/cookies.txt',
		cookiesFromBrowser: 'chrome',
	});

	expect(
		args.includes('--ytdl-raw-options-append=cookies=C:/cookies.txt'),
	).toBe(true);
	expect(args.some(arg => arg.includes('cookies-from-browser'))).toBe(false);
});

test('ytdl-cookies: formatPlaybackErrorMessage maps bot check to settings hint', async () => {
	const {formatPlaybackErrorMessage, isYouTubeBotCheckError} =
		await import('../source/services/player/ytdl-cookies.ts');

	expect(
		isYouTubeBotCheckError("ERROR: Sign in to confirm you're not a bot"),
	).toBe(true);
	expect(
		formatPlaybackErrorMessage(
			new Error('Sign in to confirm you are not a bot'),
		).includes('Cookies From Browser'),
	).toBe(true);
});

test('player-service-mpv-args: buildMpvArgs includes --idle=yes to keep mpv alive for IPC', async () => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(IPC_PATH, {
		volume: 55,
	});

	expect(args.includes('--idle=yes')).toBe(true);
	expect(args.some(arg => arg.startsWith('--input-ipc-server'))).toBe(true);
});

test('player-service-mpv-args: connectToMpvIpc throws on invalid path instead of passing null', async () => {
	const {connectToMpvIpc} =
		await import('../source/services/player/player.service.ts');

	expect(() => connectToMpvIpc('')).toThrow(/IPC pipe path is empty/);
});
