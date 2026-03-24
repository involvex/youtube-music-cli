// Lyrics view layout - displays synced or plain lyrics
import {useState, useEffect, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {
	getLyricsService,
	type LyricLine,
} from '../../services/lyrics/lyrics.service.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';

const CONTEXT_LINES = 3; // Lines shown before/after current line

export default function LyricsLayout() {
	const {theme} = useTheme();
	const {state} = usePlayer();
	const {rows} = useTerminalSize();
	const [lyrics, setLyrics] = useState<{
		synced: LyricLine[] | null;
		plain: string | null;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const lyricsService = getLyricsService();
	const {dispatch} = useNavigation();

	const goBack = useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	useKeyBinding(['escape'], goBack, {bypassBlock: true});

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
	const currentLineIndex = lyrics?.synced
		? lyricsService.getCurrentLineIndex(lyrics.synced, state.progress)
		: -1;

	// Calculate visible lines window
	const visibleLines = (() => {
		if (!lyrics?.synced) return null;
		const start = Math.max(0, currentLineIndex - CONTEXT_LINES);
		const maxLines = Math.max(5, rows - 8);
		const end = Math.min(lyrics.synced.length, start + maxLines);
		return lyrics.synced.slice(start, end).map((line, i) => ({
			line,
			globalIndex: start + i,
		}));
	})();

	return (
		<Box flexDirection="column" gap={1}>
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
					{visibleLines.map(({line, globalIndex}) => (
						<Text
							key={globalIndex}
							bold={globalIndex === currentLineIndex}
							color={
								globalIndex === currentLineIndex
									? theme.colors.primary
									: globalIndex < currentLineIndex
										? theme.colors.dim
										: theme.colors.text
							}
						>
							{globalIndex === currentLineIndex ? '▶ ' : '  '}
							{line.text || '♪'}
						</Text>
					))}
				</Box>
			)}

			{/* Plain lyrics fallback */}
			{!loading && !lyrics?.synced && lyrics?.plain && (
				<Box flexDirection="column" paddingX={1}>
					{lyrics.plain
						.split('\n')
						.slice(0, Math.max(5, rows - 8))
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
