// Main application orchestrator
import {NavigationProvider} from './stores/navigation.store.tsx';
import {PluginsProvider} from './stores/plugins.store.tsx';
import MainLayout from './components/layouts/MainLayout.tsx';
import {ThemeProvider} from './contexts/theme.context.tsx';
import {PlayerProvider} from './stores/player.store.tsx';
import {ErrorBoundary} from './components/common/ErrorBoundary.tsx';
import {KeyboardManager} from './hooks/useKeyboard.ts';
import {KeyboardBlockProvider} from './hooks/useKeyboardBlocker.tsx';
import {Box, Text} from 'ink';
import type {Flags} from './types/cli.types.ts';
import {useEffect} from 'react';
import {useNavigation} from './hooks/useNavigation.ts';
import {usePlayer} from './hooks/usePlayer.ts';
import {useYouTubeMusic} from './hooks/useYouTubeMusic.ts';
import {VIEW} from './utils/constants.ts';
import {getConfigService} from './services/config/config.service.ts';
import {getNotificationService} from './services/notification/notification.service.ts';
import type {Track} from './types/youtube-music.types.ts';

function Initializer({flags}: {flags?: Flags}) {
	const {dispatch} = useNavigation();
	const {play} = usePlayer();
	const {getTrack, getPlaylist} = useYouTubeMusic();

	useEffect(() => {
		// Check for background playback state on startup
		const config = getConfigService();
		const backgroundState = config.getBackgroundPlaybackState();

		if (backgroundState.enabled) {
			// Show notification about background playback
			const notification = getNotificationService();
			notification.setEnabled(true);
			void notification.notify(
				'Background Playback Active',
				'Press Shift+R to resume control',
			);
		}

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
	const {getTrack, getPlaylist, search} = useYouTubeMusic();

	useEffect(() => {
		void (async () => {
			if (flags?.playTrack) {
				const track = await getTrack(flags.playTrack);
				if (!track) {
					console.error(`Track not found: ${flags.playTrack}`);
					process.exitCode = 1;
					return;
				}

				play(track);
				console.log(`Playing: ${track.title}`);
				return;
			}

			if (flags?.searchQuery) {
				const response = await search(flags.searchQuery, {
					type: 'songs',
					limit: 1,
				});
				const songResult = response?.results.find(
					result => result.type === 'song',
				);
				if (!songResult) {
					console.error(`No playable tracks found for: "${flags.searchQuery}"`);
					process.exitCode = 1;
					return;
				}

				const track = songResult.data as Track;
				play(track, {clearQueue: true});
				console.log(`Playing: ${track.title}`);
				return;
			}

			if (flags?.playPlaylist) {
				const playlist = await getPlaylist(flags.playPlaylist);
				const firstTrack = playlist?.tracks[0];
				if (!firstTrack) {
					console.error(
						`No playable tracks found in playlist: ${flags.playPlaylist}`,
					);
					process.exitCode = 1;
					return;
				}

				play(firstTrack, {clearQueue: true});
				console.log(`Playing playlist "${playlist.name}": ${firstTrack.title}`);
				return;
			}

			if (flags?.action === 'pause') pause();
			if (flags?.action === 'resume') resume();
			if (flags?.action === 'next') next();
			if (flags?.action === 'previous') previous();
		})();
	}, [
		flags,
		play,
		pause,
		resume,
		next,
		previous,
		getTrack,
		getPlaylist,
		search,
	]);

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
							<KeyboardBlockProvider>
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
							</KeyboardBlockProvider>
						</PluginsProvider>
					</NavigationProvider>
				</PlayerProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
