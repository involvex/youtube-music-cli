// Playlist list component
import React from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import type {LocalPlaylist} from '../../types/playlist.types.ts';

export default function PlaylistList() {
	const {theme} = useTheme();
	const config = getConfigService();
	const playlists = config.get('playlists');

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
				playlists.map((playlist: LocalPlaylist, index: number) => (
					<Box key={playlist.playlistId || index} paddingX={1}>
						<Text color={theme.colors.primary}>{index + 1}.</Text>{' '}
						<Text color={theme.colors.text}>{playlist.name}</Text>
						<Text color={theme.colors.dim}>
							{' '}
							({playlist.tracks?.length || 0} tracks)
						</Text>
					</Box>
				))
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>c</Text> to create playlist
					{' | '}
					<Text color={theme.colors.text}>Esc</Text> to go back
				</Text>
			</Box>
		</Box>
	);
}
