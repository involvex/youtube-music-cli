// Application constants
export const APP_NAME = '@involvex/youtube-music-cli';
export const APP_VERSION = '0.0.1';

// Config directory
export const CONFIG_DIR =
	process.platform === 'win32'
		? `${process.env['USERPROFILE']}\\.youtube-music-cli`
		: `${process.env['HOME']}/.youtube-music-cli`;

export const CONFIG_FILE = `${CONFIG_DIR}/config.json`;

// View types
export const VIEW = {
	PLAYER: 'player',
	SEARCH: 'search',
	PLAYLISTS: 'playlists',
	ARTIST: 'artist',
	ALBUM: 'album',
	HELP: 'help',
	SUGGESTIONS: 'suggestions',
	SETTINGS: 'settings',
} as const;

// Search types
export const SEARCH_TYPE = {
	ALL: 'all',
	SONGS: 'songs',
	ALBUMS: 'albums',
	ARTISTS: 'artists',
	PLAYLISTS: 'playlists',
} as const;

// Keybindings
export const KEYBINDINGS = {
	// Global
	QUIT: ['q', 'escape'],
	HELP: ['?'],
	SEARCH: ['/'],
	PLAYLISTS: ['p'],
	SUGGESTIONS: ['g'],
	SETTINGS: [','],

	// Player
	PLAY_PAUSE: [' '],
	NEXT: ['n', 'right'],
	PREVIOUS: ['b', 'left'],
	VOLUME_UP: ['=', '+'],
	VOLUME_DOWN: ['-', '_'],
	SHUFFLE: ['s'],
	REPEAT: ['r'],
	SEEK_FORWARD: ['shift+right'],
	SEEK_BACKWARD: ['shift+left'],

	// Navigation
	UP: ['up', 'k'],
	DOWN: ['down', 'j'],
	SELECT: ['enter', 'return'],
	BACK: ['escape'],

	// Search
	CLEAR_SEARCH: ['escape'],
	NEXT_RESULT: ['tab'],
	PREV_RESULT: ['shift+tab'],

	// Playlist
	ADD_TO_PLAYLIST: ['a'],
	REMOVE_FROM_PLAYLIST: ['d'],
	CREATE_PLAYLIST: ['c'],
	DELETE_PLAYLIST: ['D'],
} as const;

// Default volume
export const DEFAULT_VOLUME = 70;

// Queue limits
export const MAX_QUEUE_SIZE = 1000;

// Themes
export const THEMES = {
	DARK: 'dark',
	LIGHT: 'light',
	MIDNIGHT: 'midnight',
	MATRIX: 'matrix',
	CUSTOM: 'custom',
} as const;

// Update intervals
export const PROGRESS_UPDATE_INTERVAL = 100; // ms
export const STATUS_UPDATE_INTERVAL = 1000; // ms

// Default theme
export const DEFAULT_THEME = 'dark' as const;
