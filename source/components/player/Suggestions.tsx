// Suggestions component
import {useEffect, useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useYouTubeMusic} from '../../hooks/useYouTubeMusic.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {truncate} from '../../utils/format.ts';

export default function Suggestions() {
	const {theme} = useTheme();
	const {state: playerState, play} = usePlayer();
	const {getSuggestions, isLoading} = useYouTubeMusic();
	const [suggestions, setSuggestions] = useState<Track[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		if (playerState.currentTrack?.videoId) {
			getSuggestions(playerState.currentTrack.videoId).then(tracks => {
				setSuggestions(tracks);
				setSelectedIndex(0);
			});
		}
	}, [playerState.currentTrack?.videoId, getSuggestions]);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(suggestions.length - 1, prev + 1));
	}, [suggestions.length]);

	const playSelected = useCallback(() => {
		const track = suggestions[selectedIndex];
		if (track) {
			play(track);
		}
	}, [selectedIndex, suggestions, play]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, playSelected);

	if (isLoading) {
		return <Text color={theme.colors.accent}>Loading suggestions...</Text>;
	}

	if (suggestions.length === 0) {
		return <Text color={theme.colors.dim}>No suggestions available</Text>;
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color={theme.colors.primary}>
				Suggestions based on: {playerState.currentTrack?.title}
			</Text>

			{suggestions.map((track, index) => {
				const isSelected = index === selectedIndex;
				return (
					<Box key={track.videoId} paddingX={1}>
						<Text
							backgroundColor={isSelected ? theme.colors.primary : undefined}
							color={isSelected ? theme.colors.background : theme.colors.text}
							bold={isSelected}
						>
							{index + 1}. {truncate(track.title, 40)} -{' '}
							{track.artists?.map(a => a.name).join(', ')}
						</Text>
					</Box>
				);
			})}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Arrows to navigate, Enter to play, Esc to go back
				</Text>
			</Box>
		</Box>
	);
}
