// Offline layout - shows offline tracks for playback
import {useState, useCallback, useEffect} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {ICONS} from '../../utils/icons.ts';
import {truncate} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {logger} from '../../services/logger/logger.service.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {loadDownloadsIndex} from '../../utils/local-track.ts';

export default function OfflineLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play, addToQueue, playNext, state: playerState} = usePlayer();
	const {columns, rows} = useTerminalSize();

	const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
	const [loading, setLoading] = useState(true);

	// Load offline tracks
	useEffect(() => {
		let mounted = true;

		const loadTracks = async () => {
			setLoading(true);
			try {
				const index = loadDownloadsIndex();

				const tracks: Track[] = [];
				for (const [videoId, entry] of Object.entries(index.tracks)) {
					if (entry.path) {
						tracks.push({
							videoId,
							title:
								entry.path
									.split('/')
									.pop()
									?.replace(/\.[^.]+$/, '') || videoId,
							artists: [],
						});
					}
				}

				if (mounted) {
					setOfflineTracks(tracks);
					logger.debug(
						'OfflineLayout',
						`Loaded ${tracks.length} offline tracks`,
					);
				}
			} catch (error) {
				logger.error('OfflineLayout', 'Failed to load offline tracks', {error});
				if (mounted) {
					setOfflineTracks([]);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		loadTracks();

		return () => {
			mounted = false;
		};
	}, []);

	const [selectedIndex, setSelectedIndex] = useState(0);

	const maxVisible = Math.max(5, Math.floor((rows - 15) / 1));
	const start = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(maxVisible / 2),
			Math.max(0, offlineTracks.length - maxVisible),
		),
	);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(offlineTracks.length - 1, prev + 1));
	}, [offlineTracks.length]);

	const playSelected = useCallback(() => {
		if (offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			play(track);
		}
	}, [offlineTracks, selectedIndex, play]);

	const enqueueSelected = useCallback(() => {
		if (offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			addToQueue(track);
		}
	}, [offlineTracks, selectedIndex, addToQueue]);

	const playNextSelected = useCallback(() => {
		if (offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			playNext(track);
		}
	}, [offlineTracks, selectedIndex, playNext]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('BACK'), goBack);
	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(resolveKeybinding('ADD_TO_QUEUE'), enqueueSelected);
	useKeyBinding(resolveKeybinding('PLAY_NEXT'), playNextSelected);

	return (
		<Box flexDirection="column" paddingX={1} flexGrow={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					{ICONS.FILE_DOWNLOAD} Offline Queue ({offlineTracks.length})
				</Text>
				<Text color={theme.colors.dim}>
					{' '}
					· [Enter] Play · [W] Queue · [Y] Next · [Esc] Back
				</Text>
			</Box>

			{loading ? (
				<Box flexDirection="column" paddingX={2}>
					<Text color={theme.colors.dim}>Loading offline tracks...</Text>
				</Box>
			) : offlineTracks.length === 0 ? (
				<Box flexDirection="column" paddingX={2}>
					<Text color={theme.colors.dim}>No offline tracks available.</Text>
					<Text color={theme.colors.dim}>
						Download tracks first via Shift+D in search results.
					</Text>
				</Box>
			) : (
				<Box
					flexDirection="column"
					height={maxVisible}
					overflow="hidden"
					contentOffsetY={start}
					flexShrink={0}
				>
					{offlineTracks.map((track, idx) => {
						const isCurrent =
							playerState.currentTrack?.videoId === track.videoId;
						const isSelected = idx === selectedIndex || isCurrent;
						const isLocalPlay = playerState.mediaSource === 'local';
						const artists =
							track.artists?.map(a => a.name).join(', ') || 'Unknown';

						return (
							<Box key={track.videoId} flexShrink={0}>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.dim}
								>
									{isSelected ? '> ' : '  '}
								</Text>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.text}
									bold={isSelected || isCurrent}
								>
									{truncate(track.title, Math.floor(columns * 0.5))}
								</Text>
								<Text color={theme.colors.dim}>
									{' '}
									• {truncate(artists, Math.floor(columns * 0.35))}
								</Text>
								{isCurrent && isLocalPlay && (
									<Text color={theme.colors.primary} bold={true}>
										{' • LOCAL'}
									</Text>
								)}
								{track.duration && (
									<Text
										color={
											isSelected ? theme.colors.primary : theme.colors.secondary
										}
									>
										{' '}
										(
										{Math.floor(track.duration / 60) +
											':' +
											(track.duration % 60).toString().padStart(2, '0')}
										)
									</Text>
								)}
							</Box>
						);
					})}
				</Box>
			)}

			<Box marginTop={1} paddingX={1}>
				<Text color={theme.colors.dim}>
					[↑↓] Navigate · [Enter] Play · [W] Queue · [Y] Next · [Esc] Back
				</Text>
			</Box>
		</Box>
	);
}
