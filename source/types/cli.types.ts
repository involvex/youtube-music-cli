// CLI flag types
export interface Flags {
	help?: boolean;
	version?: boolean;
	theme?: string;
	volume?: number;
	shuffle?: boolean;
	repeat?: string;
	playTrack?: string;
	searchQuery?: string;
	playPlaylist?: string;
	showSuggestions?: boolean;
	continue?: boolean;
	headless?: boolean;
	action?: 'pause' | 'resume' | 'next' | 'previous';
	// Playlist import flags
	importSource?: 'spotify' | 'youtube';
	importUrl?: string;
	importName?: string;
	// Web server flags
	web?: boolean;
	webHost?: string;
	webPort?: number;
	webOnly?: boolean;
	webAuth?: string;
}
