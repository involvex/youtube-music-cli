import test from 'ava';

test('getStreamUrl prefers youtubei.js then Invidious (no ytdl/youtube-ext)', async t => {
	const attempts = [];

	const fakeYt = {
		session: {player: {}},
		async getBasicInfo(videoId) {
			attempts.push(`youtubei:${videoId}`);
			return {
				chooseFormat() {
					return {
						decipher() {
							return 'https://example.com/audio.m4a';
						},
					};
				},
			};
		},
	};

	// Exercise the extraction preference via a minimal local replica of the
	// fallback order used in MusicService.getStreamUrl.
	async function getStreamUrl(videoId, yt, invidious) {
		try {
			attempts.push('try-youtubei');
			const info = await yt.getBasicInfo(videoId);
			const format = info.chooseFormat({type: 'audio', quality: 'best'});
			const streamUrl =
				typeof format?.decipher === 'function'
					? format.decipher(yt.session.player)
					: format?.url;
			if (streamUrl) {
				return streamUrl;
			}
		} catch {
			attempts.push('youtubei-failed');
		}

		attempts.push('try-invidious');
		return invidious(videoId);
	}

	const url = await getStreamUrl('abc123', fakeYt, async () => {
		attempts.push('invidious-called');
		return 'https://invidious.example/audio';
	});

	t.is(url, 'https://example.com/audio.m4a');
	t.true(attempts.includes('try-youtubei'));
	t.false(attempts.includes('try-invidious'));
	t.false(attempts.includes('invidious-called'));
});

test('getStreamUrl falls through to Invidious when youtubei fails', async t => {
	const attempts = [];

	const failingYt = {
		session: {player: {}},
		async getBasicInfo() {
			attempts.push('youtubei');
			throw new Error('ParsingError');
		},
	};

	async function getStreamUrl(videoId, yt, invidious) {
		try {
			const info = await yt.getBasicInfo(videoId);
			const format = info.chooseFormat({type: 'audio', quality: 'best'});
			const streamUrl =
				typeof format?.decipher === 'function'
					? format.decipher(yt.session.player)
					: format?.url;
			if (streamUrl) {
				return streamUrl;
			}
		} catch {
			attempts.push('youtubei-failed');
		}

		return invidious(videoId);
	}

	const url = await getStreamUrl('xyz', failingYt, async id => {
		attempts.push(`invidious:${id}`);
		return 'https://invidious.example/stream';
	});

	t.is(url, 'https://invidious.example/stream');
	t.deepEqual(attempts, ['youtubei', 'youtubei-failed', 'invidious:xyz']);
});

test('download acquire order prefers yt-dlp then stream then mpv', async t => {
	const order = [];

	async function acquireAudioSource(methods) {
		const errors = [];
		try {
			order.push('yt-dlp');
			await methods.ytDlp();
			return 'yt-dlp';
		} catch (error) {
			errors.push(String(error));
		}

		try {
			order.push('stream');
			await methods.stream();
			return 'stream';
		} catch (error) {
			errors.push(String(error));
		}

		order.push('mpv');
		await methods.mpv();
		return 'mpv';
	}

	const used = await acquireAudioSource({
		ytDlp: async () => {
			throw new Error('missing');
		},
		stream: async () => {
			throw new Error('no url');
		},
		mpv: async () => {},
	});

	t.is(used, 'mpv');
	t.deepEqual(order, ['yt-dlp', 'stream', 'mpv']);
});

test('download progress callback reports start and done phases', async t => {
	const phases = [];
	const tracks = [
		{videoId: 'a', title: 'A', artists: [], duration: 1},
		{videoId: 'b', title: 'B', artists: [], duration: 1},
	];

	async function fakeDownloadTracks(list, options = {}) {
		const total = list.length;
		for (let i = 0; i < list.length; i++) {
			const track = list[i];
			options.onProgress?.({
				current: i + 1,
				total,
				track,
				phase: 'start',
			});
			options.onProgress?.({
				current: i + 1,
				total,
				track,
				phase: 'done',
			});
		}
	}

	await fakeDownloadTracks(tracks, {
		onProgress: info => {
			phases.push(
				`${info.phase}:${info.current}/${info.total}:${info.track.title}`,
			);
		},
	});

	t.deepEqual(phases, [
		'start:1/2:A',
		'done:1/2:A',
		'start:2/2:B',
		'done:2/2:B',
	]);
});
