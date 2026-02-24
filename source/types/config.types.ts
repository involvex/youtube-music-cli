// Configuration type definitions
import type {Playlist} from './youtube-music.types.ts';
import type {Theme} from './theme.types.ts';
import type {WebServerConfig} from './web.types.ts';

export type RepeatMode = 'off' | 'all' | 'one';
export type DownloadFormat = 'mp3' | 'm4a';
export type EqualizerPreset =
	| 'flat'
	| 'bass_boost'
	| 'vocal'
	| 'bright'
	| 'warm';

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
	favorites: string[];
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
	downloadsEnabled?: boolean;
	downloadDirectory?: string;
	downloadFormat?: DownloadFormat;
	webServer?: WebServerConfig;
	backgroundPlayback?: {
		enabled: boolean;
		ipcPath?: string;
		currentUrl?: string;
		timestamp?: string;
	};
	lastVersionCheck?: string;
}
