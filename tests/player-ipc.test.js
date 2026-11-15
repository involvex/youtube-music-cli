import {afterEach, expect, test} from 'bun:test';
import {mkdtempSync, rmSync} from 'node:fs';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const teardowns = [];
afterEach(() => {
	while (teardowns.length) {
		teardowns.pop()();
	}
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(predicate, timeoutMs = 2000) {
	const started = Date.now();
	while (!predicate()) {
		if (Date.now() - started > timeoutMs) {
			throw new Error('Timed out waiting for condition');
		}
		await delay(10);
	}
}

/** Minimal stand-in for mpv's JSON IPC socket. */
async function startFakeMpv() {
	let ipcPath;
	if (process.platform === 'win32') {
		ipcPath = `\\\\.\\pipe\\ymc-test-${process.pid}-${Date.now()}`;
	} else {
		const dir = mkdtempSync(join(tmpdir(), 'ymc-ipc-'));
		teardowns.push(() => rmSync(dir, {recursive: true, force: true}));
		ipcPath = join(dir, 'mpv.sock');
	}

	const commands = [];
	const sockets = [];
	let resolveNextConnection;
	let nextConnection = new Promise(resolve => {
		resolveNextConnection = resolve;
	});

	const server = createServer(socket => {
		sockets.push(socket);
		socket.on('data', data => {
			commands.push(String(data));
		});
		socket.on('error', () => {});
		resolveNextConnection(socket);
		nextConnection = new Promise(resolve => {
			resolveNextConnection = resolve;
		});
	});
	const connected = new Promise(resolve => server.once('connection', resolve));
	await new Promise(resolve => server.listen(ipcPath, resolve));
	teardowns.push(() => server.close());

	return {
		ipcPath,
		connected,
		commands,
		sockets,
		waitForNextConnection: () => nextConnection,
	};
}

async function attachPlayer(options = {}) {
	const {getPlayerService} =
		await import('../source/services/player/player.service.ts');
	const player = getPlayerService();
	const fake = await startFakeMpv();
	const events = [];
	player.onEvent(event => events.push(event));
	await player.reattach(fake.ipcPath, options);
	teardowns.push(() => player.stop());
	const socket = await fake.connected;
	return {socket, events, player, fake};
}

test('player IPC: end-file eof is reported even when split across chunks', async () => {
	const {socket, events} = await attachPlayer();
	const message =
		JSON.stringify({event: 'end-file', reason: 'eof', playlist_entry_id: 1}) +
		'\n';

	socket.write(message.slice(0, 12));
	await delay(30);
	socket.write(message.slice(12));

	await waitFor(() => events.some(event => event.eof));
});

test('player IPC: end-file error ends the track', async () => {
	const {socket, events} = await attachPlayer();
	socket.write(
		JSON.stringify({
			event: 'end-file',
			reason: 'error',
			file_error: 'loading failed',
		}) + '\n',
	);

	await waitFor(() => events.some(event => event.eof));
});

test('player IPC: multi-byte UTF-8 split across chunks is decoded intact', async () => {
	const {socket, events} = await attachPlayer();
	const text = 'Ünïcødé ♪ 歌';
	const bytes = Buffer.from(
		JSON.stringify({event: 'property-change', name: 'sub-text', data: text}) +
			'\n',
	);
	// Split inside the 3-byte "♪"
	const splitAt = bytes.indexOf(Buffer.from('♪')) + 1;

	socket.write(bytes.subarray(0, splitAt));
	await delay(30);
	socket.write(bytes.subarray(splitAt));

	await waitFor(() => events.some(event => event.subtitle !== undefined));
	expect(events.find(event => event.subtitle !== undefined).subtitle).toBe(
		text,
	);
});

test('player IPC: tryReconnectIpc does not loadfile when a currentUrl is set', async () => {
	const {socket, player, fake} = await attachPlayer({
		currentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	});

	const reconnectSocketPromise = fake.waitForNextConnection();
	socket.destroy();
	await delay(50);

	const ok = await player.tryReconnectIpc();
	expect(ok).toBe(true);

	const reconnectSocket = await reconnectSocketPromise;
	await delay(50);

	const payload = fake.commands.join('');
	expect(payload.includes('loadfile')).toBe(false);
	expect(payload.includes('observe_property')).toBe(true);
	expect(reconnectSocket.destroyed).toBe(false);
});

test('player IPC: pause() leaves orphan mpv running when reconnect fails', async () => {
	const {getPlayerService} =
		await import('../source/services/player/player.service.ts');
	const player = getPlayerService();
	teardowns.push(() => player.stop());

	let stopCalls = 0;
	const originalStop = player.stop.bind(player);
	player.stop = (...args) => {
		stopCalls++;
		return originalStop(...args);
	};

	player.mpvProcess = {killed: false, pid: 1};
	player.ipcPath =
		process.platform === 'win32'
			? `\\\\.\\pipe\\ymc-missing-${process.pid}-${Date.now()}`
			: join(tmpdir(), `ymc-missing-${process.pid}-${Date.now()}.sock`);

	await player.pause();

	expect(stopCalls).toBe(0);
	expect(player.hasMpvProcess()).toBe(true);
	player.mpvProcess = null;
});
