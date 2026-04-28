import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import type {ListeningTimeBucket} from '../../types/stats.types.ts';

type Props = {
	buckets: ListeningTimeBucket[];
};

const BAR_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function getBarChar(value: number, max: number): string {
	if (max === 0) {
		return BAR_CHARS[0]!;
	}

	const normalized = value / max;
	const index = Math.min(
		Math.floor(normalized * BAR_CHARS.length),
		BAR_CHARS.length - 1,
	);
	return BAR_CHARS[index]!;
}

export default function ListeningTimeline({buckets}: Props) {
	const {theme} = useTheme();
	const {columns} = useTerminalSize();

	if (buckets.length === 0) {
		return (
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>No listening data yet.</Text>
			</Box>
		);
	}

	const maxPlays = Math.max(...buckets.map(b => b.playCount), 1);

	const chartWidth = Math.min(buckets.length, Math.floor((columns - 10) / 3));
	const visibleBuckets = buckets.slice(-chartWidth);

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={theme.colors.primary} bold>
				Last 14 Days
			</Text>
			<Box flexDirection="row" gap={1} marginTop={1}>
				{visibleBuckets.map(bucket => {
					const barChar = getBarChar(bucket.playCount, maxPlays);
					const dayLabel = bucket.date.slice(5);
					return (
						<Box
							key={bucket.date}
							flexDirection="column"
							alignItems="center"
							width={3}
						>
							<Text color={theme.colors.secondary}>{barChar}</Text>
							<Text color={theme.colors.dim}>{dayLabel}</Text>
						</Box>
					);
				})}
			</Box>
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					{maxPlays} plays max • {BAR_CHARS[0]} low -{' '}
					{BAR_CHARS[BAR_CHARS.length - 1]} high
				</Text>
			</Box>
		</Box>
	);
}
