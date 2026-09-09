// Explore / Genre browsing view — shows curated sections from YouTube Music
import {Box, Text} from 'ink';
import {useState, useEffect, useCallback, useMemo} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {getMusicService} from '../../services/youtube-music/api.ts';
import type {Track} from '../../types/youtube-music.types.ts';

interface Section {
	title: string;
	tracks: Track[];
}

export default function ExploreLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play} = usePlayer();
	const [sections, setSections] = useState<Section[]>([]);
	const [sectionIndex, setSectionIndex] = useState(0);
	const [trackIndex, setTrackIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		getMusicService()
			.getExploreSections()
			.then(results => {
				if (!cancelled) {
					setSections(results);
					setIsLoading(false);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : 'Failed to load explore',
					);
					setIsLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const currentSection = sections[sectionIndex];
	const tracks = useMemo(() => currentSection?.tracks ?? [], [currentSection]);

	const goToPrevSection = useCallback(() => {
		setSectionIndex(i => Math.max(0, i - 1));
		setTrackIndex(0);
	}, []);

	const goToNextSection = useCallback(() => {
		setSectionIndex(i => Math.min(sections.length - 1, i + 1));
		setTrackIndex(0);
	}, [sections.length]);

	const navigateUp = useCallback(() => {
		setTrackIndex(i => Math.max(0, i - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setTrackIndex(i => Math.min(tracks.length - 1, i + 1));
	}, [tracks.length]);

	const playSelected = useCallback(() => {
		const track = tracks[trackIndex];
		if (track) play(track);
	}, [tracks, trackIndex, play]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(resolveKeybinding('BACK'), goBack);
	useKeyBinding(['left'], goToPrevSection);
	useKeyBinding(['right'], goToNextSection);
	// Section navigation. These intentionally shadow the global single-key
	// bindings (e.g. 'l' for lyrics) while this view is focused — dispatch is
	// LIFO so the focused view wins and globals resume when leaving.
	useKeyBinding(['h'], goToPrevSection);
	useKeyBinding(['l'], goToNextSection);

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					🎵 Explore
				</Text>
			</Box>

			{isLoading ? (
				<Text color={theme.colors.dim}>Loading explore sections...</Text>
			) : error ? (
				<Text color={theme.colors.error}>{error}</Text>
			) : sections.length === 0 ? (
				<Text color={theme.colors.dim}>No sections found</Text>
			) : (
				<>
					{/* Section tabs */}
					<Box marginBottom={1} gap={2}>
						{sections.map((section, index) => (
							<Text
								key={section.title}
								color={
									index === sectionIndex
										? theme.colors.primary
										: theme.colors.dim
								}
								bold={index === sectionIndex}
								underline={index === sectionIndex}
							>
								{section.title}
							</Text>
						))}
					</Box>

					{/* Track list */}
					{tracks.map((track, index) => {
						const isSelected = index === trackIndex;
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
					})}
				</>
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					←/→ Sections | ↑/↓ Tracks | Enter Play | Esc Back
				</Text>
			</Box>
		</Box>
	);
}
