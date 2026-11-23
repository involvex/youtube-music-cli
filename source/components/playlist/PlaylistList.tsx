// Playlist list component
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useKeyboardBlocker} from '../../hooks/useKeyboardBlocker.tsx';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {usePlaylist} from '../../hooks/usePlaylist.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {getDownloadService} from '../../services/download/download.service.ts';
import {formatDownloadProgress} from '../../utils/download-progress.ts';
import {formatTime, truncate} from '../../utils/format.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';

export default function PlaylistList() {
	const {theme} = useTheme();
	const {play, setQueue, startRadio, addToQueue, playNext} = usePlayer();
	const {dispatch} = useNavigation();
	const {columns, rows} = useTerminalSize();
	const downloadService = getDownloadService();
	const {playlists, createPlaylist, renamePlaylist, deletePlaylist} =
		usePlaylist();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [lastCreated, setLastCreated] = useState<string | null>(null);
	const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(
		null,
	);
	const [renameValue, setRenameValue] = useState('');
	const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
	const [isDownloading, setIsDownloading] = useState(false);
	const [radioStatus, setRadioStatus] = useState<string | null>(null);
	const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(
		null,
	);
	const [trackIndex, setTrackIndex] = useState(0);
	useKeyboardBlocker(renamingPlaylistId !== null);

	const selectedPlaylist = playlists[selectedIndex];
	const selectedTracks = useMemo(
		() => selectedPlaylist?.tracks ?? [],
		[selectedPlaylist],
	);
	// Derive the view state from the selection so changing playlists closes it
	// without a state-syncing effect.
	const viewingTracks =
		viewingPlaylistId !== null &&
		viewingPlaylistId === selectedPlaylist?.playlistId;

	const handleCreate = useCallback(() => {
		if (viewingTracks) return;
		const name = `Playlist ${playlists.length + 1}`;
		const playlist = createPlaylist(name);
		setLastCreated(playlist.name);
		setSelectedIndex(playlists.length);
	}, [createPlaylist, playlists.length, viewingTracks]);

	const navigateUp = useCallback(() => {
		if (viewingTracks) {
			setTrackIndex(prev => Math.max(0, prev - 1));
			return;
		}
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, [viewingTracks]);

	const navigateDown = useCallback(() => {
		if (viewingTracks) {
			setTrackIndex(prev =>
				Math.min(
					selectedTracks.length === 0 ? 0 : selectedTracks.length - 1,
					prev + 1,
				),
			);
			return;
		}
		setSelectedIndex(prev =>
			Math.min(playlists.length === 0 ? 0 : playlists.length - 1, prev + 1),
		);
	}, [playlists.length, viewingTracks, selectedTracks.length]);

	const startPlaylist = useCallback(() => {
		if (renamingPlaylistId || viewingTracks) return;
		const playlist = playlists[selectedIndex];
		if (!playlist || playlist.tracks.length === 0) return;
		setQueue([...playlist.tracks]);
		const firstTrack = playlist.tracks[0];
		if (!firstTrack) return;
		play(firstTrack);
	}, [
		play,
		playlists,
		selectedIndex,
		renamingPlaylistId,
		setQueue,
		viewingTracks,
	]);

	const playSelectedTrack = useCallback(() => {
		const track = selectedTracks[trackIndex];
		if (!track || !selectedPlaylist) return;
		setQueue([...selectedTracks]);
		play(track);
	}, [play, selectedPlaylist, selectedTracks, setQueue, trackIndex]);

	const enqueueSelectedTrack = useCallback(() => {
		const track = selectedTracks[trackIndex];
		if (!track || !viewingTracks) return;
		addToQueue(track);
	}, [addToQueue, selectedTracks, trackIndex, viewingTracks]);

	const playNextSelectedTrack = useCallback(() => {
		const track = selectedTracks[trackIndex];
		if (!track || !viewingTracks) return;
		playNext(track);
	}, [playNext, selectedTracks, trackIndex, viewingTracks]);

	const toggleTrackList = useCallback(() => {
		const playlist = playlists[selectedIndex];
		if (!playlist || renamingPlaylistId) return;
		if (viewingTracks) {
			setViewingPlaylistId(null);
			setTrackIndex(0);
			return;
		}
		if (playlist.tracks.length === 0) {
			setRadioStatus(`"${playlist.name}" has no tracks.`);
			return;
		}
		setViewingPlaylistId(playlist.playlistId);
		setTrackIndex(0);
	}, [playlists, renamingPlaylistId, selectedIndex, viewingTracks]);

	const selectCurrent = useCallback(() => {
		if (viewingTracks) {
			playSelectedTrack();
			return;
		}
		startPlaylist();
	}, [playSelectedTrack, startPlaylist, viewingTracks]);

	// Endless radio-like playback seeded from the selected saved playlist:
	// shuffled playlist queue first, then autoplay extends with related tracks.
	const startPlaylistRadio = useCallback(() => {
		if (renamingPlaylistId || viewingTracks) return;
		const playlist = playlists[selectedIndex];
		if (!playlist) return;
		if (playlist.tracks.length === 0) {
			setRadioStatus(`"${playlist.name}" has no tracks to radio from.`);
			return;
		}
		setRadioStatus(`Starting radio from "${playlist.name}"...`);
		void startRadio({
			type: 'local-playlist',
			id: playlist.playlistId,
			name: playlist.name,
		}).then(success => {
			setRadioStatus(
				success
					? `Playing radio from "${playlist.name}".`
					: `Could not start radio from "${playlist.name}".`,
			);
		});
	}, [playlists, selectedIndex, renamingPlaylistId, startRadio, viewingTracks]);

	const handleRename = useCallback(() => {
		if (viewingTracks) return;
		const playlist = playlists[selectedIndex];
		if (!playlist) return;
		setRenamingPlaylistId(playlist.playlistId);
		setRenameValue(playlist.name);
	}, [playlists, selectedIndex, viewingTracks]);

	const handleRenameSubmit = useCallback(
		(value: string) => {
			if (!renamingPlaylistId) return;
			const trimmedValue = value.trim() || `Playlist ${selectedIndex + 1}`;
			renamePlaylist(renamingPlaylistId, trimmedValue);
			setRenamingPlaylistId(null);
			setRenameValue('');
		},
		[renamePlaylist, renamingPlaylistId, selectedIndex],
	);

	const handleBack = useCallback(() => {
		if (renamingPlaylistId) {
			setRenamingPlaylistId(null);
			setRenameValue('');
			return;
		}
		if (viewingTracks) {
			setViewingPlaylistId(null);
			setTrackIndex(0);
			return;
		}
		dispatch({category: 'GO_BACK'});
	}, [dispatch, renamingPlaylistId, viewingTracks]);

	const handleDelete = useCallback(() => {
		if (renamingPlaylistId || viewingTracks) return;
		const playlist = playlists[selectedIndex];
		if (!playlist) return;
		deletePlaylist(playlist.playlistId);
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, [
		deletePlaylist,
		playlists,
		renamingPlaylistId,
		selectedIndex,
		viewingTracks,
	]);

	const handleDownload = useCallback(async () => {
		if (renamingPlaylistId || viewingTracks) return;
		if (isDownloading || downloadService.isDownloading()) {
			downloadService.cancel();
			setDownloadStatus('Cancelling download...');
			return;
		}
		const playlist = playlists[selectedIndex];
		if (!playlist) return;

		const config = downloadService.getConfig();
		if (!config.enabled) {
			setDownloadStatus(
				'Downloads are disabled. Enable Download Feature in Settings.',
			);
			return;
		}

		const target = downloadService.resolvePlaylistTarget(playlist);
		if (target.tracks.length === 0) {
			setDownloadStatus(`No tracks to download in "${playlist.name}".`);
			return;
		}

		setDownloadStatus(
			`Downloading ${target.tracks.length} track(s) from "${playlist.name}"... (Shift+D to cancel)`,
		);
		try {
			setIsDownloading(true);
			const summary = await downloadService.downloadTracks(target.tracks, {
				onProgress: info => {
					setDownloadStatus(formatDownloadProgress(info));
				},
			});
			setDownloadStatus(
				summary.cancelled > 0
					? `Cancelled. Downloaded ${summary.downloaded}, skipped ${summary.skipped}, failed ${summary.failed}, cancelled ${summary.cancelled}.`
					: `Downloaded ${summary.downloaded}, skipped ${summary.skipped}, failed ${summary.failed}.`,
			);
		} catch (error) {
			setDownloadStatus(
				error instanceof Error ? error.message : 'Failed to download playlist.',
			);
		} finally {
			setIsDownloading(false);
		}
	}, [
		downloadService,
		isDownloading,
		playlists,
		renamingPlaylistId,
		selectedIndex,
		viewingTracks,
	]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), selectCurrent);
	useKeyBinding(['t'], toggleTrackList);
	useKeyBinding(resolveKeybinding('ADD_TO_QUEUE'), enqueueSelectedTrack);
	useKeyBinding(resolveKeybinding('PLAY_NEXT'), playNextSelectedTrack);
	useKeyBinding(['r'], handleRename);
	useKeyBinding(resolveKeybinding('CREATE_MIX'), startPlaylistRadio);
	useKeyBinding(resolveKeybinding('CREATE_PLAYLIST'), handleCreate);
	useKeyBinding(resolveKeybinding('DELETE_PLAYLIST'), handleDelete);
	useKeyBinding(resolveKeybinding('BACK'), handleBack, {bypassBlock: true});
	useKeyBinding(resolveKeybinding('DOWNLOAD'), () => {
		void handleDownload();
	});

	const maxVisible = Math.max(5, rows - 14);
	const start = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(maxVisible / 2),
			Math.max(0, playlists.length - maxVisible),
		),
	);
	const indexWidth = String(playlists.length).length;
	const nameWidth = Math.max(12, columns - indexWidth - 18);

	if (viewingTracks && selectedPlaylist) {
		const trackVisible = Math.max(5, rows - 12);
		const trackStart = Math.max(
			0,
			Math.min(
				trackIndex - Math.floor(trackVisible / 2),
				Math.max(0, selectedTracks.length - trackVisible),
			),
		);
		const visibleTracks = selectedTracks.slice(
			trackStart,
			trackStart + trackVisible,
		);

		return (
			<Box flexDirection="column" flexGrow={1} paddingX={1}>
				<Box marginBottom={1}>
					<Text bold color={theme.colors.primary}>
						{truncate(selectedPlaylist.name, Math.max(12, columns - 14))}
					</Text>
					<Text color={theme.colors.dim}>
						{' '}
						({selectedTracks.length} tracks)
					</Text>
				</Box>

				{selectedTracks.length === 0 ? (
					<Text color={theme.colors.dim}>Playlist is empty</Text>
				) : (
					<Box flexDirection="column" height={trackVisible} flexShrink={0}>
						{visibleTracks.map((track, offset) => {
							const absoluteIndex = trackStart + offset;
							const isSelected = absoluteIndex === trackIndex;
							const rowBackground = isSelected
								? theme.colors.secondary
								: undefined;
							const artist = track.artists?.[0]?.name ?? 'Unknown';
							const duration = track.duration
								? ` ${formatTime(track.duration)}`
								: '';
							const label = `${String(absoluteIndex + 1).padStart(
								String(selectedTracks.length).length,
							)}. ${track.title} — ${artist}${duration}`;
							return (
								<Box
									key={`${track.videoId}-${absoluteIndex}`}
									paddingX={1}
									backgroundColor={rowBackground}
									flexShrink={0}
								>
									<Text
										color={
											isSelected ? theme.colors.background : theme.colors.text
										}
										bold={isSelected}
									>
										{truncate(label, Math.max(20, columns - 4))}
									</Text>
								</Box>
							);
						})}
					</Box>
				)}

				<Box marginTop={1} flexDirection="column">
					<Text color={theme.colors.dim}>
						<Text color={theme.colors.text}>Enter</Text> play track |{' '}
						<Text color={theme.colors.text}>w</Text> queue |{' '}
						<Text color={theme.colors.text}>y</Text> play next |{' '}
						<Text color={theme.colors.text}>t</Text> back to playlists |{' '}
						<Text color={theme.colors.text}>Esc</Text> back
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" flexGrow={1} paddingX={1}>
			<Box marginBottom={1}>
				<Text bold color={theme.colors.primary}>
					Playlists ({playlists.length})
				</Text>
			</Box>

			{playlists.length === 0 ? (
				<Text color={theme.colors.dim}>No playlists yet</Text>
			) : (
				<Box
					flexDirection="column"
					height={maxVisible}
					overflow="hidden"
					contentOffsetY={start}
					flexShrink={0}
				>
					{playlists.map((playlist, index) => {
						const isSelected = index === selectedIndex;
						const isRenaming =
							renamingPlaylistId === playlist.playlistId && isSelected;
						const rowBackground = isSelected
							? theme.colors.secondary
							: undefined;
						const trackLabel = `(${playlist.tracks.length} tracks)`;

						return (
							<Box
								key={playlist.playlistId}
								paddingX={1}
								backgroundColor={rowBackground}
								flexShrink={0}
							>
								<Text
									color={
										isSelected ? theme.colors.background : theme.colors.primary
									}
									bold={isSelected}
								>
									{String(index + 1).padStart(indexWidth)}.
								</Text>
								<Text> </Text>
								{isRenaming ? (
									<TextInput
										value={renameValue}
										onChange={setRenameValue}
										onSubmit={handleRenameSubmit}
										placeholder="Playlist name"
										focus
									/>
								) : (
									<Text
										color={
											isSelected ? theme.colors.background : theme.colors.text
										}
										bold={isSelected}
									>
										{truncate(playlist.name, nameWidth)}
									</Text>
								)}
								<Text
									color={
										isSelected ? theme.colors.background : theme.colors.dim
									}
								>
									{' '}
									{trackLabel}
								</Text>
							</Box>
						);
					})}
				</Box>
			)}

			<Box marginTop={1} flexDirection="column">
				<Text color={theme.colors.dim}>
					<Text color={theme.colors.text}>Enter</Text> to play |{' '}
					<Text color={theme.colors.text}>t</Text> tracks |{' '}
					<Text color={theme.colors.text}>m</Text> radio |{' '}
					<Text color={theme.colors.text}>r</Text> rename |{' '}
					<Text color={theme.colors.text}>c</Text> create |{' '}
					<Text color={theme.colors.text}>Shift+D</Text> download |{' '}
					<Text color={theme.colors.text}>D</Text> delete |{' '}
					<Text color={theme.colors.text}>Esc</Text> back
				</Text>
				{lastCreated && (
					<Text color={theme.colors.accent}>Created {lastCreated}</Text>
				)}
				{downloadStatus && (
					<Text color={theme.colors.accent}>{downloadStatus}</Text>
				)}
				{radioStatus && <Text color={theme.colors.accent}>{radioStatus}</Text>}
			</Box>
		</Box>
	);
}
