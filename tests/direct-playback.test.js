import {expect, test} from 'bun:test';
import {waitForDirectPlaybackEnd} from '../source/services/player/direct-playback.ts';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Fake player exposing only what waitForDirectPlaybackEnd uses. */
function makeFakePlayer({reconnects = true} = {}) {
	let callback = () => {};
	const player = {
		mpvAlive: true,
		reconnectAttempts: 0,
		stopCalls: 0,
		onEvent(cb) {
			callback = cb;
		},
		async tryReconnectIpc() {
			player.reconnectAttempts++;
			return reconnects;
		},
		hasMpvProcess() {
			return player.mpvAlive;
		},
		stop() {
			player.stopCalls++;
			player.mpvAlive = false;
		},
		emit(event) {
			callback(event);
		},
	};
	return player;
}

function track(promise) {
	const state = {done: false};
	void promise.then(() => {
		state.done = true;
	});
	return state;
}

test('direct playback: a transient IPC drop reconnects and keeps playing', async () => {
	const player = makeFakePlayer({reconnects: true});
	const playback = track(waitForDirectPlaybackEnd(player));

	player.emit({ipcDisconnected: true});
	await delay(20);
	expect(player.reconnectAttempts).toBe(1);
	expect(playback.done).toBe(false);
	expect(player.stopCalls).toBe(0);

	player.emit({eof: true});
	await delay(0);
	expect(playback.done).toBe(true);
	expect(player.stopCalls).toBe(1);
});

test('direct playback: gives up and stops mpv when reconnect fails', async () => {
	const player = makeFakePlayer({reconnects: false});
	const playback = track(waitForDirectPlaybackEnd(player));

	player.emit({ipcDisconnected: true});
	await delay(20);
	expect(playback.done).toBe(true);
	expect(player.stopCalls).toBe(1);
});

test('direct playback: finishes when mpv exits without an IPC event', async () => {
	const player = makeFakePlayer();
	const playback = track(waitForDirectPlaybackEnd(player));

	player.mpvAlive = false;
	await delay(1100);
	expect(playback.done).toBe(true);
});
