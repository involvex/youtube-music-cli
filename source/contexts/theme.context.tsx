// Theme context and provider
import React from 'react';
import {createContext, useContext, useState, useCallback} from 'react';
import {getConfigService} from '../services/config/config.service.ts';
import type {Theme} from '../types/theme.types.ts';

type ThemeContextValue = {
	theme: Theme;
	themeName: string;
	setTheme: (name: string) => void;
	setCustomTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
	const [theme, setThemeState] = useState<Theme>(getConfigService().getTheme());
	const [themeName, setThemeNameState] = useState(
		getConfigService().get('theme') as string,
	);

	const setTheme = useCallback((name: string) => {
		const configService = getConfigService();
		configService.updateTheme(name);
		setThemeNameState(name);
		setThemeState(configService.getTheme());
	}, []);

	const setCustomTheme = useCallback((themeValue: Theme) => {
		const configService = getConfigService();
		configService.setCustomTheme(themeValue);
		setThemeNameState('custom');
		setThemeState(themeValue);
	}, []);

	return (
		<ThemeContext.Provider value={{theme, themeName, setTheme, setCustomTheme}}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider');
	}

	return context;
}
