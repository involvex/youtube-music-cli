import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useFavorites} from '../../stores/favorites.store.tsx';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {ICONS} from '../../utils/icons.ts';
import {truncate} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';

export default function FavoritesList() {
	const {theme} = useTheme();
	const {favorites, removeFavorite} = useFavorites();
	const {play, dispatch: playerDispatch} = usePlayer();
	const {columns, rows} = useTerminalSize();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const {dispatch} = useNavigation();

	// Navigation
	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(favorites.length - 1, prev + 1));
	}, [favorites.length]);

	const playSelected = useCallback(() => {
		const track = favorites[selectedIndex];
		if (track) {
			play(track);
		}
	}, [favorites, selectedIndex, play]);

	const playAll = useCallback(() => {
		if (favorites.length === 0) return;
		playerDispatch({category: 'SET_QUEUE', queue: favorites});
		playerDispatch({category: 'PLAY', track: favorites[0]!});
	}, [favorites, playerDispatch]);

	const shufflePlayAll = useCallback(() => {
		if (favorites.length === 0) return;
		// Create a shuffled copy
		const shuffled = [...favorites].sort(() => Math.random() - 0.5);
		playerDispatch({category: 'SET_QUEUE', queue: shuffled});
		playerDispatch({category: 'PLAY', track: shuffled[0]!});
	}, [favorites, playerDispatch]);

	const handleRemove = useCallback(() => {
		const track = favorites[selectedIndex];
		if (track) {
			removeFavorite(track.videoId);
			// Adjust selection if needed
			if (selectedIndex >= favorites.length - 1) {
				setSelectedIndex(Math.max(0, favorites.length - 2));
			}
		}
	}, [favorites, selectedIndex, removeFavorite]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	// Key bindings
	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, playSelected);
	useKeyBinding(['delete', 'd', 'backspace'], handleRemove);
	useKeyBinding(['f'], handleRemove); // Toggle off in this view means remove
	useKeyBinding(['shift+p'], playAll); // Reuse playlist play shortcut? Or just Enter on a "Play All" button?
	// Let's add specific shortcuts for playing all/shuffle
	useKeyBinding(['p'], playAll);
	useKeyBinding(['s'], shufflePlayAll);
	useKeyBinding(['escape'], goBack, {bypassBlock: true});

	if (favorites.length === 0) {
		return (
			<Box
				flexDirection="column"
				alignItems="center"
				justifyContent="center"
				height={rows - 10}
			>
				<Text color={theme.colors.dim}>No favorites yet.</Text>
				<Text color={theme.colors.dim}>
					Press 'f' while playing to add songs.
				</Text>
			</Box>
		);
	}

	// Pagination/Windowing
	const ITEMS_PER_PAGE = Math.max(5, rows - 15); // Adjust based on layout
	const startIdx = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(ITEMS_PER_PAGE / 2),
			favorites.length - ITEMS_PER_PAGE,
		),
	);
	const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, favorites.length);
	const visibleItems = favorites.slice(startIdx, endIdx);

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.accent} bold>
					{ICONS.HEART} Favorites ({favorites.length})
				</Text>
				<Text color={theme.colors.dim}> • </Text>
				<Text color={theme.colors.dim}>
					[Enter] Play • [p] Play All • [s] Shuffle • [f/Del] Remove
				</Text>
			</Box>

			{visibleItems.map((track, idx) => {
				const realIndex = startIdx + idx;
				const isSelected = realIndex === selectedIndex;
				const artists = track.artists?.map(a => a.name).join(', ') || 'Unknown';

				return (
					<Box key={track.videoId}>
						<Text color={isSelected ? theme.colors.primary : theme.colors.dim}>
							{isSelected ? '> ' : '  '}
						</Text>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							{truncate(track.title, Math.floor(columns * 0.4))}
						</Text>
						<Text color={theme.colors.dim}>
							{' '}
							• {truncate(artists, Math.floor(columns * 0.3))}
						</Text>
						<Text color={theme.colors.dim}>
							{' '}
							(
							{track.duration
								? Math.floor(track.duration / 60) +
									':' +
									(track.duration % 60).toString().padStart(2, '0')
								: '--:--'}
							)
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}
