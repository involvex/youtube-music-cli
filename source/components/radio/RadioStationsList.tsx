import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {truncate} from '../../utils/format.ts';
import {getBuiltinStations} from '../../services/radio-stations/radio-stations.service.ts';

export default function RadioStationsList() {
	const {theme} = useTheme();
	const {playStream, state: playerState} = usePlayer();
	const {dispatch} = useNavigation();
	const {columns, rows} = useTerminalSize();
	const stations = getBuiltinStations();
	const [selectedIndex, setSelectedIndex] = useState(0);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(stations.length - 1, prev + 1));
	}, [stations.length]);

	const playSelected = useCallback(() => {
		const station = stations[selectedIndex];
		if (station) {
			playStream(station);
		}
	}, [stations, selectedIndex, playStream]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, playSelected);
	useKeyBinding(KEYBINDINGS.QUIT, goBack);
	useKeyBinding(KEYBINDINGS.BACK, goBack);

	const ITEMS_PER_PAGE = Math.max(5, rows - 15);
	const startIdx = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(ITEMS_PER_PAGE / 2),
			stations.length - ITEMS_PER_PAGE,
		),
	);
	const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, stations.length);
	const visibleItems = stations.slice(startIdx, endIdx);

	const currentLabel =
		playerState.playbackMode === 'stream' && playerState.currentStation
			? playerState.currentStation.name
			: null;

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.accent} bold>
					📻 Radio Streams ({stations.length})
				</Text>
				<Text color={theme.colors.dim}> • </Text>
				<Text color={theme.colors.dim}>[Enter] Play • [Esc/q] Back</Text>
			</Box>

			{currentLabel ? (
				<Box marginBottom={1}>
					<Text color={theme.colors.secondary}>
						Now streaming: {truncate(currentLabel, Math.floor(columns * 0.5))}
					</Text>
				</Box>
			) : null}

			{visibleItems.map((station, idx) => {
				const realIndex = startIdx + idx;
				const isSelected = realIndex === selectedIndex;
				const meta = [station.region, station.genre]
					.filter(Boolean)
					.join(' · ');

				return (
					<Box key={station.id}>
						<Text color={isSelected ? theme.colors.primary : theme.colors.dim}>
							{isSelected ? '> ' : '  '}
						</Text>
						<Text
							color={isSelected ? theme.colors.primary : theme.colors.text}
							bold={isSelected}
						>
							{truncate(station.name, Math.floor(columns * 0.45))}
						</Text>
						{meta ? (
							<Text color={theme.colors.dim}>
								{' '}
								• {truncate(meta, Math.floor(columns * 0.3))}
							</Text>
						) : null}
						{playerState.currentStation?.id === station.id ? (
							<Text color={theme.colors.accent}> LIVE</Text>
						) : null}
					</Box>
				);
			})}
		</Box>
	);
}
