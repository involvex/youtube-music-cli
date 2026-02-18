// Main application orchestrator
import {NavigationProvider} from './stores/navigation.store.tsx';
import {PluginsProvider} from './stores/plugins.store.tsx';
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
	const {play} = usePlayer();
	const {getTrack, getPlaylist} = useYouTubeMusic();

	useEffect(() => {
		if (flags?.showSuggestions) {
			dispatch({category: 'NAVIGATE', view: VIEW.SUGGESTIONS});
		} else if (flags?.searchQuery) {
			dispatch({category: 'NAVIGATE', view: VIEW.SEARCH});
			dispatch({category: 'SET_SEARCH_QUERY', query: flags.searchQuery});
		} else if (flags?.playTrack) {
			void getTrack(flags.playTrack).then(track => {
				if (track) play(track);
			});
		} else if (flags?.playPlaylist) {
			dispatch({category: 'NAVIGATE', view: VIEW.PLAYLISTS});
			void getPlaylist(flags.playPlaylist).then(playlist => {
				// For now just navigate, but we could auto-play
				if (playlist) {
					dispatch({category: 'SET_SELECTED_PLAYLIST', index: 0});
				}
			});
		}
	}, [flags, dispatch, play, getTrack, getPlaylist]);

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
						<PluginsProvider>
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
						</PluginsProvider>
					</NavigationProvider>
				</PlayerProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
