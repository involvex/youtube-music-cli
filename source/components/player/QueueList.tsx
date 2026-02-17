// Queue management component
import {useState} from 'react';
import React from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {truncate} from '../../utils/format.ts';
import {useResponsive} from '../../utils/responsive.ts';

function QueueList() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();
	const {getTruncateLength} = useResponsive();
	const [selectedIndex, _setSelectedIndex] = useState(0);

	if (playerState.queue.length === 0) {
		return (
			<Box paddingX={1}>
				<Text color={theme.colors.dim}>Queue is empty</Text>
			</Box>
		);
	}

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
					Queue ({playerState.queue.length} tracks)
				</Text>
			</Box>

			{/* Queue Items */}
			{playerState.queue.map(
				(
					track: import('../../types/youtube-music.types.ts').Track,
					index: number,
				) => {
					const isSelected = index === selectedIndex;
					const artists =
						track.artists?.map(a => a.name).join(', ') || 'Unknown';
					const title = truncate(track.title, getTruncateLength(50));

					return (
						<Box
							key={track.videoId}
							paddingX={1}
							borderStyle={isSelected ? 'double' : undefined}
							borderColor={isSelected ? theme.colors.primary : undefined}
						>
							<Text color={theme.colors.dim}>{index + 1}.</Text>
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
								bold={isSelected}
							>
								{title}
							</Text>
							<Text color={theme.colors.dim}>
								{' - '}
								{artists}
							</Text>
						</Box>
					);
				},
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Arrows to navigate, Enter to select
				</Text>
			</Box>
		</Box>
	);
}

export default React.memo(QueueList);
