// Trending tracks view — shows YouTube trending music
import {Box, Text} from 'ink';
import {useState, useEffect, useCallback} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {getMusicService} from '../../services/youtube-music/api.ts';
import type {Track} from '../../types/youtube-music.types.ts';

export default function TrendingLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play} = usePlayer();
	const [tracks, setTracks] = useState<Track[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		getMusicService()
			.getTrending()
			.then(results => {
				if (!cancelled) {
					setTracks(results);
					setIsLoading(false);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : 'Failed to load trending',
					);
					setIsLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const navigateUp = useCallback(() => {
		setSelectedIndex(i => Math.max(0, i - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(i => Math.min(tracks.length - 1, i + 1));
	}, [tracks.length]);

	const playSelected = useCallback(() => {
		const track = tracks[selectedIndex];
		if (track) play(track);
	}, [tracks, selectedIndex, play]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(resolveKeybinding('BACK'), goBack);

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					🔥 Trending Music
				</Text>
			</Box>

			{isLoading ? (
				<Text color={theme.colors.dim}>Loading trending tracks...</Text>
			) : error ? (
				<Text color={theme.colors.error}>{error}</Text>
			) : tracks.length === 0 ? (
				<Text color={theme.colors.dim}>No trending tracks found</Text>
			) : (
				tracks.map((track, index) => {
					const isSelected = index === selectedIndex;
					const artist = track.artists?.[0]?.name ?? 'Unknown';
					return (
						<Box key={track.videoId}>
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.dim}
							>
								{isSelected ? '▶ ' : `${String(index + 1).padStart(2)}. `}
							</Text>
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
								bold={isSelected}
							>
								{track.title}
							</Text>
							<Text color={theme.colors.dim}> — {artist}</Text>
						</Box>
					);
				})
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					↑/↓ Navigate | Enter Play | Esc Back
				</Text>
			</Box>
		</Box>
	);
}
