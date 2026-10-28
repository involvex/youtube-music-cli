// Built-in theme definitions
import type {Theme} from '../types/theme.types.ts';

export const BUILTIN_THEMES: Record<string, Theme> = {
	dark: {
		name: 'Dark',
		colors: {
			primary: 'cyan',
			secondary: 'blue',
			background: 'black',
			text: 'white',
			accent: 'yellow',
			dim: 'gray',
			error: 'red',
			success: 'green',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#22d3ee',
			peak: '#fbbf24',
			upcoming: '#dcdfe4',
		},
		inverse: false,
	},
	light: {
		name: 'Light',
		colors: {
			primary: 'blue',
			secondary: 'cyan',
			background: 'white',
			text: 'black',
			accent: 'magenta',
			dim: 'gray',
			error: 'red',
			success: 'green',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#2563eb',
			peak: '#db2777',
			upcoming: '#111827',
		},
		inverse: false,
	},
	midnight: {
		name: 'Midnight',
		colors: {
			primary: 'magenta',
			secondary: 'purple',
			background: 'black',
			text: 'white',
			accent: 'cyan',
			dim: 'gray',
			error: 'red',
			success: 'greenBright',
			warning: 'yellowBright',
		},
		karaoke: {
			sung: '#c084fc',
			peak: '#22d3ee',
			upcoming: '#e2e8f0',
		},
		inverse: false,
	},
	matrix: {
		name: 'Matrix',
		colors: {
			primary: 'green',
			secondary: 'greenBright',
			background: 'black',
			text: 'white',
			accent: 'greenBright',
			dim: 'green',
			error: 'red',
			success: 'greenBright',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#16a34a',
			peak: '#4ade80',
			upcoming: '#bbf7d0',
		},
		inverse: false,
	},
	dracula: {
		name: 'Dracula',
		colors: {
			primary: 'magenta',
			secondary: 'cyan',
			background: 'black',
			text: 'white',
			accent: 'yellow',
			dim: 'gray',
			error: 'red',
			success: 'green',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#bd93f9',
			peak: '#f1fa8c',
			upcoming: '#f8f8f2',
		},
		inverse: false,
	},
	nord: {
		name: 'Nord',
		colors: {
			primary: 'blue',
			secondary: 'cyan',
			background: 'black',
			text: 'white',
			accent: 'blueBright',
			dim: 'gray',
			error: 'red',
			success: 'greenBright',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#81a1c1',
			peak: '#88c0d0',
			upcoming: '#eceff4',
		},
		inverse: false,
	},
	solarized: {
		name: 'Solarized',
		colors: {
			primary: 'cyan',
			secondary: 'blue',
			background: 'black',
			text: 'white',
			accent: 'yellow',
			dim: 'gray',
			error: 'red',
			success: 'green',
			warning: 'magenta',
		},
		karaoke: {
			sung: '#268bd2',
			peak: '#b58900',
			upcoming: '#eee8d5',
		},
		inverse: false,
	},
	catppuccin: {
		name: 'Catppuccin',
		colors: {
			primary: 'magenta',
			secondary: 'blue',
			background: 'black',
			text: 'white',
			accent: 'cyan',
			dim: 'gray',
			error: 'red',
			success: 'green',
			warning: 'yellow',
		},
		karaoke: {
			sung: '#cba6f7',
			peak: '#94e2d5',
			upcoming: '#cdd6f4',
		},
		inverse: false,
	},
};

export const DEFAULT_THEME: Theme = BUILTIN_THEMES['dark'] as Theme;

/** Builtin theme ids for Settings cycling (excludes `custom`). */
export const BUILTIN_THEME_IDS: string[] = Object.keys(BUILTIN_THEMES);

export function nextBuiltinThemeId(current: string): string {
	const index = BUILTIN_THEME_IDS.indexOf(current);
	const nextIndex = index === -1 ? 0 : (index + 1) % BUILTIN_THEME_IDS.length;
	return BUILTIN_THEME_IDS[nextIndex] ?? 'dark';
}

export function formatThemeLabel(themeId: string): string {
	const theme = BUILTIN_THEMES[themeId];
	if (theme?.name) {
		return theme.name;
	}
	if (themeId === 'custom') {
		return 'Custom';
	}
	return themeId;
}
