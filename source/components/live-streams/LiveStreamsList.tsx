import {useState, useCallback, useMemo} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {truncate} from '../../utils/format.ts';
import {
	getLiveStreams,
	toRadioStation,
} from '../../services/live-streams/live-streams.service.ts';

export default function LiveStreamsList() {
	const {theme} = useTheme();
	const {playStream, state: playerState} = usePlayer();
	const {dispatch} = useNavigation();
	const {columns, rows: termRows} = useTerminalSize();
	const streams = useMemo(() => getLiveStreams(), []);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => (prev > 0 ? prev - 1 : streams.length - 1));
	}, [streams.length]);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => (prev < streams.length - 1 ? prev + 1 : 0));
	}, [streams.length]);

	const playSelected = useCallback(() => {
		const entry = streams[selectedIndex];
		if (!entry) {
			return;
		}
		playStream(toRadioStation(entry));
	}, [streams, selectedIndex, playStream]);

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(resolveKeybinding('BACK'), goBack);

	const maxVisible = Math.max(5, termRows - 14);
	const start = Math.max(
		0,
		Math.min(
			selectedIndex - Math.floor(maxVisible / 2),
			Math.max(0, streams.length - maxVisible),
		),
	);
	const visible = streams.slice(start, start + maxVisible);
	const nameWidth = Math.max(20, Math.min(48, columns - 36));

	return (
		<Box flexDirection="column" flexGrow={1} paddingX={1}>
			<Box marginBottom={1}>
				<Text bold color={theme.colors.primary}>
					Live Streams ({streams.length})
				</Text>
				<Text color={theme.colors.dim}> · yt-dlp / mpv · Enter play</Text>
			</Box>

			{streams.length === 0 ? (
				<Text color={theme.colors.dim}>No live streams in catalog</Text>
			) : (
				visible.map((entry, offset) => {
					const index = start + offset;
					const isSelected = index === selectedIndex;
					const isPlaying =
						playerState.playbackMode === 'stream' &&
						playerState.currentStation?.id === entry.id;
					const tags = entry.tags.join(', ');
					const prefix = isPlaying ? '▶ ' : isSelected ? '> ' : '  ';

					return (
						<Box key={entry.id}>
							<Text
								bold={isSelected}
								color={
									isPlaying
										? theme.colors.success
										: isSelected
											? theme.colors.primary
											: theme.colors.text
								}
							>
								{prefix}
								{truncate(entry.name, nameWidth)}
							</Text>
							<Text color={theme.colors.dim}> · {tags}</Text>
						</Box>
					);
				})
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					[↑↓] Select · [Enter] Play · [Esc] Back
				</Text>
			</Box>
		</Box>
	);
}
