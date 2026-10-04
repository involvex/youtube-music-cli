// Configuration management service
import {CONFIG_DIR, CONFIG_FILE} from '../../utils/constants.ts';
import {
	readFileSync,
	existsSync,
	writeFileSync,
	renameSync,
	unlinkSync,
	readdirSync,
	statSync,
} from 'node:fs';
import {
	writeFile,
	unlink,
	rename,
	mkdir,
	copyFile,
	readdir,
} from 'node:fs/promises';
import type {Config} from '../../types/config.types.ts';
import {BUILTIN_THEMES, DEFAULT_THEME} from '../../config/themes.config.ts';
import type {Theme} from '../../types/theme.types.ts';
import {formatError} from '../../utils/error.ts';
import path from 'node:path';
import {refreshKeybindings} from '../../utils/keybinding-resolver.ts';

const MAX_BACKUPS = 5;
const BACKUP_DIR = CONFIG_DIR;
const BACKUP_PREFIX = 'config.json.bak.';

class ConfigService {
	private configPath: string;
	private configDir: string;
	private config: Config;
	private saveLock = Promise.resolve();
	private legacyFavoriteIds: string[] = [];

	constructor() {
		this.configDir = CONFIG_DIR;
		this.configPath = CONFIG_FILE;
		this.config = this.load() || this.getDefaultConfig();
		if (this.legacyFavoriteIds.length > 0) {
			void this.saveAsync();
		}
	}

	getDefaultConfig(): Config {
		return {
			theme: 'dark',
			volume: 70,
			keybindings: {},
			playlists: [],
			history: [],
			searchHistory: [],
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
			preferLocalPlayback: true,
			showNetworkStatus: true,
			subtitlesEnabled: false,
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
			maxHistoryEntries: 2000,
			cacheTtlMinutes: 5,
			cacheMaxEntries: 100,
		};
	}

	load(): Config | null {
		try {
			if (!existsSync(this.configPath)) {
				return null;
			}

			const data = readFileSync(this.configPath, 'utf-8');
			const parsed = JSON.parse(data) as Record<string, unknown>;

			if (Array.isArray(parsed['favorites'])) {
				this.legacyFavoriteIds = parsed['favorites'].filter(
					(id): id is string => typeof id === 'string' && id.length > 0,
				);
				delete parsed['favorites'];
			}

			return {...this.getDefaultConfig(), ...(parsed as unknown as Config)};
		} catch (error) {
			console.error(
				'Failed to load config, attempting recovery:',
				formatError(error),
			);
			const recovered = this.tryRecoverFromBackup();
			if (recovered) {
				console.log('Successfully recovered config from backup');
				return recovered;
			}
			return null;
		}
	}

	private tryRecoverFromBackup(): Config | null {
		try {
			if (!existsSync(BACKUP_DIR)) return null;

			const files = readdirSync(BACKUP_DIR)
				.filter(f => f.startsWith(BACKUP_PREFIX))
				.map(f => ({file: f, time: statSync(path.join(BACKUP_DIR, f)).mtimeMs}))
				.sort((a, b) => b.time - a.time);

			for (const {file} of files) {
				try {
					const backupPath = path.join(BACKUP_DIR, file);
					const data = readFileSync(backupPath, 'utf-8');
					const parsed = JSON.parse(data) as Record<string, unknown>;

					if (Array.isArray(parsed['favorites'])) {
						this.legacyFavoriteIds = parsed['favorites'].filter(
							(id): id is string => typeof id === 'string' && id.length > 0,
						);
						delete parsed['favorites'];
					}

					console.log(`Recovered config from backup: ${file}`);
					return {...this.getDefaultConfig(), ...(parsed as unknown as Config)};
				} catch {
					continue;
				}
			}
		} catch {
			// Ignore recovery errors
		}
		return null;
	}

	private async createBackup(): Promise<void> {
		if (!existsSync(this.configPath)) return;

		try {
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const backupName = `${BACKUP_PREFIX}${timestamp}`;
			const backupPath = path.join(BACKUP_DIR, backupName);
			await copyFile(this.configPath, backupPath);

			// Clean old backups
			await this.cleanOldBackups();
		} catch {
			// Ignore backup errors - not critical
		}
	}

	private async cleanOldBackups(): Promise<void> {
		try {
			const files = await readdir(BACKUP_DIR);
			const backups = files
				.filter(f => f.startsWith(BACKUP_PREFIX))
				.map(async f => ({
					file: f,
					time: (await statSync(path.join(BACKUP_DIR, f))).mtimeMs,
				}));

			const resolved = await Promise.all(backups);
			resolved.sort((a, b) => b.time - a.time);

			for (const backup of resolved.slice(MAX_BACKUPS)) {
				try {
					await unlink(path.join(BACKUP_DIR, backup.file));
				} catch {
					// Ignore
				}
			}
		} catch {
			// Ignore
		}
	}

