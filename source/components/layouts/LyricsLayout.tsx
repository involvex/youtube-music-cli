// Lyrics view layout - displays synced or plain lyrics with karaoke-style
// word-level highlighting and a smooth color gradient sweep.
import {useEffect, useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {
	getLyricsService,
	type LyricLine,
} from '../../services/lyrics/lyrics.service.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {
	buildKaraokeCells,
	buildWordSpans,
	KARAOKE_TICK_MS,
	resolveKaraokeColors,
	type CharCell,
} from '../../utils/karaoke.ts';

const CONTEXT_LINES = 2; // Lines shown before/after current line
// Fixed chrome around the lyric list: header border/title (3) + status (1) +
// gaps (2) + footer (2) + outer padding/safety margin (~6)
const RESERVED_ROWS = 14;

export default function LyricsLayout() {
	const {theme} = useTheme();
	const {state} = usePlayer();
	const {dispatch} = useNavigation();
	const {rows} = useTerminalSize();

	// The footer promises "l or Esc to go back" — previously neither was
	// bound, so both appeared dead.
	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);
	useKeyBinding(resolveKeybinding('BACK'), goBack);
	useKeyBinding(['l'], goBack);
	const [lyrics, setLyrics] = useState<{
		synced: LyricLine[] | null;
		plain: string | null;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lyricsService = getLyricsService();

	// Interpolate a smooth clock between once-a-second progress ticks so the
	// karaoke sweep doesn't visibly stair-step.
	const [smoothProgress, setSmoothProgress] = useState(state.progress);
	useEffect(() => {
		const anchorProgress = state.progress;
		const anchorTime = Date.now();

		const tick = () => {
			const elapsed = state.isPlaying ? (Date.now() - anchorTime) / 1000 : 0;
			setSmoothProgress(
				Math.min(
					anchorProgress + elapsed,
					state.duration || Number.POSITIVE_INFINITY,
				),
			);
		};

		queueMicrotask(tick);
		if (!state.isPlaying) {
			return;
		}

		const interval = setInterval(tick, KARAOKE_TICK_MS);
		return () => {
			clearInterval(interval);
		};
	}, [state.progress, state.isPlaying, state.duration]);

	// Fetch lyrics when track changes
	useEffect(() => {
		const track = state.currentTrack;
		let cancelled = false;
		if (!track) {
			queueMicrotask(() => {
				if (!cancelled) {
					setLyrics(null);
					setLoading(false);
					setError(null);
				}
			});
			return;
		}

		const artist = track.artists?.[0]?.name ?? '';
		queueMicrotask(() => {
			if (!cancelled) {
				setLoading(true);
				setError(null);
			}
		});

		void lyricsService
			.getLyrics(track.title, artist, state.duration || undefined)
			.then(result => {
				if (cancelled) {
					return;
				}

				setLyrics(result);
				setLoading(false);
				if (!result) {
					setError('No lyrics found');
				}
			})
			.catch(() => {
				if (cancelled) {
					return;
				}

				setLoading(false);
				setError('Failed to load lyrics');
			});

		return () => {
			cancelled = true;
		};
	}, [lyricsService, state.currentTrack, state.duration]);

	const track = state.currentTrack;
	const title = track?.title ?? 'No track playing';
	const artist = track?.artists?.map(a => a.name).join(', ') ?? '';

	// Determine current line
	const currentLineIndex =
		lyrics?.synced && lyrics.synced.length > 0
			? lyricsService.getCurrentLineIndex(lyrics.synced, smoothProgress)
			: -1;

	const syncedLines = lyrics?.synced ?? [];
	const currentLine =
		currentLineIndex >= 0 ? syncedLines[currentLineIndex] : undefined;

	// Karaoke cells for the active line: real word timestamps when available
	// (Musixmatch richsync), otherwise a natural-pace estimate from line sync.
	const karaokeCells: CharCell[] | null = (() => {
		if (!currentLine) return null;
		const spans = buildWordSpans(
			currentLine,
			syncedLines[currentLineIndex + 1]?.time,
		);
		return buildKaraokeCells(
			spans,
			smoothProgress,
			resolveKaraokeColors(theme),
		);
	})();

	// Calculate visible lines window sized to fit the terminal
	const maxLines = Math.max(3, rows - RESERVED_ROWS);
	const visibleLines = (() => {
		if (!lyrics?.synced) return null;
		const start = Math.max(
			0,
			Math.min(currentLineIndex - CONTEXT_LINES, lyrics.synced.length - 1),
		);
		const end = Math.min(lyrics.synced.length, start + maxLines);
		return lyrics.synced.slice(start, end).map((line, i) => ({
			line,
			globalIndex: start + i,
		}));
	})();

	return (
		<Box flexDirection="column">
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
			>
				<Text bold color={theme.colors.primary}>
					{title}
				</Text>
				{artist && <Text color={theme.colors.secondary}> — {artist}</Text>}
			</Box>

			{loading && <Text color={theme.colors.accent}>Loading lyrics...</Text>}

			{error && !loading && <Text color={theme.colors.dim}>{error}</Text>}

			{/* Synced lyrics */}
			{!loading && visibleLines && (
				<Box flexDirection="column" paddingX={1}>
					{visibleLines.map(({line, globalIndex}) => {
						const isCurrent = globalIndex === currentLineIndex;

						if (isCurrent && karaokeCells) {
							return (
								<Text key={globalIndex} bold>
									{'▶ '}
									{karaokeCells.map((cell, i) => (
										<Text key={i} color={cell.color}>
											{cell.char}
										</Text>
									))}
								</Text>
							);
						}

						return (
							<Text
								key={globalIndex}
								color={
									globalIndex < currentLineIndex
										? theme.colors.dim
										: theme.colors.text
								}
							>
								{'  '}
								{line.text || '♪'}
							</Text>
						);
					})}
				</Box>
			)}

			{/* Plain lyrics fallback */}
			{!loading && !lyrics?.synced && lyrics?.plain && (
				<Box flexDirection="column" paddingX={1}>
					{lyrics.plain
						.split('\n')
						.slice(0, maxLines)
						.map((line, i) => (
							<Text key={i} color={theme.colors.text}>
								{line || ' '}
							</Text>
						))}
				</Box>
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>l</Text> or{' '}
					<Text color={theme.colors.text}>Esc</Text> to go back
				</Text>
			</Box>
		</Box>
	);
}
