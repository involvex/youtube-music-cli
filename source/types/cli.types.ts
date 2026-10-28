// CLI flag types
import type {RadioSeed} from './radio.types.ts';

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
	radioSeed?: RadioSeed;
	// Playlist import flags
	importSource?: 'spotify' | 'youtube';
	importUrl?: string;
	importName?: string;
	// Web server flags
	web?: boolean;
	host?: string;
	port?: number;
	webOnly?: boolean;
	webAuth?: string;
	// Windows immersive mode flag
	win32?: boolean;
	// Logs command flags
	open?: boolean;
	getPath?: boolean;
	setPath?: string;
	// Config doctor flags
	fix?: boolean;
	// Verbose logging flag
	verbose?: boolean;
	// Stats command flags
	share?: boolean;
	export?: string | boolean;
	// Config backup flags
	backupCompress?: boolean;
	backupList?: boolean;
	backupRestore?: string;
	backupClean?: boolean;
	backupKeep?: number;
	backupDryRun?: boolean;
	backupIncludeLogs?: boolean;
	backupForce?: boolean;
}
