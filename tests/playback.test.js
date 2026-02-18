import test from 'ava';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

// Enable TS imports for source files
register('ts-node/esm', pathToFileURL('./'));

test('player service exposes singleton without starting mpv', async t => {
	const {getPlayerService} =
		await import('../source/services/player/player.service.ts');

	const a = getPlayerService();
	const b = getPlayerService();

	t.is(a, b);

	// Should allow pause/resume/stop without crashing when mpv is not running
	t.notThrows(() => {
		a.pause();
		a.resume();
		a.stop();
	});
});

test('discord rpc service no-ops when disabled', async t => {
	const {getDiscordRpcService} =
		await import('../source/services/discord/discord-rpc.service.ts');
	const rpc = getDiscordRpcService();

	rpc.setEnabled(false);
	await rpc.connect();
	await rpc.updateActivity({
		title: 'Song',
		artist: 'Artist',
		startTimestamp: Date.now(),
	});
	await rpc.clearActivity();

	t.pass();
});
