import test from 'ava';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

register('ts-node/esm', pathToFileURL('./'));

test('buildInstallPlan uses scoop on Windows when available', async t => {
	const {buildInstallPlan} =
		await import('../source/services/player/dependency-check.service.ts');

	const plan = buildInstallPlan('win32', ['scoop', 'choco'], ['mpv', 'yt-dlp']);
	t.deepEqual(plan, {
		command: 'scoop',
		args: ['install', 'mpv', 'yt-dlp'],
	});
});

test('buildInstallPlan uses sudo apt-get on Linux', async t => {
	const {buildInstallPlan} =
		await import('../source/services/player/dependency-check.service.ts');

	const plan = buildInstallPlan('linux', ['apt-get'], ['mpv', 'yt-dlp']);
	t.deepEqual(plan, {
		command: 'sudo',
		args: ['apt-get', 'install', '-y', 'mpv', 'yt-dlp'],
	});
});

test('buildInstallPlan returns null with no known package manager', async t => {
	const {buildInstallPlan} =
		await import('../source/services/player/dependency-check.service.ts');

	const plan = buildInstallPlan('linux', [], ['mpv']);
	t.is(plan, null);
});
