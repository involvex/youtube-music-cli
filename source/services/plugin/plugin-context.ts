// Plugin context - API surface provided to plugins
import type {
	PluginContext,
	PluginManifest,
	PluginPermission,
	PluginEvent,
	EventHandler,
} from '../../types/plugin.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {getPluginPermissionsService} from './plugin-permissions.service.ts';
import {getPluginHooksService} from './plugin-hooks.service.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger as appLogger} from '../logger/logger.service.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {join} from 'node:path';
import {
	mkdirSync,
	readFileSync,
	writeFileSync,
	existsSync,
	readdirSync,
	rmSync,
} from 'node:fs';

/**
 * Create a plugin context for a specific plugin
 */
export function createPluginContext(
	manifest: PluginManifest,
	playerAPI: PluginContext['player'],
	navigationAPI: PluginContext['navigation'],
): PluginContext {
	const permissionsService = getPluginPermissionsService();
	const hooksService = getPluginHooksService();
	const configService = getConfigService();
	const pluginId = manifest.id;

	// Plugin data directory
	const pluginDataDir = join(CONFIG_DIR, 'plugins', pluginId, 'data');

	// Ensure data directory exists
	if (!existsSync(pluginDataDir)) {
		mkdirSync(pluginDataDir, {recursive: true});
	}

	// Permission checker wrapper
	const checkPermission = (permission: PluginPermission): void => {
		if (!permissionsService.hasPermission(pluginId, permission)) {
			throw new Error(
				`Plugin ${pluginId} does not have ${permission} permission`,
			);
		}
	};

	// Create scoped logger for plugin
	const pluginLogger: PluginContext['logger'] = {
		debug: (message: string, ...args: unknown[]) => {
			appLogger.debug(`[${manifest.name}]`, message, ...args);
		},
		info: (message: string, ...args: unknown[]) => {
			appLogger.info(`[${manifest.name}]`, message, ...args);
		},
		warn: (message: string, ...args: unknown[]) => {
			appLogger.warn(`[${manifest.name}]`, message, ...args);
		},
		error: (message: string, ...args: unknown[]) => {
			appLogger.error(`[${manifest.name}]`, message, ...args);
		},
	};

	// Filesystem API (scoped to plugin data directory)
	const filesystemAPI: PluginContext['filesystem'] = {
		readFile: async (path: string) => {
			checkPermission('filesystem');
			const fullPath = join(pluginDataDir, path);
			return readFileSync(fullPath, 'utf-8');
		},
		writeFile: async (path: string, data: string) => {
			checkPermission('filesystem');
			const fullPath = join(pluginDataDir, path);
			// Ensure parent directory exists
			const dir = join(fullPath, '..');
			if (!existsSync(dir)) {
				mkdirSync(dir, {recursive: true});
			}
			writeFileSync(fullPath, data, 'utf-8');
		},
		deleteFile: async (path: string) => {
			checkPermission('filesystem');
			const fullPath = join(pluginDataDir, path);
			if (existsSync(fullPath)) {
				rmSync(fullPath);
			}
		},
		exists: async (path: string) => {
			checkPermission('filesystem');
			const fullPath = join(pluginDataDir, path);
			return existsSync(fullPath);
		},
		listFiles: async (path = '') => {
			checkPermission('filesystem');
			const fullPath = join(pluginDataDir, path);
			if (!existsSync(fullPath)) {
				return [];
			}
			return readdirSync(fullPath);
		},
		getDataDir: () => {
			return pluginDataDir;
		},
	};

	// Config API (scoped to plugin config namespace)
	const pluginConfigKey = `plugin.${pluginId}`;
	const configAPI: PluginContext['config'] = {
		get: <T = unknown>(key: string, defaultValue?: T) => {
			const fullKey = `${pluginConfigKey}.${key}`;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const value = configService.get(fullKey as any);
			return (value ?? defaultValue) as T;
		},
		set: (key: string, value: unknown) => {
			const fullKey = `${pluginConfigKey}.${key}`;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			configService.set(fullKey as any, value as any);
		},
		delete: (key: string) => {
			const fullKey = `${pluginConfigKey}.${key}`;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			configService.set(fullKey as any, undefined as any);
		},
		getAll: () => {
			// Get all keys starting with plugin config namespace
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const allConfig = configService.get('pluginConfigs' as any) as Record<
				string,
				Record<string, unknown>
			>;
			return allConfig?.[pluginId] ?? {};
		},
	};

	// Audio API
	const audioAPI: PluginContext['audio'] = {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		transformStreamUrl: async (url: string, _track: Track) => {
			checkPermission('player');
			// Plugins can return modified URL, null to skip, or same URL
			return url;
		},
		onStreamRequest: handler => {
			checkPermission('player');
			// Register handler for stream requests
			hooksService.on('stream-request', async event => {
				if (event.type === 'stream-request' && event.url && event.track) {
					await handler(event.url, event.track);
				}
			});
		},
	};

	// Player API with permission checks
	const wrappedPlayerAPI: PluginContext['player'] = {
		play: async (track: Track) => {
			checkPermission('player');
			return playerAPI.play(track);
		},
		pause: () => {
			checkPermission('player');
			playerAPI.pause();
		},
		resume: () => {
			checkPermission('player');
			playerAPI.resume();
		},
		stop: () => {
			checkPermission('player');
			playerAPI.stop();
		},
		next: () => {
			checkPermission('player');
			playerAPI.next();
		},
		previous: () => {
			checkPermission('player');
			playerAPI.previous();
		},
		seek: (position: number) => {
			checkPermission('player');
			playerAPI.seek(position);
		},
		setVolume: (volume: number) => {
			checkPermission('player');
			playerAPI.setVolume(volume);
		},
		getVolume: () => {
			checkPermission('player');
			return playerAPI.getVolume();
		},
		getCurrentTrack: () => {
			checkPermission('player');
			return playerAPI.getCurrentTrack();
		},
		getQueue: () => {
			checkPermission('player');
			return playerAPI.getQueue();
		},
		addToQueue: (track: Track) => {
			checkPermission('player');
			playerAPI.addToQueue(track);
		},
		removeFromQueue: (index: number) => {
			checkPermission('player');
			playerAPI.removeFromQueue(index);
		},
		clearQueue: () => {
			checkPermission('player');
			playerAPI.clearQueue();
		},
		shuffle: (enabled: boolean) => {
			checkPermission('player');
			playerAPI.shuffle(enabled);
		},
		setRepeat: (mode: 'off' | 'all' | 'one') => {
			checkPermission('player');
			playerAPI.setRepeat(mode);
		},
	};

	// Navigation API with permission checks
	const wrappedNavigationAPI: PluginContext['navigation'] = {
		navigate: (view: string) => {
			checkPermission('ui');
			navigationAPI.navigate(view);
		},
		goBack: () => {
			checkPermission('ui');
			navigationAPI.goBack();
		},
		getCurrentView: () => {
			checkPermission('ui');
			return navigationAPI.getCurrentView();
		},
		registerView: (viewId: string, component) => {
			checkPermission('ui');
			navigationAPI.registerView(viewId, component);
		},
		unregisterView: (viewId: string) => {
			checkPermission('ui');
			navigationAPI.unregisterView(viewId);
		},
	};

	// Event system
	const context: PluginContext = {
		plugin: manifest,
		player: wrappedPlayerAPI,
		navigation: wrappedNavigationAPI,
		config: configAPI,
		logger: pluginLogger,
		filesystem: filesystemAPI,
		audio: audioAPI,

		on: <T extends PluginEvent = PluginEvent>(
			eventType: T['type'],
			handler: EventHandler<T>,
		) => {
			hooksService.on(eventType, handler);
		},

		off: <T extends PluginEvent = PluginEvent>(
			eventType: T['type'],
			handler: EventHandler<T>,
		) => {
			hooksService.off(eventType, handler);
		},

		emit: <T extends PluginEvent = PluginEvent>(event: T) => {
			hooksService.emitSync(event);
		},

		hasPermission: (permission: PluginPermission) => {
			return permissionsService.hasPermission(pluginId, permission);
		},

		requestPermission: async (permission: PluginPermission) => {
			return permissionsService.requestPermission(pluginId, permission);
		},

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		registerShortcut: (_keys: string[], _handler: () => void) => {
			checkPermission('ui');
			// This will be implemented when we integrate with useKeyBinding
			pluginLogger.warn('registerShortcut not yet implemented');
		},

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		unregisterShortcut: (_keys: string[]) => {
			checkPermission('ui');
			// This will be implemented when we integrate with useKeyBinding
			pluginLogger.warn('unregisterShortcut not yet implemented');
		},
	};

	return context;
}
