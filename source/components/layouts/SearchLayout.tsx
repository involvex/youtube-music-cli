// Search view layout
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useYouTubeMusic} from '../../hooks/useYouTubeMusic.ts';
import SearchResults from '../search/SearchResults.tsx';
import {useState, useCallback, useEffect, useRef} from 'react';
import React from 'react';
import type {SearchResult} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import SearchBar from '../search/SearchBar.tsx';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';

function SearchLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {state: playerState} = usePlayer();
	const {isLoading, error, search} = useYouTubeMusic();
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isTyping, setIsTyping] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastAutoSearchedQueryRef = useRef<string | null>(null);

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
				dispatch({category: 'SET_SELECTED_RESULT', index: 0});
				dispatch({category: 'SET_HAS_SEARCHED', hasSearched: true});
				// Defer focus switch to avoid consuming the same Enter key
				// Use longer delay to ensure key event has been fully processed
				setTimeout(() => setIsTyping(false), 100);
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

	// Open search history
	const goToHistory = useCallback(() => {
		if (!isTyping) {
			dispatch({category: 'NAVIGATE', view: VIEW.SEARCH_HISTORY});
		}
	}, [isTyping, dispatch]);

	useKeyBinding(['h'], goToHistory);

	// Initial search if query is in state (usually from CLI flags)
	useEffect(() => {
		const query = navState.searchQuery.trim();
		if (!query || navState.hasSearched) {
			return;
		}

		if (lastAutoSearchedQueryRef.current === query) {
			return;
		}

		lastAutoSearchedQueryRef.current = query;
		queueMicrotask(() => {
			void performSearch(query);
		});
	}, [navState.searchQuery, navState.hasSearched, performSearch]);

	// Handle going back
	const goBack = useCallback(() => {
		if (!isTyping) {
			setIsTyping(true); // Back to typing if in results
			dispatch({category: 'SET_HAS_SEARCHED', hasSearched: false});
		} else {
			dispatch({category: 'GO_BACK'});
		}
	}, [isTyping, dispatch]);

	useKeyBinding(KEYBINDINGS.BACK, goBack);

	const handleMixCreated = useCallback((message: string) => {
		setActionMessage(message);
		if (actionTimeoutRef.current) {
			clearTimeout(actionTimeoutRef.current);
		}
		actionTimeoutRef.current = setTimeout(() => {
			setActionMessage(null);
			actionTimeoutRef.current = null;
		}, 4000);
	}, []);

	const handleDownloadStatus = useCallback((message: string) => {
		setActionMessage(message);
		if (actionTimeoutRef.current) {
			clearTimeout(actionTimeoutRef.current);
		}
		actionTimeoutRef.current = setTimeout(() => {
			setActionMessage(null);
			actionTimeoutRef.current = null;
		}, 4000);
	}, []);

	useEffect(() => {
		return () => {
			if (actionTimeoutRef.current) {
				clearTimeout(actionTimeoutRef.current);
			}
		};
	}, []);

	// Reset search state when leaving view
	useEffect(() => {
		return () => {
			setResults([]);
			dispatch({category: 'SET_HAS_SEARCHED', hasSearched: false});
			dispatch({category: 'SET_SEARCH_QUERY', query: ''});
			lastAutoSearchedQueryRef.current = null;
		};
	}, [dispatch]);

	return (
		<Box flexDirection="column">
			{/* Now Playing indicator */}
			{playerState.currentTrack && (
				<Box>
					<Text color={theme.colors.dim}>
						{playerState.isPlaying ? '▶ ' : '⏸ '}
					</Text>
					<Text color={theme.colors.primary} bold>
						{playerState.currentTrack.title}
					</Text>
					{playerState.currentTrack.artists &&
						playerState.currentTrack.artists.length > 0 && (
							<Text color={theme.colors.secondary}>
								{' • '}
								{playerState.currentTrack.artists.map(a => a.name).join(', ')}
							</Text>
						)}
				</Box>
			)}

			<Text color={theme.colors.dim}>
				Limit: {navState.searchLimit} (Use [ or ] to adjust)
			</Text>

			<SearchBar
				isActive={isTyping && !isSearching}
				onInput={input => {
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
					onMixCreated={handleMixCreated}
					onDownloadStatus={handleDownloadStatus}
				/>
			)}

			{/* No Results */}
			{!isLoading && navState.hasSearched && results.length === 0 && !error && (
				<Text color={theme.colors.dim}>No results found</Text>
			)}

			{/* Instructions */}
			{actionMessage && (
				<Text color={theme.colors.accent}>{actionMessage}</Text>
			)}
			<Text color={theme.colors.dim}>
				{isTyping
					? 'Type to search, Enter to start, Esc to clear'
					: `Arrows to navigate, Enter to play, M mix, Shift+D download, ]/[ more/fewer results (${navState.searchLimit}), H history, Esc to type`}
			</Text>
		</Box>
	);
}

export default React.memo(SearchLayout);
