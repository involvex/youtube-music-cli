// Plugin loader service - loads, validates, and manages plugin lifecycle
import type {
	Plugin,
	PluginManifest,
	PluginInstance,
	PluginContext,
} from '../../types/plugin.types.ts';
import {logger} from '../logger/logger.service.ts';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createJiti} from 'jiti';

/**
 * Validate plugin manifest
 */
function validateManifest(manifest: unknown): manifest is PluginManifest {
	if (typeof manifest !== 'object' || manifest === null) {
		return false;
	}

	const m = manifest as Record<string, unknown>;

	return (
		typeof m['id'] === 'string' &&
		typeof m['name'] === 'string' &&
		typeof m['version'] === 'string' &&
		typeof m['description'] === 'string' &&
		typeof m['author'] === 'string' &&
		typeof m['main'] === 'string' &&
		Array.isArray(m['permissions'])
	);
}

/**
 * Plugin loader service - handles dynamic loading of plugins
 */
class PluginLoaderService {
	private jiti: ReturnType<typeof createJiti>;

	constructor() {
		// Initialize jiti for dynamic TypeScript loading
		this.jiti = createJiti(import.meta.url, {
			interopDefault: true,
			requireCache: false,
		});
	}

	/**
	 * Load a plugin from a directory
	 */
	async loadPlugin(pluginPath: string): Promise<PluginInstance> {
		logger.info('PluginLoaderService', `Loading plugin from ${pluginPath}`);

		// Load and validate manifest
		const manifestPath = join(pluginPath, 'plugin.json');
		if (!existsSync(manifestPath)) {
			throw new Error(`Plugin manifest not found: ${manifestPath}`);
		}

		const manifestData = readFileSync(manifestPath, 'utf-8');
		const manifest = JSON.parse(manifestData) as unknown;

		if (!validateManifest(manifest)) {
			throw new Error(`Invalid plugin manifest: ${manifestPath}`);
		}

		logger.debug(
			'PluginLoaderService',
			`Validated manifest for ${manifest.name} v${manifest.version}`,
		);

		// Load plugin module
		const pluginEntryPath = join(pluginPath, manifest.main);
		if (!existsSync(pluginEntryPath)) {
			throw new Error(`Plugin entry point not found: ${pluginEntryPath}`);
		}

		let pluginModule: unknown;
		try {
			// Use jiti to load TypeScript/JavaScript module
			pluginModule = await this.jiti.import(pluginEntryPath);
		} catch (error) {
			logger.error(
				'PluginLoaderService',
				`Failed to load plugin module:`,
				error,
			);
			throw new Error(
				`Failed to load plugin from ${pluginEntryPath}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Validate plugin module
		if (!this.isValidPlugin(pluginModule)) {
			throw new Error(`Invalid plugin module: ${pluginEntryPath}`);
		}

		const plugin = pluginModule as Plugin;

		// Verify manifest consistency
		if (plugin.manifest.id !== manifest.id) {
			logger.warn(
				'PluginLoaderService',
				`Plugin manifest ID mismatch: ${plugin.manifest.id} vs ${manifest.id}`,
			);
		}

		logger.info(
			'PluginLoaderService',
			`Successfully loaded plugin: ${manifest.name} v${manifest.version}`,
		);

		// Create plugin instance (context will be injected later)
		const instance: PluginInstance = {
			manifest,
			plugin,
			// Note: Context is set by plugin registry
			context: null as unknown as PluginContext,
			config: {
				enabled: false,
				config: {},
				permissions: {},
			},
			enabled: false,
			loadedAt: Date.now(),
		};

		return instance;
	}

	/**
	 * Validate plugin module structure
	 */
	private isValidPlugin(module: unknown): boolean {
		if (typeof module !== 'object' || module === null) {
			return false;
		}

		const m = module as Record<string, unknown>;

		// Must have manifest
		if (!m['manifest'] || typeof m['manifest'] !== 'object') {
			return false;
		}

		// Optional lifecycle hooks must be functions if present
		if (m['init'] && typeof m['init'] !== 'function') {
			return false;
		}

		if (m['enable'] && typeof m['enable'] !== 'function') {
			return false;
		}

		if (m['disable'] && typeof m['disable'] !== 'function') {
			return false;
		}

		if (m['destroy'] && typeof m['destroy'] !== 'function') {
			return false;
		}

		return true;
	}

	/**
	 * Call plugin lifecycle hook safely
	 */
	async callHook(
		plugin: Plugin,
		hook: 'init' | 'enable' | 'disable' | 'destroy',
		context: PluginInstance['context'],
	): Promise<void> {
		const hookFn = plugin[hook];
		if (!hookFn) {
			logger.debug(
				'PluginLoaderService',
				`Plugin ${plugin.manifest.name} has no ${hook} hook`,
			);
			return;
		}

		try {
			logger.debug(
				'PluginLoaderService',
				`Calling ${hook} hook for ${plugin.manifest.name}`,
			);
			await Promise.resolve(hookFn(context));
			logger.debug(
				'PluginLoaderService',
				`${hook} hook completed for ${plugin.manifest.name}`,
			);
		} catch (error) {
			logger.error(
				'PluginLoaderService',
				`Error in ${hook} hook for ${plugin.manifest.name}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Reload a plugin (useful for development)
	 */
	async reloadPlugin(pluginPath: string): Promise<PluginInstance> {
		logger.info('PluginLoaderService', `Reloading plugin from ${pluginPath}`);

		// Clear jiti cache for this plugin
		// Note: jiti has requireCache: false, so this should work automatically
		return this.loadPlugin(pluginPath);
	}
}

// Singleton instance
let instance: PluginLoaderService | null = null;

/**
 * Get the plugin loader service singleton
 */
export function getPluginLoaderService(): PluginLoaderService {
	if (!instance) {
		instance = new PluginLoaderService();
	}
	return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetPluginLoaderService(): void {
	instance = null;
}
