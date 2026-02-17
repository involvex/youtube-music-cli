// Main application orchestrator
import React from 'react';
import {NavigationProvider} from './stores/navigation.store.tsx';
import MainLayout from './components/layouts/MainLayout.tsx';
import {ThemeProvider} from './contexts/theme.context.tsx';
import {PlayerProvider} from './stores/player.store.tsx';
import {ErrorBoundary} from './components/common/ErrorBoundary.tsx';
import {KeyboardManager} from './hooks/useKeyboard.ts';
import {Box, Text} from 'ink';
import type {Flags} from './types/cli.types.ts';
import {useEffect} from 'react';
import {useNavigation} from './hooks/useNavigation.ts';
import {usePlayer} from './hooks/usePlayer.ts';
import {useYouTubeMusic} from './hooks/useYouTubeMusic.ts';
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

function HeadlessLayout({flags}: {flags?: Flags}) {
	const {play, pause, resume, next, previous} = usePlayer();
	const {getTrack} = useYouTubeMusic();

	useEffect(() => {
		if (flags?.playTrack) {
			void getTrack(flags.playTrack).then(track => {
				if (track) play(track);
			});
		}

		if (flags?.action === 'pause') pause();
		if (flags?.action === 'resume') resume();
		if (flags?.action === 'next') next();
		if (flags?.action === 'previous') previous();
	}, [flags, play, pause, resume, next, previous, getTrack]);

	return (
		<Box padding={1}>
			<Text color="green">Headless mode active.</Text>
		</Box>
	);
}

export default function Main({flags}: {flags?: Flags}) {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<PlayerProvider>
					<NavigationProvider>
						<Box flexDirection="column">
							<KeyboardManager />
							{flags?.headless ? (
								<HeadlessLayout flags={flags} />
							) : (
								<>
									<Initializer flags={flags} />
									<MainLayout />
								</>
							)}
						</Box>
					</NavigationProvider>
				</PlayerProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
