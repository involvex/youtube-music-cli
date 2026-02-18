// Playlist list component
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlaylist} from '../../hooks/usePlaylist.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {useState, useCallback} from 'react';
import type {Playlist} from '../../types/youtube-music.types.ts';

export default function PlaylistList() {
	const {theme} = useTheme();
	const {playlists, createPlaylist} = usePlaylist();
	const [lastCreated, setLastCreated] = useState<string | null>(null);

	const handleCreate = useCallback(() => {
		const name = `Playlist ${playlists.length + 1}`;
		createPlaylist(name);
		setLastCreated(name);
	}, [playlists.length, createPlaylist]);

	useKeyBinding(KEYBINDINGS.CREATE_PLAYLIST, handleCreate);

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

			{/* Playlist List */}
			{playlists.length === 0 ? (
				<Text color={theme.colors.dim}>No playlists yet</Text>
			) : (
				playlists.map((playlist: Playlist, index: number) => (
					<Box key={playlist.playlistId || index} paddingX={1}>
						<Text color={theme.colors.primary}>{index + 1}.</Text>
						<Text> </Text>
						<Text color={theme.colors.text}>{playlist.name}</Text>
						<Text color={theme.colors.dim}>
							<Text> </Text>({playlist.tracks?.length || 0} tracks)
						</Text>
					</Box>
				))
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>c</Text> to create playlist
					<Text> | </Text>
					<Text color={theme.colors.text}>Esc</Text> to go back
				</Text>
				{lastCreated && (
					<Text color={theme.colors.accent}> Created {lastCreated}</Text>
				)}
			</Box>
		</Box>
	);
}
