// Progress bar component
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {formatTime} from '../../utils/format.ts';

export default function ProgressBar() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();

	if (!playerState.currentTrack || !playerState.duration) {
		return null;
	}

	const progress = playerState.progress;
	const duration = playerState.duration;
	const percentage = duration > 0 ? Math.floor((progress / duration) * 100) : 0;
	const barWidth = Math.floor(percentage / 5); // 20 chars max, so 20% per char

	return (
		<Box flexDirection="column" marginTop={1}>
			<Box>
				<Text color={theme.colors.text}>
					{formatTime(progress)} / {formatTime(duration)}
				</Text>
				<Text color={theme.colors.dim}> {percentage}%</Text>
			</Box>

			<Box>
				<Text color={theme.colors.primary}>{'■'.repeat(barWidth)}</Text>
				<Text color={theme.colors.dim}>{'-'.repeat(20 - barWidth)}</Text>
			</Box>
		</Box>
	);
}
