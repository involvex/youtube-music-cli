// Offline queue component - shows locally available tracks for offline playback
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
import {loadDownloadsIndex} from '../../utils/local-track.ts';
import type {Track} from '../../types/youtube-music.types.ts';

type Props = {
	isActive?: boolean;
};

export default function OfflineQueue({isActive = true}: Props) {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play, addToQueue, playNext, state: playerState} = usePlayer();
	const {columns, rows} = useTerminalSize();

	const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Load offline tracks
	useEffect(() => {
		if (!isActive) return;

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

				setOfflineTracks(tracks);
				logger.debug('OfflineQueue', `Loaded ${tracks.length} offline tracks`);
			} catch (error) {
				logger.error('OfflineQueue', 'Failed to load offline tracks', {error});
				setOfflineTracks([]);
			} finally {
				setLoading(false);
			}
		};

		loadTracks();
	}, [isActive]);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(offlineTracks.length - 1, prev + 1));
	}, [offlineTracks.length]);

	const playSelected = useCallback(() => {
		if (!isActive || offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			play(track);
		}
	}, [isActive, offlineTracks, selectedIndex, play]);

	const enqueueSelected = useCallback(() => {
		if (!isActive || offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			addToQueue(track);
		}
	}, [isActive, offlineTracks, selectedIndex, addToQueue]);

	const playNextSelected = useCallback(() => {
		if (!isActive || offlineTracks.length === 0) return;
		const track = offlineTracks[selectedIndex];
		if (track) {
			playNext(track);
		}
	}, [isActive, offlineTracks, selectedIndex, playNext]);

	const goBack = useCallback(() => {
		if (!isActive) return;
		dispatch({category: 'GO_BACK'});
	}, [isActive, dispatch]);

	useKeyBinding(resolveKeybinding('BACK'), goBack);
	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(resolveKeybinding('ADD_TO_QUEUE'), enqueueSelected);
	useKeyBinding(resolveKeybinding('PLAY_NEXT'), playNextSelected);

	const visibleTracks = offlineTracks.slice(
		0,
		Math.max(1, Math.floor((rows - 12) / 2)),
	);

	if (loading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color={theme.colors.primary} bold>
					Offline Queue
				</Text>
				<Text color={theme.colors.dim}>Loading...</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					{ICONS.FILE_DOWNLOAD} Offline Queue ({offlineTracks.length})
				</Text>
				<Text color={theme.colors.dim}>
					{' '}
					· [Enter] Play · [W] Queue · [Y] Next
				</Text>
			</Box>

			{offlineTracks.length === 0 ? (
				<Box flexDirection="column" alignItems="center">
					<Text color={theme.colors.dim}>No offline tracks available.</Text>
					<Text color={theme.colors.dim}>
						Download tracks first via Shift+D in search results.
					</Text>
				</Box>
			) : (
				visibleTracks.map((track, idx) => {
					const isSelected = idx === selectedIndex;
					const isCurrent = playerState.currentTrack?.videoId === track.videoId;
					const isLocalPlay = playerState.mediaSource === 'local';
					const artists =
						track.artists?.map(a => a.name).join(', ') || 'Unknown';
					return (
						<Box key={track.videoId}>
							<Text
								color={
									isSelected || isCurrent
										? theme.colors.primary
										: theme.colors.dim
								}
							>
								{isSelected || isCurrent ? '> ' : '  '}
							</Text>
							<Text
								color={
									isSelected || isCurrent
										? theme.colors.primary
										: theme.colors.text
								}
								bold={isSelected || isCurrent}
							>
								{truncate(track.title, Math.floor(columns * 0.5))}
							</Text>
							<Text color={theme.colors.dim}>
								{' '}
								· {truncate(artists, Math.floor(columns * 0.35))}
							</Text>
							{isCurrent && isLocalPlay && (
								<Text color={theme.colors.primary} bold>
									{' • LOCAL'}
								</Text>
							)}
						</Box>
					);
				})
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					[↑↓] Select · [Enter] Play · [W] Queue · [Y] Next · [Esc] Back
				</Text>
			</Box>
		</Box>
	);
}
