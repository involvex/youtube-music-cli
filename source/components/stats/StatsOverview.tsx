import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import type {ListeningStats} from '../../types/stats.types.ts';

type Props = {
	stats: ListeningStats;
};

export default function StatsOverview({stats}: Props) {
	const {theme} = useTheme();

	const formatMinutes = (minutes: number): string => {
		if (minutes < 60) {
			return `${minutes}m`;
		}

		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	};

	return (
		<Box flexDirection="row" gap={2} marginY={1}>
			<Box
				flexDirection="column"
				gap={1}
				width={24}
				borderStyle="round"
				borderColor={theme.colors.dim}
				paddingX={1}
			>
				<Text color={theme.colors.dim}>Total Plays</Text>
				<Text color={theme.colors.primary} bold>
					{stats.totalPlays.toLocaleString()}
				</Text>
			</Box>
			<Box
				flexDirection="column"
				gap={1}
				width={24}
				borderStyle="round"
				borderColor={theme.colors.dim}
				paddingX={1}
			>
				<Text color={theme.colors.dim}>Listening Time</Text>
				<Text color={theme.colors.primary} bold>
					{formatMinutes(stats.totalListeningMinutes)}
				</Text>
			</Box>
			<Box
				flexDirection="column"
				gap={1}
				width={24}
				borderStyle="round"
				borderColor={theme.colors.dim}
				paddingX={1}
			>
				<Text color={theme.colors.dim}>Avg/Day</Text>
				<Text color={theme.colors.primary} bold>
					{formatMinutes(stats.averageDailyMinutes)}
				</Text>
			</Box>
			<Box
				flexDirection="column"
				gap={1}
				width={24}
				borderStyle="round"
				borderColor={theme.colors.dim}
				paddingX={1}
			>
				<Text color={theme.colors.dim}>Streak</Text>
				<Text color={theme.colors.primary} bold>
					{stats.currentStreak}d
				</Text>
			</Box>
		</Box>
	);
}
