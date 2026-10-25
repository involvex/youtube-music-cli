import type {Config} from '../../types/config.types.ts';

/** Safe player/UI settings the web companion may change over WebSocket. */
export const WEB_REMOTE_CONFIG_KEYS = new Set<keyof Config>([
	'theme',
	'volume',
	'repeat',
	'shuffle',
	'streamQuality',
	'audioNormalization',
	'gaplessPlayback',
	'crossfadeDuration',
	'volumeFadeDuration',
	'equalizerPreset',
	'notifications',
	'subtitlesEnabled',
	'preferLocalPlayback',
	'showNetworkStatus',
	'downloadsEnabled',
	'downloadFormat',
]);

export function filterWebRemoteConfig(
	updates: Record<string, unknown>,
): Partial<Config> {
	const filtered: Partial<Config> = {};
	for (const [key, value] of Object.entries(updates)) {
		if (WEB_REMOTE_CONFIG_KEYS.has(key as keyof Config)) {
			(filtered as Record<string, unknown>)[key] = value;
		}
	}
	return filtered;
}

export function defaultWebAllowedOrigins(port: number): string[] {
	return [
		`http://localhost:${port}`,
		`http://127.0.0.1:${port}`,
		`http://[::1]:${port}`,
	];
}

export function isWebSocketOriginAllowed(
	req: {headers: {origin?: string; host?: string}},
	allowedOrigins: string[],
): boolean {
	if (allowedOrigins.includes('*')) {
		return true;
	}

	const origin = req.headers.origin;
	if (origin) {
		return allowedOrigins.includes(origin);
	}

	// Non-browser clients may omit Origin; allow only loopback Host.
	const host = (req.headers.host ?? '').toLowerCase();
	return (
		host.startsWith('localhost:') ||
		host.startsWith('127.0.0.1:') ||
		host.startsWith('[::1]:')
	);
}
