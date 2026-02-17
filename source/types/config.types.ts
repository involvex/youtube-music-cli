// Configuration type definitions
import type {Playlist} from './youtube-music.types.ts';
import type {Theme} from './theme.types.ts';

export type RepeatMode = 'off' | 'all' | 'one';

export interface KeybindingConfig {
	keys: string[];
	description: string;
}

export interface Config {
	theme: 'dark' | 'light' | 'midnight' | 'matrix' | 'custom';
	volume: number;
	keybindings: Record<string, KeybindingConfig>;
	playlists: Playlist[];
	history: string[];
	favorites: string[];
	repeat: RepeatMode;
	shuffle: boolean;
	customTheme?: Theme;
	streamQuality?: 'low' | 'medium' | 'high';
}
