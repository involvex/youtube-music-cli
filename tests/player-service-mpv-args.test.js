import test from 'ava';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

const TEST_URL = 'https://www.youtube.com/watch?v=abc123';
const IPC_PATH = '/tmp/mpv-test';

test('buildMpvArgs respects the gapless playback toggle', async t => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(TEST_URL, IPC_PATH, {
		volume: 55,
		gaplessPlayback: false,
	});

	t.true(args.includes('--gapless-audio=no'));
	t.false(args.includes('--gapless-audio=yes'));
});

test('buildMpvArgs adds acrossfade and normalization filters when configured', async t => {
	const {buildMpvArgs} =
		await import('../source/services/player/player.service.ts');
	const args = buildMpvArgs(TEST_URL, IPC_PATH, {
		volume: 55,
		crossfadeDuration: 4,
		audioNormalization: true,
	});

	const filterArg = args.find(arg => arg.startsWith('--af='));
	t.truthy(filterArg);
	t.true(filterArg?.includes('acrossfade=d=4'));
	t.true(filterArg?.includes('dynaudnorm'));
});
