import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {truncate} from '../../utils/format.ts';
import type {TopTrack} from '../../types/stats.types.ts';

type Props = {
	tracks: TopTrack[];
};

export default function TopTracksList({tracks}: Props) {
	const {theme} = useTheme();
	const {columns} = useTerminalSize();

	if (tracks.length === 0) {
		return (
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>No track data yet.</Text>
			</Box>
		);
	}

	const maxPlayCount = tracks[0]?.playCount ?? 1;
	const maxBarWidth = Math.min(20, Math.floor((columns - 50) / 2));
	const maxTitleWidth = Math.max(20, columns - 30);

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={theme.colors.primary} bold>
				Top Tracks
			</Text>
			{tracks.map((item, index) => {
				const barWidth = Math.max(
					1,
					Math.round((item.playCount / maxPlayCount) * maxBarWidth),
				);
				const bar = '█'.repeat(barWidth);
				return (
					<Box key={item.track.videoId} flexDirection="row" gap={1}>
						<Text color={theme.colors.dim}>
							{String(index + 1).padStart(2, ' ')}.
						</Text>
						<Text color={theme.colors.text} bold>
							{truncate(item.track.title, maxTitleWidth)}
						</Text>
						<Text color={theme.colors.secondary}>{bar}</Text>
						<Text color={theme.colors.dim}>{item.playCount} plays</Text>
					</Box>
				);
			})}
		</Box>
	);
}
