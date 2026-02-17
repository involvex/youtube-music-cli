// Main application orchestrator
import React from 'react';
import {NavigationProvider} from './stores/navigation.store.tsx';
import MainLayout from './components/layouts/MainLayout.tsx';
import {ThemeProvider} from './contexts/theme.context.tsx';
import {PlayerProvider} from './stores/player.store.tsx';
import {ErrorBoundary} from './components/common/ErrorBoundary.tsx';
import {Box} from 'ink';
import type {Flags} from './types/cli.types.ts';
import {useEffect} from 'react';
import {useNavigation} from './hooks/useNavigation.ts';
import {VIEW} from './utils/constants.ts';

function Initializer({flags}: {flags?: Flags}) {
	const {dispatch} = useNavigation();

	useEffect(() => {
		if (flags?.showSuggestions) {
			dispatch({category: 'NAVIGATE', view: VIEW.SUGGESTIONS});
		} else if (flags?.searchQuery) {
			dispatch({category: 'NAVIGATE', view: VIEW.SEARCH});
			dispatch({category: 'SET_SEARCH_QUERY', query: flags.searchQuery});
		}
		// Handle other flags...
	}, [flags, dispatch]);

	return null;
}

export default function Main({flags}: {flags?: Flags}) {
	return (
		<ErrorBoundary>
			<Box>
				<ThemeProvider>
					<PlayerProvider>
						<NavigationProvider>
							<>
								<Initializer flags={flags} />
								<MainLayout />
							</>
						</NavigationProvider>
					</PlayerProvider>
				</ThemeProvider>
			</Box>
		</ErrorBoundary>
	);
}
