import {expect, test} from 'bun:test';

test('mpv-ipc-buffer: reassembles split JSON lines', async () => {
	const {drainMpvIpcLines} =
		await import('../source/services/player/mpv-ipc-buffer.ts');

	let buffer = '';
	const first = drainMpvIpcLines(buffer, '{"event":"end-file","reason":"eof"}');
	expect(first.lines).toHaveLength(0);
	expect(first.remainder.length).toBeGreaterThan(0);

	const second = drainMpvIpcLines(first.remainder, '\n');
	expect(second.lines).toHaveLength(1);
	expect(JSON.parse(second.lines[0]).reason).toBe('eof');
});

test('web-config-policy: filters sensitive config keys', async () => {
	const {filterWebRemoteConfig} =
		await import('../source/services/web/web-config-policy.ts');

	const filtered = filterWebRemoteConfig({
		volume: 42,
		proxy: 'http://evil.example',
		llm: {apiKey: 'secret'},
		theme: 'matrix',
	});

	expect(filtered.volume).toBe(42);
	expect(filtered.theme).toBe('matrix');
	expect(filtered.proxy).toBeUndefined();
	expect(filtered.llm).toBeUndefined();
});

test('web-config-policy: rejects cross-site websocket origins by default', async () => {
	const {defaultWebAllowedOrigins, isWebSocketOriginAllowed} =
		await import('../source/services/web/web-config-policy.ts');

	const allowed = defaultWebAllowedOrigins(3000);
	expect(
		isWebSocketOriginAllowed(
			{headers: {origin: 'https://evil.example', host: 'localhost:3000'}},
			allowed,
		),
	).toBe(false);
	expect(
		isWebSocketOriginAllowed(
			{headers: {origin: 'http://localhost:3000', host: 'localhost:3000'}},
			allowed,
		),
	).toBe(true);
	// LAN / non-loopback same-origin must work when bound to 0.0.0.0
	expect(
		isWebSocketOriginAllowed(
			{
				headers: {
					origin: 'http://192.168.1.10:3000',
					host: '192.168.1.10:3000',
				},
			},
			allowed,
		),
	).toBe(true);
	expect(
		isWebSocketOriginAllowed(
			{
				headers: {
					origin: 'http://192.168.1.10:3000',
					host: 'localhost:3000',
				},
			},
			allowed,
		),
	).toBe(false);
});
