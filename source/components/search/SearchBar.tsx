// Search bar component
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useState, useCallback} from 'react';
import React from 'react';
import {SEARCH_TYPE, KEYBINDINGS} from '../../utils/constants.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {Box, Text, useInput} from 'ink';

type Props = {
	onInput: (input: string) => void;
	isActive?: boolean;
};

function SearchBar({onInput, isActive = true}: Props) {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const [input, setInput] = useState('');
	const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);

	const searchTypes = Object.values(SEARCH_TYPE);

	// Handle character input
	useInput((char, key) => {
		if (!isActive) return;
		if (key.ctrl || key.meta) return;

		if (key.backspace || key.delete) {
			setInput(prev => prev.slice(0, -1));
			return;
		}

		if (key.return) {
			if (input) {
				dispatch({category: 'SET_SEARCH_QUERY', query: input});
				onInput(input);
			}
			return;
		}

		// Only add printable characters
		if (char.length === 1 && !key.escape && !key.tab) {
			setInput(prev => prev + char);
		}
	});

	// Handle type switching
	const cycleType = useCallback(() => {
		if (!isActive) return;
		const nextIndex = (selectedTypeIndex + 1) % searchTypes.length;
		setSelectedTypeIndex(nextIndex);
		const nextType = searchTypes[nextIndex];
		if (nextType) {
			dispatch({
				category: 'SET_SEARCH_CATEGORY',
				searchType: nextType,
			});
		}
	}, [selectedTypeIndex, searchTypes, dispatch, isActive]);

	useKeyBinding(['tab'], cycleType);
	useKeyBinding(KEYBINDINGS.CLEAR_SEARCH, () => {
		if (!isActive) return;
		setInput('');
		onInput('');
	});

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor={theme.colors.secondary}
			padding={1}
		>
			{/* Search Type Toggle */}
			<Box marginBottom={1}>
				<Text color={theme.colors.dim}>Type: </Text>
				{searchTypes.map((type, index) => (
					<Text
						key={type}
						color={
							navState.searchType === type
								? theme.colors.primary
								: theme.colors.dim
						}
						bold={navState.searchType === type}
					>
						{type}
						{index < searchTypes.length - 1 && ' '}
					</Text>
				))}
				<Text color={theme.colors.dim}> (Tab to switch)</Text>
			</Box>

			{/* Input */}
			<Box>
				<Text color={theme.colors.primary}>Search: </Text>
				<Text color={theme.colors.text}>{input}</Text>
				<Text color={theme.colors.dim}>_</Text>
			</Box>

			{/* Instructions */}
			<Text color={theme.colors.dim}>
				Type to search, Enter to search, Tab to change type, Esc to clear
			</Text>
		</Box>
	);
}

export default React.memo(SearchBar);
