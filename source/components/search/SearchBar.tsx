// Search bar component
import React from 'react';
import {useNavigation} from '../../stores/navigation.store.tsx';
import {useState} from 'react';
import {SEARCH_TYPE} from '../../utils/constants.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {Box, Text} from 'ink';

type Props = {
	onSearch: () => void;
};

export default function SearchBar({_onSearch}: Props) {
	const {theme} = useTheme();
	const {state: navState} = useNavigation();
	const [input] = useState('');

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
				{Object.values(SEARCH_TYPE).map(type => (
					<Text
						key={type}
						color={
							navState.searchType === type
								? theme.colors.primary
								: theme.colors.dim
						}
						bold={navState.searchType === type}
					>
						{type}{' '}
					</Text>
				))}
			</Box>

			{/* Input */}
			<Box>
				<Text color={theme.colors.primary}>Search: </Text>
				<Text color={theme.colors.text}>{input}</Text>
				<Text color={theme.colors.dim}>_</Text>
			</Box>

			{/* Instructions */}
			<Text color={theme.colors.dim}>Type to search, Enter to submit</Text>
		</Box>
	);
}
