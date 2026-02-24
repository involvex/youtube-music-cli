// Configuration management service
import {CONFIG_DIR, CONFIG_FILE} from '../../utils/constants.ts';
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import type {Config} from '../../types/config.types.ts';
import {BUILTIN_THEMES, DEFAULT_THEME} from '../../config/themes.config.ts';
import type {Theme} from '../../types/theme.types.ts';
import path from 'node:path';

class ConfigService {
	private configPath: string;
	private configDir: string;
	private config: Config;

	constructor() {
		this.configDir = CONFIG_DIR;
		this.configPath = CONFIG_FILE;
		this.config = this.load() || this.getDefaultConfig();
	}

	getDefaultConfig(): Config {
		return {
			theme: 'dark',
			volume: 70,
			keybindings: {},
			playlists: [],
			history: [],
			searchHistory: [],
			favorites: [],
			repeat: 'off',
			shuffle: false,
			customTheme: undefined,
			streamQuality: 'high',
			audioNormalization: false,
			notifications: false,
			discordRichPresence: false,
			downloadsEnabled: false,
			downloadDirectory: path.join(CONFIG_DIR, 'downloads'),
			downloadFormat: 'mp3',
			webServer: {
				enabled: false,
				host: 'localhost',
				port: 8080,
				enableCors: true,
				allowedOrigins: ['*'],
				auth: {
					enabled: false,
				},
			},
			gaplessPlayback: true,
			crossfadeDuration: 0,
			volumeFadeDuration: 0,
			equalizerPreset: 'flat',
		};
	}

	load(): Config | null {
		try {
			if (!existsSync(this.configPath)) {
				return null;
			}

			const data = readFileSync(this.configPath, 'utf-8');
			const config = JSON.parse(data) as Config;

			// Merge with defaults to handle new fields
			return {...this.getDefaultConfig(), ...config};
		} catch {
			return null;
		}
	}

	save(): void {
		try {
			// Ensure config directory exists
			if (!existsSync(this.configDir)) {
				mkdirSync(this.configDir, {recursive: true});
			}

			writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
		} catch (error) {
			console.error('Failed to save config:', error);
		}
	}

	get<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

	set<K extends keyof Config>(key: K, value: Config[K]): void {
		this.config[key] = value;
		this.save();
	}

	updateTheme(themeName: string): void {
		this.config.theme = themeName as
			| 'dark'
			| 'light'
			| 'midnight'
			| 'matrix'
			| 'dracula'
			| 'nord'
			| 'solarized'
			| 'catppuccin'
			| 'custom';
		this.save();
	}

	getTheme(): Theme {
		if (this.config.theme === 'custom' && this.config.customTheme) {
			return this.config.customTheme;
		}

		const builtinTheme = BUILTIN_THEMES[this.config.theme];
		if (builtinTheme) {
			return builtinTheme;
		}
		return DEFAULT_THEME;
	}

	setCustomTheme(theme: Theme): void {
		this.config.customTheme = theme;
		this.config.theme = 'custom';
		this.save();
	}

	getKeybinding(action: string): string[] | undefined {
		return this.config.keybindings[action]?.keys;
	}

	setKeybinding(action: string, keys: string[]): void {
		this.config.keybindings[action] = {
			keys,
			description: `Custom binding for ${action}`,
		};
		this.save();
	}

	addToHistory(trackId: string): void {
		// Add to front of history, limit to 1000
		this.config.history = [
			trackId,
			...this.config.history.filter(id => id !== trackId),
		].slice(0, 1000);
		this.save();
	}

	getHistory(): string[] {
		return this.config.history;
	}

	addToSearchHistory(query: string): void {
		const trimmed = query.trim();
		if (!trimmed) return;
		this.config.searchHistory = [
			trimmed,
			...(this.config.searchHistory ?? []).filter(q => q !== trimmed),
		].slice(0, 100);
		this.save();
	}

	getSearchHistory(): string[] {
		return this.config.searchHistory ?? [];
	}

	addFavorite(trackId: string): void {
		if (!this.config.favorites.includes(trackId)) {
			this.config.favorites.push(trackId);
			this.save();
		}
	}

	removeFavorite(trackId: string): void {
		this.config.favorites = this.config.favorites.filter(id => id !== trackId);
		this.save();
	}

	isFavorite(trackId: string): boolean {
		return this.config.favorites.includes(trackId);
	}

	getFavorites(): string[] {
		return this.config.favorites;
	}

	setBackgroundPlaybackState(state: {
		ipcPath: string;
		currentUrl: string;
	}): void {
		this.config.backgroundPlayback = {
			enabled: true,
			ipcPath: state.ipcPath,
			currentUrl: state.currentUrl,
			timestamp: new Date().toISOString(),
		};
		this.save();
	}

	getBackgroundPlaybackState():
		| {enabled: true; ipcPath: string; currentUrl: string; timestamp: string}
		| {enabled: false} {
		if (this.config.backgroundPlayback?.enabled) {
			return {
				enabled: true,
				ipcPath: this.config.backgroundPlayback.ipcPath!,
				currentUrl: this.config.backgroundPlayback.currentUrl!,
				timestamp: this.config.backgroundPlayback.timestamp!,
			};
		}
		return {enabled: false};
	}

	clearBackgroundPlaybackState(): void {
		this.config.backgroundPlayback = undefined;
		this.save();
	}

	setLastVersionCheck(timestamp: string): void {
		this.config.lastVersionCheck = timestamp;
		this.save();
	}

	getLastVersionCheck(): string | undefined {
		return this.config.lastVersionCheck;
	}
}

// Singleton instance
let configServiceInstance: ConfigService | null = null;

export function getConfigService(): ConfigService {
	if (!configServiceInstance) {
		configServiceInstance = new ConfigService();
	}

	return configServiceInstance;
}
