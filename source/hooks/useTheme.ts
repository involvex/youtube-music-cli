// Theme management hook
import {
	ThemeContext,
	type ThemeContextValue,
} from '../contexts/theme.context.tsx';
import {useContext} from 'react';

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider');
	}

	return context;
}
