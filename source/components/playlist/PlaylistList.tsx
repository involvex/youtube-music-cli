// Playlist list component
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useCallback, useState} from 'react';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {usePlaylist} from '../../hooks/usePlaylist.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyboardBlocker} from '../../hooks/useKeyboardBlocker.tsx';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {getDownloadService} from '../../services/download/download.service.ts';
import {formatDownloadProgress} from '../../utils/download-progress.ts';

export default function PlaylistList() {
	const {theme} = useTheme();
	const {play, setQueue} = usePlayer();
	const {dispatch} = useNavigation();
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
	useKeyboardBlocker(renamingPlaylistId !== null);

	const handleCreate = useCallback(() => {
		const name = `Playlist ${playlists.length + 1}`;
		const playlist = createPlaylist(name);
		setLastCreated(playlist.name);
		setSelectedIndex(playlists.length);
	}, [createPlaylist, playlists.length]);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev =>
			Math.min(playlists.length === 0 ? 0 : playlists.length - 1, prev + 1),
		);
	}, [playlists.length]);

	const startPlaylist = useCallback(() => {
		if (renamingPlaylistId) return;
		const playlist = playlists[selectedIndex];
		if (!playlist || playlist.tracks.length === 0) return;
		setQueue([...playlist.tracks]);
		const firstTrack = playlist.tracks[0];
		if (!firstTrack) return;
		play(firstTrack);
	}, [play, playlists, selectedIndex, renamingPlaylistId, setQueue]);

	const handleRename = useCallback(() => {
		const playlist = playlists[selectedIndex];
		if (!playlist) return;
		setRenamingPlaylistId(playlist.playlistId);
		setRenameValue(playlist.name);
	}, [playlists, selectedIndex]);

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
		dispatch({category: 'GO_BACK'});
	}, [dispatch, renamingPlaylistId]);

	const handleDelete = useCallback(() => {
		if (renamingPlaylistId) return;
		const playlist = playlists[selectedIndex];
		if (!playlist) return;
		deletePlaylist(playlist.playlistId);
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, [deletePlaylist, playlists, renamingPlaylistId, selectedIndex]);

	const handleDownload = useCallback(async () => {
		if (renamingPlaylistId) return;
		if (isDownloading) {
			setDownloadStatus('Download already in progress. Please wait.');
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
			`Downloading ${target.tracks.length} track(s) from "${playlist.name}"...`,
		);
		try {
			setIsDownloading(true);
			const summary = await downloadService.downloadTracks(target.tracks, {
				onProgress: info => {
					setDownloadStatus(formatDownloadProgress(info));
				},
			});
			setDownloadStatus(
				`Downloaded ${summary.downloaded}, skipped ${summary.skipped}, failed ${summary.failed}.`,
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
	]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, startPlaylist);
	useKeyBinding(['r'], handleRename);
	useKeyBinding(KEYBINDINGS.CREATE_PLAYLIST, handleCreate);
	useKeyBinding(KEYBINDINGS.DELETE_PLAYLIST, handleDelete);
	useKeyBinding(KEYBINDINGS.BACK, handleBack);
	useKeyBinding(KEYBINDINGS.DOWNLOAD, () => {
		void handleDownload();
	});

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					Playlists
				</Text>
			</Box>

			{/* Playlist entries */}
			{playlists.length === 0 ? (
				<Text color={theme.colors.dim}>No playlists yet</Text>
			) : (
				playlists.map((playlist, index) => {
					const isSelected = index === selectedIndex;
					const isRenaming =
						renamingPlaylistId === playlist.playlistId && isSelected;
					const rowBackground = isSelected ? theme.colors.secondary : undefined;

					return (
						<Box
							key={playlist.playlistId}
							paddingX={1}
							backgroundColor={rowBackground}
						>
							<Text
								color={
									isSelected ? theme.colors.background : theme.colors.primary
								}
								bold={isSelected}
							>
								{index + 1}.
							</Text>
							<Text> </Text>
							<Box flexDirection="column">
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
										{playlist.name}
									</Text>
								)}
								<Text color={theme.colors.dim}>
									{` (${playlist.tracks.length} tracks)`}
								</Text>
							</Box>
						</Box>
					);
				})
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					<Text color={theme.colors.text}>Enter</Text> to play |{' '}
					<Text color={theme.colors.text}>r</Text> rename |{' '}
					<Text color={theme.colors.text}>c</Text> create |{' '}
					<Text color={theme.colors.text}>Shift+D</Text> download |{' '}
					<Text color={theme.colors.text}>D</Text> delete |{' '}
					<Text color={theme.colors.text}>Esc</Text> back
				</Text>
				{lastCreated && (
					<Text color={theme.colors.accent}> Created {lastCreated}</Text>
				)}
				{downloadStatus && (
					<Text color={theme.colors.accent}>{downloadStatus}</Text>
				)}
			</Box>
		</Box>
	);
}
