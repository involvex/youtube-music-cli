// Now playing component
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useFavorites} from '../../stores/favorites.store.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import {formatTime} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {getSleepTimerService} from '../../services/sleep-timer/sleep-timer.service.ts';
import {useState, useEffect} from 'react';
import {ICONS} from '../../utils/icons.ts';

export default function NowPlaying() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();
	const {isFavorite} = useFavorites();
	const {columns} = useTerminalSize();
	const sleepTimer = getSleepTimerService();
	const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);

	// Poll sleep timer remaining every second
	useEffect(() => {
		if (!sleepTimer.isActive()) {
			return;
		}
		const interval = setInterval(() => {
			const remaining = sleepTimer.getRemainingSeconds();
			setSleepRemaining(remaining);
			if (remaining === null || remaining === 0) {
				clearInterval(interval);
			}
		}, 1000);
		return () => {
			clearInterval(interval);
		};
	}, [sleepTimer]);

	if (!playerState.currentTrack) {
		return (
			<Box borderStyle="round" borderColor={theme.colors.dim} paddingX={1}>
				<Text color={theme.colors.dim}>No track playing</Text>
			</Box>
		);
	}

	const track = playerState.currentTrack;
	const artists =
		track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

	// Clamp progress to valid range
	const progress = Math.max(
		0,
		Math.min(playerState.progress, playerState.duration || 0),
	);
	const duration = playerState.duration || 0;
	const percentage =
		duration > 0 ? Math.min(100, Math.floor((progress / duration) * 100)) : 0;
	const barWidth = Math.max(10, columns - 8);
	const filledWidth =
		duration > 0 ? Math.floor((progress / duration) * barWidth) : 0;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={theme.colors.primary}
			paddingX={1}
		>
			{/* Title & Artist on same line if space allows */}
			<Box>
				<Text bold color={theme.colors.primary}>
					{isFavorite(track.videoId) ? `${ICONS.HEART} ` : ''}
					{track.title}
				</Text>
				<Text color={theme.colors.dim}> • </Text>
				<Text color={theme.colors.secondary}>{artists}</Text>
			</Box>

			{/* Album */}
			{track.album && <Text color={theme.colors.dim}>{track.album.name}</Text>}

			{/* Progress Bar */}
			<Box>
				<Text color={theme.colors.primary}>
					{'█'.repeat(Math.min(filledWidth, barWidth))}
				</Text>
				<Text color={theme.colors.dim}>
					{'░'.repeat(Math.max(0, barWidth - filledWidth))}
				</Text>
			</Box>

			{/* Time display */}
			<Box>
				<Text color={theme.colors.text}>{formatTime(progress)}</Text>
				<Text color={theme.colors.dim}> / {formatTime(duration)} </Text>
				<Text color={theme.colors.dim}>[{percentage}%]</Text>
				{playerState.isLoading && (
					<Text color={theme.colors.accent}> Loading...</Text>
				)}
				{!playerState.isPlaying && progress > 0 && (
					<Text color={theme.colors.dim}> {ICONS.PAUSE}</Text>
				)}
				{playerState.shuffle && (
					<Text color={theme.colors.primary}> {ICONS.SHUFFLE}</Text>
				)}
				{sleepRemaining !== null && (
					<Text color={theme.colors.warning}>
						{' '}
						⏾ {formatTime(sleepRemaining)}
					</Text>
				)}
			</Box>

			{/* Error */}
			{playerState.error && (
				<Text color={theme.colors.error}>{playerState.error}</Text>
			)}
		</Box>
	);
}
