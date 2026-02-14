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
		inverse: false,
	},
};

export const DEFAULT_THEME = BUILTIN_THEMES.dark;
