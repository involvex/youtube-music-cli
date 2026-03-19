// Queue management component
import {useState} from 'react';
import React from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useFavorites} from '../../stores/favorites.store.tsx';
import {ICONS} from '../../utils/icons.ts';
import {truncate} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';

function QueueList() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();
	const {isFavorite} = useFavorites();
	const {columns} = useTerminalSize();
	const [selectedIndex, _setSelectedIndex] = useState(0);

	// Calculate responsive truncation
	const getTruncateLength = (baseLength: number) => {
		const scale = Math.min(1, columns / 100);
		return Math.max(20, Math.floor(baseLength * scale));
	};

	if (playerState.queue.length === 0) {
		return null;
	}

	// Show only next 5 tracks
	const visibleQueue = playerState.queue.slice(
		playerState.queuePosition + 1,
		playerState.queuePosition + 6,
	);

	if (visibleQueue.length === 0) {
		return null;
	}

	return (
		<Box flexDirection="column">
			<Text color={theme.colors.dim}>
				Up next ({playerState.queue.length - playerState.queuePosition - 1}{' '}
				tracks)
			</Text>
			{visibleQueue.map((track, idx) => {
				const index = playerState.queuePosition + 1 + idx;
				const isSelected = index === selectedIndex;
				const artists = track.artists?.map(a => a.name).join(', ') || 'Unknown';
				const title = truncate(track.title, getTruncateLength(40));

				return (
					<Box key={`${track.videoId}-${index}`}>
						<Text color={theme.colors.dim}>{index + 1}. </Text>
						<Text color={isSelected ? theme.colors.primary : theme.colors.text}>
							{isFavorite(track.videoId) ? `${ICONS.HEART} ` : ''}
							{title}
						</Text>
						<Text color={theme.colors.dim}> • {artists}</Text>
					</Box>
				);
			})}
		</Box>
	);
}

export default React.memo(QueueList);
