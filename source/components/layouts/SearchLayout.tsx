// Search view layout
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useYouTubeMusic} from '../../hooks/useYouTubeMusic.ts';
import SearchResults from '../search/SearchResults.tsx';
import {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import React from 'react';
import type {
	SearchResult,
	SearchDurationFilter,
} from '../../types/youtube-music.types.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import SearchBar from '../search/SearchBar.tsx';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {ICONS} from '../../utils/icons.ts';
import TextInput from 'ink-text-input';
import {applySearchFilters} from '../../utils/search-filters.ts';

type FilterField = 'artist' | 'album' | 'year';

const FILTER_LABELS: Record<FilterField, string> = {
	artist: 'Artist',
	album: 'Album',
	year: 'Year',
};

const DURATION_ORDER: SearchDurationFilter[] = [
	'all',
	'short',
	'medium',
	'long',
];

function SearchLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {state: playerState} = usePlayer();
	const {isLoading, error, search} = useYouTubeMusic();
	const [rawResults, setRawResults] = useState<SearchResult[]>([]);
	const filteredResults = useMemo(
		() => applySearchFilters(rawResults, navState.searchFilters),
		[rawResults, navState.searchFilters],
	);
	const [isTyping, setIsTyping] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastAutoSearchedQueryRef = useRef<string | null>(null);
	const [editingFilter, setEditingFilter] = useState<FilterField | null>(null);
	const [filterDraft, setFilterDraft] = useState('');

	const describeFilterValue = (value?: string) =>
		value?.trim() ? value.trim() : 'Any';

	const handleFilterSubmit = useCallback(
		(value: string) => {
			if (!editingFilter) return;
			dispatch({
				category: 'SET_SEARCH_FILTERS',
				filters: {[editingFilter]: value.trim()},
			});
			setEditingFilter(null);
			setFilterDraft('');
		},
		[dispatch, editingFilter],
	);

	const beginFilterEdit = useCallback(
		(field: FilterField) => {
			setEditingFilter(field);
			setFilterDraft(navState.searchFilters[field] ?? '');
		},
		[navState.searchFilters],
	);

	const cycleDurationFilter = useCallback(() => {
		const currentIndex = DURATION_ORDER.indexOf(
			navState.searchFilters.duration ?? 'all',
		);
		const nextIndex = (currentIndex + 1) % DURATION_ORDER.length;
		const nextDuration = DURATION_ORDER[nextIndex];
		dispatch({
			category: 'SET_SEARCH_FILTERS',
			filters: {duration: nextDuration},
		});
	}, [dispatch, navState.searchFilters.duration]);

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
				setRawResults(response.results);
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
	useKeyBinding(KEYBINDINGS.SEARCH_FILTER_ARTIST, () =>
		beginFilterEdit('artist'),
	);
	useKeyBinding(KEYBINDINGS.SEARCH_FILTER_ALBUM, () =>
		beginFilterEdit('album'),
	);
	useKeyBinding(KEYBINDINGS.SEARCH_FILTER_YEAR, () => beginFilterEdit('year'));
	useKeyBinding(KEYBINDINGS.SEARCH_FILTER_DURATION, cycleDurationFilter);

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
		if (editingFilter) {
			setEditingFilter(null);
			setFilterDraft('');
			return;
		}
		if (!isTyping) {
			setIsTyping(true); // Back to typing if in results
			dispatch({category: 'SET_HAS_SEARCHED', hasSearched: false});
		} else {
			dispatch({category: 'GO_BACK'});
		}
	}, [editingFilter, isTyping, dispatch]);

	// Handle escape in search - go to home
	const goToHome = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.HOME});
	}, [dispatch]);

	useKeyBinding(KEYBINDINGS.BACK, goBack);
	useKeyBinding(['escape'], goToHome, {bypassBlock: true});

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
			setRawResults([]);
			dispatch({category: 'SET_HAS_SEARCHED', hasSearched: false});
			dispatch({category: 'SET_SEARCH_QUERY', query: ''});
			lastAutoSearchedQueryRef.current = null;
		};
	}, [dispatch]);

	useEffect(() => {
		if (
			filteredResults.length > 0 &&
			navState.selectedResult >= filteredResults.length
		) {
			dispatch({category: 'SET_SELECTED_RESULT', index: 0});
		}
	}, [dispatch, filteredResults.length, navState.selectedResult]);

	const artistFilterLabel = describeFilterValue(navState.searchFilters.artist);
	const albumFilterLabel = describeFilterValue(navState.searchFilters.album);
	const yearFilterLabel = describeFilterValue(navState.searchFilters.year);
	const durationFilterLabel =
		navState.searchFilters.duration && navState.searchFilters.duration !== 'all'
			? navState.searchFilters.duration
			: 'Any';

	return (
		<Box flexDirection="column">
			{/* Now Playing indicator */}
			{playerState.currentTrack && (
				<Box>
					<Text color={theme.colors.dim}>
						{playerState.isPlaying ? `${ICONS.PLAY} ` : `${ICONS.PAUSE} `}
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
				Limit: {navState.searchLimit} (Use Ctrl+M/Ctrl+, to adjust)
			</Text>

			<SearchBar
				isActive={!editingFilter && isTyping && !isSearching}
				onInput={input => {
					void performSearch(input);
				}}
			/>

			{editingFilter ? (
				<Box flexDirection="column" marginY={1}>
					<Box>
						<Text color={theme.colors.primary} bold>
							Set {FILTER_LABELS[editingFilter]} filter:
						</Text>
						<TextInput
							value={filterDraft}
							onChange={setFilterDraft}
							onSubmit={handleFilterSubmit}
							placeholder="Type value and hit Enter"
							focus
						/>
					</Box>
					<Text color={theme.colors.dim}>
						Press Enter to save (empty to clear) or Esc to cancel.
					</Text>
				</Box>
			) : (
				<Box marginY={1}>
					<Text color={theme.colors.dim}>
						Filters: Artist={artistFilterLabel}, Album={albumFilterLabel}, Year=
						{yearFilterLabel}, Duration={durationFilterLabel} (Ctrl+A Artist,
						Ctrl+L Album, Ctrl+Y Year, Ctrl+D Duration)
					</Text>
				</Box>
			)}

			{/* Loading */}
			{(isLoading || isSearching) && (
				<Text color={theme.colors.accent}>Searching...</Text>
			)}

			{/* Error */}
			{error && <Text color={theme.colors.error}>{error}</Text>}

			{/* Results */}
			{!isLoading && navState.hasSearched && (
				<SearchResults
					results={filteredResults}
					selectedIndex={navState.selectedResult}
					isActive={!isTyping}
					onMixCreated={handleMixCreated}
					onDownloadStatus={handleDownloadStatus}
				/>
			)}

			{/* No Results */}
			{!isLoading &&
				navState.hasSearched &&
				filteredResults.length === 0 &&
				!error && <Text color={theme.colors.dim}>No results found</Text>}

			{/* Instructions */}
			{actionMessage && (
				<Text color={theme.colors.accent}>{actionMessage}</Text>
			)}
			<Text color={theme.colors.dim}>
				{isTyping
					? 'Type to search, Enter to start, Esc to clear'
					: `Arrows to navigate, Enter to play, M mix, Shift+D download, Ctrl+M/Ctrl+, more/fewer results (${navState.searchLimit}), H history, Esc to type`}
			</Text>
		</Box>
	);
}

export default React.memo(SearchLayout);
