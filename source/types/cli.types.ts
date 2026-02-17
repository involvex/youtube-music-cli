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
	headless?: boolean;
	action?: 'pause' | 'resume' | 'next' | 'previous';
}
