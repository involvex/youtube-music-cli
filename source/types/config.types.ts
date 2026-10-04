// Configuration type definitions
import type {Playlist} from './youtube-music.types.ts';
import type {Theme} from './theme.types.ts';
import type {WebServerConfig} from './web.types.ts';
import type {LLMConfig, LLMUsage, ChatMessage} from './llm.types.ts';

export type RepeatMode = 'off' | 'all' | 'one';
export type DownloadFormat = 'mp3' | 'm4a';
export type EqualizerPreset =
	'flat' | 'bass_boost' | 'vocal' | 'bright' | 'warm';
export type CookiesFromBrowser = 'chrome' | 'firefox' | 'edge' | 'brave';

export interface KeybindingConfig {
	keys: string[];
	description: string;
}

export interface Config {
	theme:
		| 'dark'
		| 'light'
		| 'midnight'
		| 'matrix'
		| 'dracula'
		| 'nord'
		| 'solarized'
		| 'catppuccin'
		| 'custom';
	volume: number;
	keybindings: Record<string, KeybindingConfig>;
	playlists: Playlist[];
	history: string[];
	searchHistory: string[];
	repeat: RepeatMode;
	shuffle: boolean;
	customTheme?: Theme;
	streamQuality?: 'low' | 'medium' | 'high';
	audioNormalization?: boolean;
	gaplessPlayback?: boolean;
	crossfadeDuration?: number;
	volumeFadeDuration?: number;
	equalizerPreset?: EqualizerPreset;
	notifications?: boolean;
	scrobbling?: {
		lastfm?: {
			apiKey?: string;
			sessionKey?: string;
		};
		listenbrainz?: {
			token?: string;
		};
	};
	discordRichPresence?: boolean;
	proxy?: string;
	/** Netscape cookies.txt for yt-dlp (preferred over cookiesFromBrowser). */
	cookiesFile?: string;
	/** Browser profile for yt-dlp --cookies-from-browser (Edge recommended on Windows). */
	cookiesFromBrowser?: CookiesFromBrowser;
	/** Cap for persisted listening history entries (default 2000). */
	maxHistoryEntries?: number;
	/** Search/suggestions API cache TTL in minutes (default 5). */
	cacheTtlMinutes?: number;
	/** Max entries per shared API cache (default 100). */
	cacheMaxEntries?: number;
	downloadsEnabled?: boolean;
	downloadDirectory?: string;
	downloadFormat?: DownloadFormat;
	/** Prefer on-disk downloads over YouTube when a local file exists (default true). */
	preferLocalPlayback?: boolean;
	/** Show network status indicator in UI (default true). */
	showNetworkStatus?: boolean;
	subtitlesEnabled?: boolean;
	webServer?: WebServerConfig;
	backgroundPlayback?: {
		enabled: boolean;
		ipcPath?: string;
		currentUrl?: string;
		timestamp?: string;
	};
	lastVersionCheck?: string;
	logFilePath?: string;
	llmEnabled?: boolean;
	llm?: LLMConfig;
	llmUsage?: LLMUsage;
	llmChatHistory?: ChatMessage[];
}
