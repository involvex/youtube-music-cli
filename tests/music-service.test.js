import test from 'ava';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

test('getTrack accepts raw video id', async t => {
	const {getMusicService} =
		await import('../source/services/youtube-music/api.ts');
	const service = getMusicService();

	const track = await service.getTrack('dQw4w9WgXcQ');
	t.truthy(track);
	t.is(track?.videoId, 'dQw4w9WgXcQ');
});

test('getTrack normalizes YouTube watch URL to video id', async t => {
	const {getMusicService} =
		await import('../source/services/youtube-music/api.ts');
	const service = getMusicService();

	const track = await service.getTrack(
		'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc123',
	);
	t.truthy(track);
	t.is(track?.videoId, 'dQw4w9WgXcQ');
});

test('getTrack rejects invalid URL input', async t => {
	const {getMusicService} =
		await import('../source/services/youtube-music/api.ts');
	const service = getMusicService();

	const track = await service.getTrack('https://example.com/video.mp4');
	t.is(track, null);
});
