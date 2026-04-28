import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import type {TopArtist} from '../../types/stats.types.ts';

type Props = {
	artists: TopArtist[];
};

export default function TopArtistsList({artists}: Props) {
	const {theme} = useTheme();

	if (artists.length === 0) {
		return (
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>No artist data yet.</Text>
			</Box>
		);
	}

	const maxPlayCount = artists[0]?.playCount ?? 1;

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={theme.colors.primary} bold>
				Top Artists
			</Text>
			{artists.map((artist, index) => {
				const barWidth = Math.max(
					1,
					Math.round((artist.playCount / maxPlayCount) * 15),
				);
				const bar = '█'.repeat(barWidth);
				return (
					<Box key={artist.name} flexDirection="row" gap={1}>
						<Text color={theme.colors.dim}>
							{String(index + 1).padStart(2, ' ')}.
						</Text>
						<Text color={theme.colors.text} bold>
							{artist.name}
						</Text>
						<Text color={theme.colors.secondary}>{bar}</Text>
						<Text color={theme.colors.dim}>
							{artist.playCount} plays • {artist.uniqueTracks} tracks
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}