	consumeLegacyFavoriteIds(): string[] {
		const ids = [...this.legacyFavoriteIds];
		this.legacyFavoriteIds = [];
		return ids;
	}

	save(): void {
		void this.saveAsync();
	}

	private async saveAsync(): Promise<void> {
		const currentLock = this.saveLock;
		let releaseLock: () => void = () => {};
		const newLock = new Promise<void>(resolve => {
			releaseLock = resolve;
		});
		this.saveLock = newLock;

		await currentLock.catch(() => {});

		try {
			if (!existsSync(this.configDir)) {
				await mkdir(this.configDir, {recursive: true});
			}

			// Create backup before writing
			await this.createBackup();

			const tempFile = `${this.configPath}.tmp`;
			await writeFile(tempFile, JSON.stringify(this.config, null, 2), 'utf8');

			// Atomic rename - works on Windows since Node 10+
			// On Windows, if target exists and is locked, remove first then rename
			let attempts = 0;
			const maxAttempts = 3;
			while (true) {
				try {
					await rename(tempFile, this.configPath);
					break;
				} catch (error: unknown) {
					const err = error as NodeJS.ErrnoException;
					attempts++;
					if (attempts >= maxAttempts || !isRetryableError(err)) {
						throw error;
					}
					// On retry, try removing target first (Windows file locking)
					try {
						if (existsSync(this.configPath)) {
							await unlink(this.configPath);
						}
					} catch {
						// Ignore unlink errors during retry
					}
					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, 50 * attempts));
				}
			}
		} catch (error) {
			console.error('Failed to save config:', formatError(error));
		} finally {
			releaseLock();
		}
	}

	get<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

	set<K extends keyof Config>(key: K, value: Config[K]): void {
		this.config[key] = value;
		this.save();
	}

	setSync<K extends keyof Config>(key: K, value: Config[K]): void {
		this.config[key] = value;
		// Write synchronously for critical operations
		const tempFile = `${this.configPath}.tmp`;
		writeFileSync(tempFile, JSON.stringify(this.config, null, 2), 'utf8');

		// Atomic rename with retry on Windows
		let attempts = 0;
		const maxAttempts = 3;
		while (true) {
			try {
				renameSync(tempFile, this.configPath);
				break;
			} catch (error: unknown) {
				const err = error as NodeJS.ErrnoException;
				attempts++;
				if (attempts >= maxAttempts || !isRetryableError(err)) {
					throw error;
				}
				// On retry, try removing target first (Windows file locking)
				try {
					if (existsSync(this.configPath)) {
						unlinkSync(this.configPath);
					}
				} catch {
					// Ignore
				}
				// Small delay
				Atomics.wait(
					new Int32Array(new SharedArrayBuffer(4)),
					0,
					0,
					50 * attempts,
				);
			}
		}
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
		refreshKeybindings();
		this.save();
	}

	clearKeybinding(action: string): void {
		delete this.config.keybindings[action];
		refreshKeybindings();
		this.save();
	}

	resetKeybindingsForTests(): void {
		this.config.keybindings = {};
		refreshKeybindings();
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

	setLLMApiKey(apiKey: string): void {
		this.config.llm = {
			...this.config.llm,
			apiKey,
		};
		this.save();
	}

	getLLMApiKey(): string | undefined {
		return this.config.llm?.apiKey;
	}

	setLLMEnabled(enabled: boolean): void {
		this.config.llmEnabled = enabled;
		this.save();
	}

	getLLMEnabled(): boolean {
		return this.config.llmEnabled ?? false;
	}

	getLLMConfig():
		| {
				provider?: 'gemini' | 'openai' | 'anthropic' | 'custom';
				apiKey?: string;
				model?: string;
				temperature?: number;
				maxTokens?: number;
				maxMessagesInContext?: number;
				baseUrl?: string;
				endpoint?: string;
		  }
		| undefined {
		return this.config.llm;
	}

	setLLMConfig(config: {
		provider?: 'gemini' | 'openai' | 'anthropic' | 'custom';
		apiKey?: string;
		model?: string;
		temperature?: number;
		maxTokens?: number;
		maxMessagesInContext?: number;
		baseUrl?: string;
		endpoint?: string;
	}): void {
		this.config.llm = config;
		this.save();
	}

	setProxy(proxy: string | undefined): void {
		this.config.proxy = proxy;
		this.save();
	}

	getProxy(): string | undefined {
		return this.config.proxy;
	}
}

// Check if error is retryable (file locking issues on Windows)
function isRetryableError(err: NodeJS.ErrnoException): boolean {
	return err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'EACCES';
}

// Singleton instance
let configServiceInstance: ConfigService | null = null;

export function getConfigService(): ConfigService {
	if (!configServiceInstance) {
		configServiceInstance = new ConfigService();
	}

	return configServiceInstance;
}
