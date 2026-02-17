// Search view layout
import React from 'react';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useYouTubeMusic} from '../../hooks/useYouTubeMusic.ts';
import SearchResults from '../search/SearchResults.tsx';
import {useState, useCallback, useEffect} from 'react';
import type {SearchResult} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import SearchBar from '../search/SearchBar.tsx';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {Box, Text} from 'ink';

export default function SearchLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {isLoading, error} = useYouTubeMusic();
	const [results, setResults] = useState<SearchResult[]>([]);
	const [hasSearched, setHasSearched] = useState(false);

	// Handle going back
	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(KEYBINDINGS.BACK, goBack);

	// Reset search state when leaving view
	useEffect(() => {
		return () => {
			setResults([]);
			setHasSearched(false);
		};
	}, []);

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					Search
				</Text>
				<Text color={theme.colors.dim}> | </Text>
				<Text color={theme.colors.dim}>Type to search, Enter to search</Text>
			</Box>

			{/* Search Bar */}
			<SearchBar
				onInput={input => {
					dispatch({category: 'SET_SEARCH_QUERY', query: input});
				}}
			/>

			{/* Loading */}
			{isLoading && <Text color={theme.colors.accent}>Searching...</Text>}

			{/* Error */}
			{error && <Text color={theme.colors.error}>{error}</Text>}

			{/* Results */}
			{!isLoading && hasSearched && (
				<SearchResults
					results={results}
					selectedIndex={navState.selectedResult}
				/>
			)}

			{/* No Results */}
			{!isLoading && hasSearched && results.length === 0 && !error && (
				<Text color={theme.colors.dim}>No results found</Text>
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>Esc</Text> to go back
				</Text>
			</Box>
		</Box>
	);
}
