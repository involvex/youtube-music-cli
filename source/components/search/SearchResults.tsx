// Search results component
import React from 'react';
import {Box, Text} from 'ink';
import type {SearchResult, Track} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {truncate} from '../../utils/format.ts';
import {useCallback, useEffect} from 'react';
import {useResponsive} from '../../utils/responsive.ts';

type Props = {
	results: SearchResult[];
	selectedIndex: number;
	isActive?: boolean;
};

function SearchResults({results, selectedIndex, isActive = true}: Props) {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {play} = usePlayer();
	const {getTruncateLength} = useResponsive();

	// Navigate results with arrow keys
	const navigateUp = useCallback(() => {
		if (!isActive) return;
		if (selectedIndex > 0) {
			dispatch({category: 'SET_SELECTED_RESULT', index: selectedIndex - 1});
		}
	}, [selectedIndex, dispatch, isActive]);

	const navigateDown = useCallback(() => {
		if (!isActive) return;
		if (selectedIndex < results.length - 1) {
			dispatch({category: 'SET_SELECTED_RESULT', index: selectedIndex + 1});
		}
	}, [selectedIndex, results.length, dispatch, isActive]);

	// Play selected result
	const playSelected = useCallback(() => {
		if (!isActive) return;
		const selected = results[selectedIndex];
		if (selected && selected.type === 'song') {
			play(selected.data as Track);
		}
	}, [selectedIndex, results, play, isActive]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, () => {
		if (isActive) {
			playSelected();
		}
	});

	// Sync selected index with navigation state
	useEffect(() => {
		if (!isActive) return;
		dispatch({category: 'SET_SELECTED_RESULT', index: selectedIndex});
	}, [selectedIndex, dispatch, isActive]);

	if (results.length === 0) {
		return null;
	}

	// Calculate responsive truncation
	const maxTitleWidth = getTruncateLength(60);

	return (
		<Box flexDirection="column" gap={1}>
			<Text color={theme.colors.dim} bold>
				Results ({results.length})
			</Text>

			{results.map((result, index) => {
				const isSelected = index === navState.selectedResult;
				const data = result.data;

				return (
					<Box
						key={index}
						paddingX={1}
						borderStyle={isSelected ? 'double' : undefined}
						borderColor={isSelected ? theme.colors.primary : undefined}
					>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							[{result.type.toUpperCase()}]<Text> </Text>
						</Text>

						{'title' in data ? (
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
							>
								{truncate(data.title, maxTitleWidth)}
							</Text>
						) : 'name' in data ? (
							<Text
								color={isSelected ? theme.colors.primary : theme.colors.text}
							>
								{truncate(data.name, maxTitleWidth)}
							</Text>
						) : (
							<Text color={theme.colors.dim}>Unknown</Text>
						)}
					</Box>
				);
			})}
		</Box>
	);
}

export default React.memo(SearchResults);
