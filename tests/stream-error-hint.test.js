import {expect, test} from 'bun:test';
import {
	formatPlaybackErrorMessage,
	isYouTubeBotCheckError,
	isYouTubeLoadFailure,
	YTDLP_STALE_HINT,
	COOKIES_BOT_HINT,
} from '../source/services/player/ytdl-cookies.ts';
import {
	isYtDlpVersionStale,
	parseYtDlpVersionDate,
} from '../source/services/player/dependency-check.service.ts';

test('bot check errors map to the cookies hint', () => {
	expect(isYouTubeBotCheckError('Sign in to confirm you are not a bot')).toBe(
		true,
	);
	expect(formatPlaybackErrorMessage(new Error('Sign in to confirm'))).toBe(
		COOKIES_BOT_HINT,
	);
});

test('googlevideo 403 maps to the update-yt-dlp hint', () => {
	expect(
		isYouTubeLoadFailure(
			'Failed to open https://rr1---sn-xxx.googlevideo.com/videoplayback?x=1: HTTP error 403 Forbidden',
		),
	).toBe(true);
	expect(
		formatPlaybackErrorMessage(
			new Error(
				'Failed to open https://rr1---sn-xxx.googlevideo.com/videoplayback?x=1: 403',
			),
		),
	).toBe(YTDLP_STALE_HINT);
});

test('bare mpv exit codes need YouTube evidence or a known source', () => {
	// No evidence: original diagnostic preserved (e.g. local files, radio).
	expect(isYouTubeLoadFailure('mpv exited with code 2')).toBe(false);
	expect(formatPlaybackErrorMessage(new Error('mpv exited with code 2'))).toBe(
		'mpv exited with code 2',
	);
	// Known YouTube source (e.g. empty stderr after --really-quiet): hinted.
	expect(
		isYouTubeLoadFailure('mpv exited with code 2', {
			knownYouTubeSource: true,
		}),
	).toBe(true);
	expect(
		formatPlaybackErrorMessage(new Error('mpv exited with code 2'), {
			knownYouTubeSource: true,
		}),
	).toBe(YTDLP_STALE_HINT);
});

test('unrelated errors pass through unchanged', () => {
	expect(isYouTubeLoadFailure('IPC connection failed: timeout')).toBe(false);
	expect(formatPlaybackErrorMessage(new Error('boom'))).toBe('boom');
});

test('bot check takes precedence over load failure', () => {
	expect(
		formatPlaybackErrorMessage(
			new Error('403 Sign in to confirm you are not a bot'),
		),
	).toBe(COOKIES_BOT_HINT);
});

test('yt-dlp version date parsing', () => {
	expect(parseYtDlpVersionDate('2026.08.19\n')?.toISOString()).toBe(
		'2026-08-19T00:00:00.000Z',
	);
	expect(parseYtDlpVersionDate('nightly')).toBe(null);
	expect(parseYtDlpVersionDate('2026.13.99')).toBe(null);
});

test('yt-dlp staleness threshold', () => {
	const now = new Date('2026-09-08T00:00:00.000Z');
	expect(isYtDlpVersionStale('2026.08.19', now)).toBe(false);
	expect(isYtDlpVersionStale('2026.07.04', now)).toBe(true);
	expect(isYtDlpVersionStale('garbage', now)).toBe(false);
});
