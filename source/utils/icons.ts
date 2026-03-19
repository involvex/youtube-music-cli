// Universal icon constants using widely-supported Unicode BMP characters.
// No emoji, no Nerd Font codepoints — renders correctly on any terminal font.

export const ICONS = {
	// Playback controls
	PLAY: '▶', // U+25B6
	PAUSE: '‖', // U+2016
	PLAY_PAUSE_ON: '▶', // when playing
	PLAY_PAUSE_OFF: '‖', // when paused
	NEXT: '▶|', // next track
	PREV: '|◀', // previous track

	// Playback modes
	SHUFFLE: '⇄', // U+21C4
	REPEAT_ALL: '↻', // U+21BB
	REPEAT_ONE: '↺', // U+21BA

	// Navigation / views
	PLAYLIST: '☰', // U+2630
	SEARCH: '/', // ASCII
	HELP: '?', // ASCII

	// Actions
	DOWNLOAD: '↓', // U+2193
	QUIT: '×', // U+00D7
	RESUME: '⟳', // U+27F3
	BG_PLAY: '○', // U+25CB

	// Status
	VOLUME: '♪', // U+266A
	HEART: '♥', // U+2665

	// Autoplay / radio
	AUTOPLAY: '∞', // U+221E
} as const;
