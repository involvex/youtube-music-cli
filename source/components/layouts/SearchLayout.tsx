// Search view layout
import React from 'react';
import {useNavigation} from '../../stores/navigation.store.tsx';
import {useYouTubeMusic} from '../../hooks/useYouTubeMusic.ts';
import SearchResults from '../search/SearchResults.tsx';
import {useState, useCallback} from 'react';
import type {SearchResult} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import SearchBar from '../search/SearchBar.tsx';
import {Box, Text} from 'ink';

export default function SearchLayout() {
	const {theme} = useTheme();
	const {state: navState} = useNavigation();
	const {search, isLoading, error} = useYouTubeMusic();
	const [results, setResults] = useState<SearchResult[]>([]);
	const [hasSearched, setHasSearched] = useState(false);

	const handleSearch = useCallback(async () => {
		if (!navState.searchQuery.trim()) {
			return;
		}

		setHasSearched(true);
		const response = await search(navState.searchQuery, {
			type: navState.searchType as 'song' | 'album' | 'artist' | 'playlist',
		});

		if (response) {
			setResults(response.results);
		}
	}, [navState.searchQuery, navState.searchType, search]);

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
				{' | '}
				<Text color={theme.colors.dim}>Type to search, Enter to play</Text>
			</Box>

			{/* Search Bar */}
			<SearchBar onSearch={handleSearch} />

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
