// Plugin system type definitions
import type {Track} from './youtube-music.types.ts';
import type {ReactElement} from 'react';

/**
 * Plugin permission types
 */
export type PluginPermission =
	| 'filesystem' // Read/write files in plugin data directory
	| 'network' // Make network requests
	| 'player' // Control playback (play, pause, skip, etc.)
	| 'ui' // Register views and keyboard shortcuts
	| 'config'; // Read/write app configuration

/**
 * Permission request status
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt';

/**
 * Plugin permissions mapping
 */
export interface PluginPermissions {
	[permission: string]: PermissionStatus;
}

/**
 * Player event types
 */
export interface PlayerEvent {
	type:
		| 'play'
		| 'pause'
		| 'stop'
		| 'resume'
		| 'next'
		| 'previous'
		| 'seek'
		| 'volume-change'
		| 'track-change'
		| 'queue-change'
		| 'shuffle-change'
		| 'repeat-change';
	track?: Track;
	position?: number;
	volume?: number;
	queue?: Track[];
	shuffle?: boolean;
	repeat?: 'off' | 'all' | 'one';
	timestamp: number;
}

/**
 * Navigation event types
 */
export interface NavigationEvent {
	type: 'view-change' | 'search' | 'select-result';
	view?: string;
	previousView?: string;
	query?: string;
	timestamp: number;
}

/**
 * Audio stream event types
 */
export interface AudioStreamEvent {
	type: 'stream-request' | 'stream-start' | 'stream-end' | 'stream-error';
	url?: string;
	track?: Track;
	error?: Error;
	timestamp: number;
}

/**
 * Plugin event types (union of all event types)
 */
export type PluginEvent = PlayerEvent | NavigationEvent | AudioStreamEvent;

/**
 * Event handler callback
 */
export type EventHandler<T extends PluginEvent = PluginEvent> = (
	event: T,
) => void | Promise<void>;

/**
 * Plugin manifest - metadata and declarations
 */
export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description: string;
	author: string;
	license?: string;
	homepage?: string;
	repository?: string;

	// Plugin entry point
	main: string;

	// Required permissions
	permissions: PluginPermission[];

	// Supported hooks
	hooks?: Array<PlayerEvent['type'] | NavigationEvent['type']>;

	// UI extensions
	ui?: {
		views?: string[]; // View IDs this plugin registers
		shortcuts?: string[]; // Keyboard shortcuts this plugin uses
	};

	// Dependencies
	dependencies?: Record<string, string>;

	// Plugin-specific configuration schema
	configSchema?: Record<string, unknown>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
	enabled: boolean;
	config: Record<string, unknown>;
	permissions: PluginPermissions;
}

/**
 * Player API provided to plugins
 */
export interface PluginPlayerAPI {
	play: (track: Track) => Promise<void>;
	pause: () => void;
	resume: () => void;
	stop: () => void;
	next: () => void;
	previous: () => void;
	seek: (position: number) => void;
	setVolume: (volume: number) => void;
	getVolume: () => number;
	getCurrentTrack: () => Track | null;
	getQueue: () => Track[];
	addToQueue: (track: Track) => void;
	removeFromQueue: (index: number) => void;
	clearQueue: () => void;
	shuffle: (enabled: boolean) => void;
	setRepeat: (mode: 'off' | 'all' | 'one') => void;
}

/**
 * Navigation API provided to plugins
 */
export interface PluginNavigationAPI {
	navigate: (view: string) => void;
	goBack: () => void;
	getCurrentView: () => string;
	registerView: (viewId: string, component: ReactElement) => void;
	unregisterView: (viewId: string) => void;
}

/**
 * Config API provided to plugins
 */
export interface PluginConfigAPI {
	get: <T = unknown>(key: string, defaultValue?: T) => T;
	set: (key: string, value: unknown) => void;
	delete: (key: string) => void;
	getAll: () => Record<string, unknown>;
}

/**
 * Logger API provided to plugins
 */
export interface PluginLoggerAPI {
	debug: (message: string, ...args: unknown[]) => void;
	info: (message: string, ...args: unknown[]) => void;
	warn: (message: string, ...args: unknown[]) => void;
	error: (message: string, ...args: unknown[]) => void;
}

/**
 * Filesystem API provided to plugins (scoped to plugin data directory)
 */
export interface PluginFilesystemAPI {
	readFile: (path: string) => Promise<string>;
	writeFile: (path: string, data: string) => Promise<void>;
	deleteFile: (path: string) => Promise<void>;
	exists: (path: string) => Promise<boolean>;
	listFiles: (path?: string) => Promise<string[]>;
	getDataDir: () => string;
}

/**
 * Audio stream API provided to plugins
 */
export interface PluginAudioAPI {
	transformStreamUrl: (
		url: string,
		track: Track,
	) => Promise<string> | string | null;
	onStreamRequest: (
		handler: (url: string, track: Track) => Promise<string> | string | null,
	) => void;
}

/**
 * Plugin context - API surface provided to plugins
 */
export interface PluginContext {
	// Plugin metadata
	plugin: PluginManifest;

	// API surfaces
	player: PluginPlayerAPI;
	navigation: PluginNavigationAPI;
	config: PluginConfigAPI;
	logger: PluginLoggerAPI;
	filesystem: PluginFilesystemAPI;
	audio: PluginAudioAPI;

	// Event system
	on: <T extends PluginEvent = PluginEvent>(
		eventType: T['type'],
		handler: EventHandler<T>,
	) => void;
	off: <T extends PluginEvent = PluginEvent>(
		eventType: T['type'],
		handler: EventHandler<T>,
	) => void;
	emit: <T extends PluginEvent = PluginEvent>(event: T) => void;

	// Permission system
	hasPermission: (permission: PluginPermission) => boolean;
	requestPermission: (permission: PluginPermission) => Promise<boolean>;

	// Keyboard shortcuts
	registerShortcut: (keys: string[], handler: () => void) => void;
	unregisterShortcut: (keys: string[]) => void;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
	// Called when plugin is loaded
	init?: (context: PluginContext) => Promise<void> | void;

	// Called when plugin is enabled
	enable?: (context: PluginContext) => Promise<void> | void;

	// Called when plugin is disabled
	disable?: (context: PluginContext) => Promise<void> | void;

	// Called when plugin is unloaded/removed
	destroy?: (context: PluginContext) => Promise<void> | void;
}

/**
 * Plugin interface - what a plugin module must export
 */
export interface Plugin extends PluginHooks {
	// Plugin manifest
	manifest: PluginManifest;

	// Lifecycle hooks inherited from PluginHooks
}

/**
 * Plugin instance - runtime representation of a loaded plugin
 */
export interface PluginInstance {
	manifest: PluginManifest;
	plugin: Plugin;
	context: PluginContext;
	config: PluginConfig;
	enabled: boolean;
	loadedAt: number;
}

/**
 * Plugin installation result
 */
export interface PluginInstallResult {
	success: boolean;
	pluginId?: string;
	error?: string;
	message?: string;
}

/**
 * Plugin update result
 */
export interface PluginUpdateResult {
	success: boolean;
	pluginId?: string;
	oldVersion?: string;
	newVersion?: string;
	error?: string;
	message?: string;
}

/**
 * Available plugin info from repository
 */
export interface AvailablePlugin {
	id: string;
	name: string;
	version: string;
	description: string;
	author: string;
	repository: string;
	installUrl: string;
	tags?: string[];
}

/**
 * Plugin repository manifest
 */
export interface PluginRepositoryManifest {
	version: string;
	plugins: AvailablePlugin[];
}
