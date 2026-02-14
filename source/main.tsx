// Main application orchestrator
import React from 'react';
import {NavigationProvider} from './stores/navigation.store.tsx';
import MainLayout from './components/layouts/MainLayout.tsx';
import {ThemeProvider} from './contexts/theme.context.tsx';
import {PlayerProvider} from './stores/player.store.tsx';

export default function Main() {
	return (
		<App name="youtube-music-cli">
			<ThemeProvider>
				<PlayerProvider>
					<NavigationProvider>
						<MainLayout />
					</NavigationProvider>
				</PlayerProvider>
			</ThemeProvider>
		</App>
	);
}
