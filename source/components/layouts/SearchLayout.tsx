// Search view layout
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
	const {isLoading, error, search} = useYouTubeMusic();
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isTyping, setIsTyping] = useState(true);
	const [isSearching, setIsSearching] = useState(false);

	// Handle search action
	const performSearch = useCallback(
		async (query: string) => {
			if (!query || isSearching) return;

			setIsSearching(true);
			const response = await search(query, {
				type: navState.searchType,
				limit: navState.searchLimit,
			});

			if (response) {
				setResults(response.results);
				dispatch({category: 'SET_HAS_SEARCHED', hasSearched: true});
				setIsTyping(false); // Move focus to results after search
			}
			setIsSearching(false);
		},
		[search, navState.searchType, navState.searchLimit, dispatch, isSearching],
	);

	// Adjust results limit
	const increaseLimit = useCallback(() => {
		dispatch({category: 'SET_SEARCH_LIMIT', limit: navState.searchLimit + 5});
	}, [navState.searchLimit, dispatch]);

	const decreaseLimit = useCallback(() => {
		dispatch({category: 'SET_SEARCH_LIMIT', limit: navState.searchLimit - 5});
	}, [navState.searchLimit, dispatch]);

	useKeyBinding(KEYBINDINGS.INCREASE_RESULTS, increaseLimit);
	useKeyBinding(KEYBINDINGS.DECREASE_RESULTS, decreaseLimit);

	// Initial search if query is in state
	useEffect(() => {
		if (isTyping && navState.searchQuery && !navState.hasSearched) {
			void performSearch(navState.searchQuery);
		}
	}, [isTyping, navState.searchQuery, navState.hasSearched, performSearch]);

	// Handle going back
	const goBack = useCallback(() => {
		if (!isTyping) {
			setIsTyping(true); // Back to typing if in results
		} else {
			dispatch({category: 'GO_BACK'});
		}
	}, [isTyping, dispatch]);

	useKeyBinding(KEYBINDINGS.BACK, goBack);

	// Reset search state when leaving view
	useEffect(() => {
		return () => {
			setResults([]);
			dispatch({category: 'SET_HAS_SEARCHED', hasSearched: false});
		};
	}, [dispatch]);

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
				<Text color={theme.colors.dim}>
					Limit: {navState.searchLimit} (Use [ or ] to adjust)
				</Text>
			</Box>

			{/* Search Bar */}
			<SearchBar
				isActive={isTyping && !isSearching}
				onInput={input => {
					dispatch({category: 'SET_SEARCH_QUERY', query: input});
					void performSearch(input);
				}}
			/>

			{/* Loading */}
			{(isLoading || isSearching) && (
				<Text color={theme.colors.accent}>Searching...</Text>
			)}

			{/* Error */}
			{error && <Text color={theme.colors.error}>{error}</Text>}

			{/* Results */}
			{!isLoading && navState.hasSearched && (
				<SearchResults
					results={results}
					selectedIndex={navState.selectedResult}
					isActive={!isTyping}
				/>
			)}

			{/* No Results */}
			{!isLoading && navState.hasSearched && results.length === 0 && !error && (
				<Text color={theme.colors.dim}>No results found</Text>
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					{isTyping
						? 'Type to search, Enter to start'
						: 'Arrows to navigate, Enter to play, Esc to type again'}
				</Text>
			</Box>
		</Box>
	);
}
