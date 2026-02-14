import React from 'react';
import PlayerControls from '../player/PlayerControls.tsx';
import {usePlayer} from '../../hooks/usePlayer.ts';
import NowPlaying from '../player/NowPlaying.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import {Box, Text} from 'ink';

export default function PlayerLayout() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					YouTube Music CLI
				</Text>{' '}
				<Text color={theme.colors.dim}>v0.0.1</Text>
			</Box>

			<NowPlaying />

			<PlayerControls />

			{playerState.queue.length > 0 && (
				<Box marginTop={1}>
					<Text color={theme.colors.dim}>
						Queue: {playerState.queuePosition + 1} / {playerState.queue.length}
					</Text>
					{playerState.repeat !== 'off' && (
						<>
							{' | '}
							<Text color={theme.colors.accent}>
								{playerState.repeat === 'one' ? 'Repeat One' : 'Repeat All'}
							</Text>
						</>
					)}
					{playerState.shuffle && (
						<>
							{' | '}
							<Text color={theme.colors.accent}>Shuffle</Text>
						</>
					)}
				</Box>
			)}

			<Box
				marginTop={1}
				borderColor={theme.colors.dim}
				borderStyle="classic"
				paddingX={1}
			>
				<Text color={theme.colors.dim}>
					Shortcuts: <Text color={theme.colors.text}>Space</Text> Play/Pause
					{' | '}
					<Text color={theme.colors.text}>n</Text> Next
					{' | '}
					<Text color={theme.colors.text}>p</Text> Previous
					{' | '}
					<Text color={theme.colors.text}>/</Text> Search
					{' | '}
					<Text color={theme.colors.text}>?</Text> Help
				</Text>
			</Box>
		</Box>
	);
}
