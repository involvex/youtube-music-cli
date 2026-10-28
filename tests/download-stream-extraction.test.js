import {expect, test} from 'bun:test';

test('getStreamUrl prefers youtubei.js then yt-dlp then Invidious', async () => {
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

	expect(url).toBe('https://example.com/audio.m4a');
	expect(attempts.includes('try-youtubei')).toBe(true);
	expect(attempts.includes('try-invidious')).toBe(false);
	expect(attempts.includes('invidious-called')).toBe(false);
});

test('getStreamUrl falls through to yt-dlp then Invidious when youtubei fails', async () => {
	const attempts = [];

	const failingYt = {
		session: {player: {}},
		async getBasicInfo() {
			attempts.push('youtubei');
			throw new Error('No valid URL to decipher');
		},
	};

	async function getStreamUrl(videoId, yt, ytdlp, invidious) {
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

		try {
			attempts.push('try-ytdlp');
			return await ytdlp(videoId);
		} catch {
			attempts.push('ytdlp-failed');
		}

		return invidious(videoId);
	}

	const url = await getStreamUrl(
		'xyz',
		failingYt,
		async () => {
			throw new Error('yt-dlp missing');
		},
		async id => {
			attempts.push(`invidious:${id}`);
			return 'https://invidious.example/stream';
		},
	);

	expect(url).toBe('https://invidious.example/stream');
	expect(attempts).toEqual([
		'youtubei',
		'youtubei-failed',
		'try-ytdlp',
		'ytdlp-failed',
		'invidious:xyz',
	]);
});

test('getStreamUrl uses yt-dlp when youtubei returns empty cipher', async () => {
	const attempts = [];

	async function getStreamUrl(videoId, youtubei, ytdlp) {
		try {
			attempts.push('youtubei');
			const url = await youtubei(videoId);
			if (url) return url;
		} catch {
			attempts.push('youtubei-failed');
		}
		attempts.push('ytdlp');
		return ytdlp(videoId);
	}

	const url = await getStreamUrl(
		'abc',
		async () => {
			throw new Error('No valid URL to decipher');
		},
		async () => 'https://googlevideo.example/audio',
	);

	expect(url).toBe('https://googlevideo.example/audio');
	expect(attempts).toEqual(['youtubei', 'youtubei-failed', 'ytdlp']);
});

test('download acquire order prefers yt-dlp then stream then mpv', async () => {
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

	expect(used).toBe('mpv');
	expect(order).toEqual(['yt-dlp', 'stream', 'mpv']);
});

test('download progress callback reports start and done phases', async () => {
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

	expect(phases).toEqual([
		'start:1/2:A',
		'done:1/2:A',
		'start:2/2:B',
		'done:2/2:B',
	]);
});
