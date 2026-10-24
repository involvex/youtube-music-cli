import {Box, Text} from 'ink';
import {useCallback, useEffect, useState} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {VIEW} from '../../utils/constants.ts';
import {truncate} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {getMusicService} from '../../services/youtube-music/api.ts';
import {
	AccountLibraryAuthError,
	SIGNED_OUT_LIBRARY_MESSAGE,
	type AccountLibraryPlaylist,
} from '../../services/youtube-music/account-library.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {getAuthService} from '../../services/auth/auth.service.ts';

type LibraryPane = 'liked' | 'playlists';

function artistLabel(track: Track): string {
	return track.artists
		.map(artist => artist.name)
		.filter(Boolean)
		.join(', ');
}

export default function AccountLibraryLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play, setQueue, addToQueue, playNext} = usePlayer();
	const {rows, columns} = useTerminalSize();
	const [pane, setPane] = useState<LibraryPane>('liked');
	const [likedSongs, setLikedSongs] = useState<Track[]>([]);
	const [playlists, setPlaylists] = useState<AccountLibraryPlaylist[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [signedOut, setSignedOut] = useState(
		() => !getAuthService().getStatus().loggedIn,
	);
	const [isLoading, setIsLoading] = useState(() => !signedOut);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		if (signedOut) {
			return;
		}

		let cancelled = false;
		getMusicService()
			.getAccountLibrary()
			.then(library => {
				if (cancelled) {
					return;
				}

				setLikedSongs(library.likedSongs);
				setPlaylists(library.playlists);
				setIsLoading(false);
			})
			.catch((err: unknown) => {
				if (cancelled) {
					return;
				}

				if (err instanceof AccountLibraryAuthError) {
					setSignedOut(true);
					setError(null);
				} else {
					setError(
						err instanceof Error
							? err.message
							: 'Failed to load account library',
					);
				}
				setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [signedOut]);

	const items = pane === 'liked' ? likedSongs : playlists;
	const itemCount = items.length;

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev =>
			Math.min(itemCount === 0 ? 0 : itemCount - 1, prev + 1),
		);
	}, [itemCount]);

	const switchPane = useCallback((next: LibraryPane) => {
		setPane(next);
		setSelectedIndex(0);
		setStatus(null);
	}, []);

	const playSelectedTrack = useCallback(() => {
		const track = likedSongs[selectedIndex];
		if (!track) {
			return;
		}

		play(track);
		setStatus(`Playing ${track.title}`);
	}, [likedSongs, play, selectedIndex]);

	const enqueueSelectedTrack = useCallback(() => {
		const track = likedSongs[selectedIndex];
		if (!track) {
			return;
		}

		addToQueue(track);
		setStatus(`Queued ${track.title}`);
	}, [addToQueue, likedSongs, selectedIndex]);

	const playNextSelectedTrack = useCallback(() => {
		const track = likedSongs[selectedIndex];
		if (!track) {
			return;
		}

		playNext(track);
		setStatus(`Play next: ${track.title}`);
	}, [likedSongs, playNext, selectedIndex]);

	const playAllLiked = useCallback(() => {
		if (likedSongs.length === 0) {
			return;
		}

		setQueue([...likedSongs]);
		play(likedSongs[0]!);
		setStatus(`Playing ${likedSongs.length} liked songs`);
	}, [likedSongs, play, setQueue]);

	const playSelectedPlaylist = useCallback(() => {
		const playlist = playlists[selectedIndex];
		if (!playlist) {
			return;
		}

		setStatus(`Loading "${playlist.name}"...`);
		void getMusicService()
			.getPlaylist(playlist.playlistId)
			.then(loaded => {
				if (loaded.tracks.length === 0) {
					setStatus(`No tracks in "${playlist.name}"`);
					return;
				}

				setQueue([...loaded.tracks]);
				play(loaded.tracks[0]!);
				setStatus(`Playing "${loaded.name}"`);
			})
			.catch((err: unknown) => {
				setStatus(
					err instanceof Error
						? err.message
						: `Failed to load "${playlist.name}"`,
				);
			});
	}, [play, playlists, selectedIndex, setQueue]);

	const goToLogin = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.LOGIN});
	}, [dispatch]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('BACK'), goBack);
	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(['left', 'h', 'tab'], () => {
		switchPane(pane === 'liked' ? 'playlists' : 'liked');
	});
	useKeyBinding(['right', 'l'], () => {
		switchPane(pane === 'playlists' ? 'liked' : 'playlists');
	});
	useKeyBinding(resolveKeybinding('SELECT'), () => {
		if (signedOut) {
			goToLogin();
			return;
		}

		if (pane === 'liked') {
			playSelectedTrack();
			return;
		}

		playSelectedPlaylist();
	});
	useKeyBinding(resolveKeybinding('ADD_TO_QUEUE'), () => {
		if (pane === 'liked') {
			enqueueSelectedTrack();
		}
	});
	useKeyBinding(resolveKeybinding('PLAY_NEXT'), () => {
		if (pane === 'liked') {
			playNextSelectedTrack();
		}
	});
	useKeyBinding(['p'], () => {
		if (pane === 'liked') {
			playAllLiked();
		}
	});

	const maxWidth = Math.max(20, columns - 8);
	const listHeight = Math.max(5, rows - 12);
	const startIdx = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(listHeight / 2),
			Math.max(0, itemCount - listHeight),
		),
	);
	const visibleItems = items.slice(startIdx, startIdx + listHeight);

	return (
		<Box flexDirection="column" padding={1} flexGrow={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					YouTube Music Library
				</Text>
				<Text color={theme.colors.dim}> [Shift+L]</Text>
			</Box>
			<Box marginBottom={1}>
				<Text
					color={pane === 'liked' ? theme.colors.primary : theme.colors.dim}
					bold={pane === 'liked'}
				>
					Liked Songs ({likedSongs.length})
				</Text>
				<Text color={theme.colors.dim}> · </Text>
				<Text
					color={pane === 'playlists' ? theme.colors.primary : theme.colors.dim}
					bold={pane === 'playlists'}
				>
					Playlists ({playlists.length})
				</Text>
				<Text color={theme.colors.dim}> Tab/←→ switch</Text>
			</Box>

			{isLoading ? (
				<Text color={theme.colors.dim}>Loading account library...</Text>
			) : signedOut ? (
				<Box flexDirection="column">
					<Text color={theme.colors.warning}>{SIGNED_OUT_LIBRARY_MESSAGE}</Text>
					<Text color={theme.colors.dim}>
						Press Enter to open Login, or run ymc login.
					</Text>
				</Box>
			) : error ? (
				<Text color={theme.colors.error}>{error}</Text>
			) : itemCount === 0 ? (
				<Text color={theme.colors.dim}>
					{pane === 'liked'
						? 'No liked songs on this account yet.'
						: 'No account playlists found.'}
				</Text>
			) : pane === 'liked' ? (
				<Box flexDirection="column">
					{(visibleItems as Track[]).map((track, offset) => {
						const index = startIdx + offset;
						const selected = index === selectedIndex;
						const line = truncate(
							`${track.title} · ${artistLabel(track) || 'Unknown'}`,
							maxWidth,
						);
						return (
							<Text
								key={`${track.videoId}-${index}`}
								color={selected ? theme.colors.primary : theme.colors.text}
								bold={selected}
							>
								{selected ? '> ' : '  '}
								{line}
							</Text>
						);
					})}
				</Box>
			) : (
				<Box flexDirection="column">
					{(visibleItems as AccountLibraryPlaylist[]).map(
						(playlist, offset) => {
							const index = startIdx + offset;
							const selected = index === selectedIndex;
							const count =
								typeof playlist.trackCount === 'number'
									? ` (${playlist.trackCount})`
									: '';
							const line = truncate(`${playlist.name}${count}`, maxWidth);
							return (
								<Text
									key={`${playlist.playlistId}-${index}`}
									color={selected ? theme.colors.primary : theme.colors.text}
									bold={selected}
								>
									{selected ? '> ' : '  '}
									{line}
								</Text>
							);
						},
					)}
				</Box>
			)}

			{status ? (
				<Box marginTop={1}>
					<Text color={theme.colors.dim}>{status}</Text>
				</Box>
			) : (
				<Box marginTop={1}>
					<Text color={theme.colors.dim}>
						Enter play · W queue · Y play next · P play all liked · Esc back
					</Text>
				</Box>
			)}
		</Box>
	);
}
