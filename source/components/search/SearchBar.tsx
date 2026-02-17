// Search bar component
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useState, useCallback} from 'react';
import React from 'react';
import {SEARCH_TYPE} from '../../utils/constants.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';

type Props = {
	onInput: (input: string) => void;
	isActive?: boolean;
};

function SearchBar({onInput, isActive = true}: Props) {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const [input, setInput] = useState('');

	const searchTypes = Object.values(SEARCH_TYPE);

	// Handle type switching
	const cycleType = useCallback(() => {
		if (!isActive) return;
		const currentIndex = searchTypes.indexOf(navState.searchType);
		const nextIndex = (currentIndex + 1) % searchTypes.length;
		const nextType = searchTypes[nextIndex];
		if (nextType) {
			dispatch({
				category: 'SET_SEARCH_CATEGORY',
				searchType: nextType,
			});
		}
	}, [navState.searchType, searchTypes, dispatch, isActive]);

	// Handle submit via ink-text-input's onSubmit
	const handleSubmit = useCallback(
		(value: string) => {
			if (value && isActive) {
				dispatch({category: 'SET_SEARCH_QUERY', query: value});
				onInput(value);
			}
		},
		[dispatch, onInput, isActive],
	);

	// Handle clearing search
	const clearSearch = useCallback(() => {
		if (isActive) {
			setInput('');
			onInput('');
		}
	}, [isActive, onInput]);

	useKeyBinding(['tab'], cycleType);
	useKeyBinding(['escape'], clearSearch);

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

			{/* Input - using ink-text-input */}
			<Box>
				<Text color={theme.colors.primary}>Search: </Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder="Type to search..."
					focus={isActive}
				/>
			</Box>

			{/* Instructions */}
			<Text color={theme.colors.dim}>
				Type to search, Enter to search, Tab to change type, Esc to clear
			</Text>
		</Box>
	);
}

export default React.memo(SearchBar);
