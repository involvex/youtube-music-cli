import {useCallback, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useHistory} from '../../stores/history.store.tsx';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {truncate} from '../../utils/format.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import type {Track} from '../../types/youtube-music.types.ts';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'short',
	timeStyle: 'short',
});

type FocusPane = 'queue' | 'history';

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return iso;
	}

	return DATE_FORMATTER.format(date);
}

function trackLabel(track: Track): string {
	const artists = track.artists
		?.map(artist => artist.name)
		.join(', ')
		.trim();
	return artists ? `${track.title} • ${artists}` : track.title;
}

export default function HistoryLayout() {
	const {theme} = useTheme();
	const {history} = useHistory();
	const {columns, rows} = useTerminalSize();
	const {dispatch} = useNavigation();
	const {
		state: playerState,
		play,
		addToQueue,
		playNext,
		removeFromQueue,
		setQueuePosition,
		clearQueue,
	} = usePlayer();

	const [focus, setFocus] = useState<FocusPane>(() =>
		playerState.queue.length > 0 ? 'queue' : 'history',
	);
	const [queueIndex, setQueueIndex] = useState(0);
	const [historyIndex, setHistoryIndex] = useState(0);

	const queue = playerState.queue;
	const queuePosition = playerState.queuePosition;
	const effectiveQueueIndex =
		queue.length === 0 ? 0 : Math.min(queueIndex, queue.length - 1);
	const effectiveHistoryIndex =
		history.length === 0 ? 0 : Math.min(historyIndex, history.length - 1);

	const maxVisible = Math.max(4, Math.floor((rows - 12) / 2));
	const titleWidth = Math.max(24, columns - 28);

	const queueStart = useMemo(() => {
		if (queue.length === 0) return 0;
		return Math.max(
			0,
			Math.min(
				effectiveQueueIndex - Math.floor(maxVisible / 2),
				Math.max(0, queue.length - maxVisible),
			),
		);
	}, [queue.length, effectiveQueueIndex, maxVisible]);

	const historyStart = useMemo(() => {
		if (history.length === 0) return 0;
		return Math.max(
			0,
			Math.min(
				effectiveHistoryIndex - Math.floor(maxVisible / 2),
				Math.max(0, history.length - maxVisible),
			),
		);
	}, [history.length, effectiveHistoryIndex, maxVisible]);

	const navigateUp = useCallback(() => {
		if (focus === 'queue') {
			setQueueIndex(prev => Math.max(0, prev - 1));
			return;
		}
		setHistoryIndex(prev => Math.max(0, prev - 1));
	}, [focus]);

	const navigateDown = useCallback(() => {
		if (focus === 'queue') {
			setQueueIndex(prev =>
				queue.length === 0 ? 0 : Math.min(queue.length - 1, prev + 1),
			);
			return;
		}
		setHistoryIndex(prev =>
			history.length === 0 ? 0 : Math.min(history.length - 1, prev + 1),
		);
	}, [focus, queue.length, history.length]);

	const toggleFocus = useCallback(() => {
		setFocus(prev => (prev === 'queue' ? 'history' : 'queue'));
	}, []);

	const playSelected = useCallback(() => {
		if (focus === 'queue') {
			if (!queue[effectiveQueueIndex]) return;
			setQueuePosition(effectiveQueueIndex);
			return;
		}
		const entry = history[effectiveHistoryIndex];
		if (entry) {
			play(entry.track, {clearQueue: false});
		}
	}, [
		focus,
		queue,
		effectiveQueueIndex,
		history,
		effectiveHistoryIndex,
		setQueuePosition,
		play,
	]);

	const enqueueSelected = useCallback(() => {
		if (focus === 'history') {
			const entry = history[effectiveHistoryIndex];
			if (entry) addToQueue(entry.track);
			return;
		}
		const track = queue[effectiveQueueIndex];
		if (track) addToQueue(track);
	}, [
		focus,
		history,
		effectiveHistoryIndex,
		queue,
		effectiveQueueIndex,
		addToQueue,
	]);

	const playNextSelected = useCallback(() => {
		if (focus === 'history') {
			const entry = history[effectiveHistoryIndex];
			if (entry) playNext(entry.track);
			return;
		}
		const track = queue[effectiveQueueIndex];
		if (track) playNext(track);
	}, [
		focus,
		history,
		effectiveHistoryIndex,
		queue,
		effectiveQueueIndex,
		playNext,
	]);

	const removeSelected = useCallback(() => {
		if (focus !== 'queue' || queue.length === 0) return;
		removeFromQueue(effectiveQueueIndex);
	}, [focus, queue.length, effectiveQueueIndex, removeFromQueue]);

	useKeyBinding(resolveKeybinding('BACK'), () => {
		dispatch({category: 'GO_BACK'});
	});
	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), playSelected);
	useKeyBinding(['tab'], toggleFocus);
	useKeyBinding(resolveKeybinding('ADD_TO_QUEUE'), enqueueSelected);
	useKeyBinding(resolveKeybinding('PLAY_NEXT'), playNextSelected);
	useKeyBinding(['d', 'delete', 'backspace'], removeSelected);
	useKeyBinding(['c'], () => {
		if (focus === 'queue') clearQueue();
	});

	return (
		<Box flexDirection="column" paddingX={1} flexGrow={1}>
			<Box marginBottom={0}>
				<Text color={theme.colors.primary} bold>
					Queue & History
				</Text>
				<Text color={theme.colors.dim}>
					{' '}
					· Tab switch · saved across restarts
				</Text>
			</Box>

			<Box flexDirection="column" marginBottom={0}>
				<Text
					bold
					color={
						focus === 'queue' ? theme.colors.primary : theme.colors.secondary
					}
				>
					{focus === 'queue' ? '> ' : '  '}Playback Queue ({queue.length})
					{queue.length > 0 ? ` · #${queuePosition + 1} playing` : ''}
				</Text>

				{queue.length === 0 ? (
					<Text color={theme.colors.dim}> Queue empty — W/Y from search</Text>
				) : (
					<Box
						flexDirection="column"
						height={maxVisible}
						overflow="hidden"
						contentOffsetY={queueStart}
						flexShrink={0}
					>
						{queue.map((track, index) => {
							const isSelected =
								focus === 'queue' && index === effectiveQueueIndex;
							const isCurrent = index === queuePosition;
							const prefix = isCurrent ? '▶' : isSelected ? '>' : ' ';
							return (
								<Box key={`q-${track.videoId}-${index}`} flexShrink={0}>
									<Text
										bold={isSelected || isCurrent}
										color={
											isCurrent
												? theme.colors.success
												: isSelected
													? theme.colors.primary
													: theme.colors.text
										}
									>
										{prefix} {String(index + 1).padStart(2)}{' '}
										{truncate(trackLabel(track), titleWidth)}
									</Text>
								</Box>
							);
						})}
					</Box>
				)}
			</Box>

			<Box flexDirection="column" marginTop={1}>
				<Text
					bold
					color={
						focus === 'history' ? theme.colors.primary : theme.colors.secondary
					}
				>
					{focus === 'history' ? '> ' : '  '}Recently Played ({history.length})
				</Text>

				{history.length === 0 ? (
					<Text color={theme.colors.dim}> No listening history yet.</Text>
				) : (
					<Box
						flexDirection="column"
						height={maxVisible}
						overflow="hidden"
						contentOffsetY={historyStart}
						flexShrink={0}
					>
						{history.map((entry, index) => {
							const isSelected =
								focus === 'history' && index === effectiveHistoryIndex;
							const prefix = isSelected ? '>' : ' ';
							return (
								<Box
									key={`${entry.playedAt}-${entry.track.videoId}-${index}`}
									flexShrink={0}
								>
									<Text
										bold={isSelected}
										color={isSelected ? theme.colors.primary : theme.colors.dim}
									>
										{prefix} {formatTimestamp(entry.playedAt)}{' '}
									</Text>
									<Text
										bold={isSelected}
										color={
											isSelected ? theme.colors.primary : theme.colors.text
										}
									>
										{truncate(trackLabel(entry.track), titleWidth - 14)}
									</Text>
								</Box>
							);
						})}
					</Box>
				)}
			</Box>

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					[↑↓] Select · [Enter] Play · [W] Queue · [Y] Play next · [D] Remove
					queue · [C] Clear · [Tab] Pane · [Esc] Back
				</Text>
			</Box>
		</Box>
	);
}
