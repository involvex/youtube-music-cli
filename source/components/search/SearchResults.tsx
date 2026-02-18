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
import {useCallback, useRef, useEffect} from 'react';
import {logger} from '../../services/logger/logger.service.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';

// Generate unique component instance ID
let instanceCounter = 0;

type Props = {
	results: SearchResult[];
	selectedIndex: number;
	isActive?: boolean;
};

function SearchResults({results, selectedIndex, isActive = true}: Props) {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play} = usePlayer();
	const {columns} = useTerminalSize();

	// Track component instance and last action time for debouncing
	const instanceIdRef = useRef(++instanceCounter);
	const lastSelectTime = useRef<number>(0);
	const SELECT_DEBOUNCE_MS = 300; // Prevent duplicate triggers within 300ms

	useEffect(() => {
		const instanceId = instanceIdRef.current;
		logger.debug('SearchResults', 'Component mounted', {instanceId});
		return () => {
			logger.debug('SearchResults', 'Component unmounted', {instanceId});
		};
	}, []);

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
		logger.debug('SearchResults', 'playSelected called', {
			isActive,
			selectedIndex,
			resultsLength: results.length,
		});
		if (!isActive) return;
		const selected = results[selectedIndex];
		logger.info('SearchResults', 'Playing selected track', {
			type: selected?.type,
			title: selected?.type === 'song' ? (selected.data as Track).title : 'N/A',
		});
		if (selected && selected.type === 'song') {
			// Clear queue when playing from search results to ensure indices match
			play(selected.data as Track, {clearQueue: true});
		} else {
			logger.warn('SearchResults', 'Selected item is not a song', {
				type: selected?.type,
			});
		}
	}, [selectedIndex, results, play, isActive]);

	// Play selected result handler (memoized to prevent duplicate registrations)
	const handleSelect = useCallback(() => {
		const now = Date.now();
		const timeSinceLastSelect = now - lastSelectTime.current;
		const instanceId = instanceIdRef.current;

		if (!isActive) {
			logger.debug('SearchResults', 'SELECT ignored, not active', {instanceId});
			return;
		}

		// Debounce to prevent double-triggers
		if (timeSinceLastSelect < SELECT_DEBOUNCE_MS) {
			logger.warn('SearchResults', 'SELECT debounced (duplicate trigger)', {
				instanceId,
				timeSinceLastSelect,
				debounceMs: SELECT_DEBOUNCE_MS,
			});
			return;
		}

		lastSelectTime.current = now;
		logger.debug('SearchResults', 'SELECT key pressed', {isActive, instanceId});
		playSelected();
	}, [isActive, playSelected]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, handleSelect);

	// Note: Removed redundant useEffect that was syncing selectedIndex to dispatch
	// This was causing unnecessary re-renders. The selectedIndex is already managed
	// by the parent component (SearchLayout) and passed down as a prop.

	if (results.length === 0) {
		return null;
	}

	// Calculate responsive truncation
	const maxTitleWidth = Math.max(20, Math.floor(columns * 0.4));

	return (
		<Box flexDirection="column" gap={1}>
			<Text color={theme.colors.dim} bold>
				Results ({results.length})
			</Text>

			{/* Table header */}
			<Box paddingX={1}>
				<Text color={theme.colors.dim} bold>
					{'#'.padEnd(6)} {'Type'.padEnd(10)} {'Title'.padEnd(maxTitleWidth)}
				</Text>
			</Box>

			{/* Results list */}
			{results.map((result, index) => {
				const isSelected = index === selectedIndex;
				const data = result.data;

				const title =
					'title' in data ? data.title : 'name' in data ? data.name : 'Unknown';

				return (
					<Box
						key={index}
						paddingX={1}
						borderStyle={isSelected ? 'double' : undefined}
						borderColor={isSelected ? theme.colors.primary : undefined}
					>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.dim}
							bold={isSelected}
						>
							{(isSelected ? '> ' : '  ') + (index + 1).toString().padEnd(4)}
						</Text>

						<Text
							color={isSelected ? theme.colors.primary : theme.colors.dim}
							bold={isSelected}
						>
							{result.type.toUpperCase().padEnd(10)}
						</Text>

						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							{truncate(title, maxTitleWidth)}
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}

export default React.memo(SearchResults);
