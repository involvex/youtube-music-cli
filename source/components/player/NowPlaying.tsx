// Now playing component
import React from 'react';
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {formatTime} from '../../utils/format.ts';

export default function NowPlaying() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();

	if (!playerState.currentTrack) {
		return (
			<Box
				borderStyle="round"
				borderColor={theme.colors.dim}
				padding={1}
				marginY={1}
			>
				<Text color={theme.colors.dim}>No track playing</Text>
			</Box>
		);
	}

	const track = playerState.currentTrack;
	const artists =
		track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={theme.colors.primary}
			padding={1}
			marginY={1}
		>
			{/* Title */}
			<Text bold color={theme.colors.primary}>
				{track.title}
			</Text>

			{/* Artist */}
			<Text color={theme.colors.secondary}>{artists}</Text>

			{/* Album */}
			{track.album && <Text color={theme.colors.dim}>{track.album.name}</Text>}

			{/* Progress Bar */}
			<Box marginTop={1}>
				<Text color={theme.colors.text}>
					{formatTime(playerState.progress)}
				</Text>{' '}
				<Text color={theme.colors.dim}>
					[
					{Math.round(
						(playerState.progress / (playerState.duration || 1)) * 100,
					)}
					%]
				</Text>{' '}
				<Text color={theme.colors.text}>
					{formatTime(playerState.duration)}
				</Text>
			</Box>

			{/* Visual Progress */}
			{playerState.duration > 0 && (
				<Box>
					<Text color={theme.colors.primary}>
						{'■'.repeat(
							Math.floor((playerState.progress / playerState.duration) * 20),
						)}
					</Text>
					<Text color={theme.colors.dim}>
						{'-'.repeat(
							20 -
								Math.floor((playerState.progress / playerState.duration) * 20),
						)}
					</Text>
				</Box>
			)}

			{/* Loading / Error */}
			{playerState.isLoading && (
				<Text color={theme.colors.accent}>Loading...</Text>
			)}
			{playerState.error && (
				<Text color={theme.colors.error}>{playerState.error}</Text>
			)}
		</Box>
	);
}
