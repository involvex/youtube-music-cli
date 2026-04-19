// Home / Startup screen component
import {Box, Text} from 'ink';
import {useState} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useHistory} from '../../stores/history.store.tsx';
import {useFavorites} from '../../stores/favorites.store.tsx';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {VIEW, KEYBINDINGS} from '../../utils/constants.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {truncate, formatTime} from '../../utils/format.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {ICONS} from '../../utils/icons.ts';
import {getMusicService} from '../../services/youtube-music/api.ts';
import {type Track} from '../../types/youtube-music.types.ts';

export default function HomeLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {history} = useHistory();
	const {favorites, toggleFavorite} = useFavorites();
	const {state: playerState, play} = usePlayer();
	const {columns} = useTerminalSize();

	const [selectedIndex, setSelectedIndex] = useState(0);

	const RANDOM_QUERIES = [
		'top hits 2024',
		'popular songs',
		'trending music',
		'chill vibes',
		'rock classics',
		'indie hits',
		'hip hop bangers',
		'electronic dance',
		'acoustic favorites',
		'feel good music',
		'jazz essentials',
		'r&b hits',
		'summer songs',
	];

	const handlePlayRandom = () => {
		const query =
			RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)]!;
		getMusicService()
			.search(query, {type: 'songs', limit: 10})
			.then(response => {
				const tracks = response.results
					.filter(r => r.type === 'song')
					.map(r => r.data as Track);
				if (tracks.length > 0) {
					const track = tracks[Math.floor(Math.random() * tracks.length)]!;
					play(track, {clearQueue: true});
				}
			})
			.catch(() => {});
	};

	const handlePlayRandomFavorite = () => {
		if (favorites.length === 0) {
			return;
		}
		const randomIndex = Math.floor(Math.random() * favorites.length);
		const track = favorites[randomIndex];
		if (track) {
			play(track, {clearQueue: true});
		}
	};

	type QuickLink =
		| {label: string; view: (typeof VIEW)[keyof typeof VIEW]; action?: never}
		| {label: string; view?: never; action: () => void};

	// Quick links
	const quickLinks: QuickLink[] = [
		{label: '🔍 Search', view: VIEW.SEARCH},
		{label: '📜 Playlists', view: VIEW.PLAYLISTS},
		{label: '🔥 Trending', view: VIEW.TRENDING},
		{label: '🆕 New Releases', view: VIEW.NEW_RELEASES},
		{label: '❤️ Favorites', view: VIEW.FAVORITES},
		{label: '🕒 History', view: VIEW.HISTORY},
		{label: '🎲 Play Random Song', action: handlePlayRandom},
		{label: '🎵 Play Random Favorite', action: handlePlayRandomFavorite},
	];

	const recentHistory = history.slice(0, 5);
	const recentFavorites = favorites.slice(0, 5);

	const totalItems =
		quickLinks.length + recentHistory.length + recentFavorites.length;

	const handleSelect = () => {
		if (selectedIndex < quickLinks.length) {
			const link = quickLinks[selectedIndex]!;
			if (link.action) {
				link.action();
			} else {
				dispatch({category: 'NAVIGATE', view: link.view});
			}
		} else if (selectedIndex < quickLinks.length + recentHistory.length) {
			const entry = recentHistory[selectedIndex - quickLinks.length];
			if (entry) play(entry.track, {clearQueue: true});
		} else {
			const track =
				recentFavorites[
					selectedIndex - quickLinks.length - recentHistory.length
				];
			if (track) play(track, {clearQueue: true});
		}
	};

	useKeyBinding(KEYBINDINGS.UP, () => {
		setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
	});

	useKeyBinding(KEYBINDINGS.DOWN, () => {
		setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
	});

	useKeyBinding(KEYBINDINGS.SELECT, handleSelect);
	useKeyBinding(KEYBINDINGS.SEARCH, () =>
		dispatch({category: 'NAVIGATE', view: VIEW.SEARCH}),
	);

	useKeyBinding(KEYBINDINGS.TOGGLE_FAVORITE, () => {
		if (playerState.currentTrack) {
			toggleFavorite(playerState.currentTrack);
		}
	});

	const maxTitleLength = Math.max(20, columns - 40);

	// Progress bar calculation
	const progress = Math.max(
		0,
		Math.min(playerState.progress, playerState.duration || 0),
	);
	const duration = playerState.duration || 0;
	const barWidth = Math.max(10, columns - 30);
	const filledWidth =
		duration > 0 ? Math.floor((progress / duration) * barWidth) : 0;

	return (
		<Box flexDirection="column" paddingX={1} paddingY={0}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.primary}
				paddingX={1}
				justifyContent="center"
			>
				<Text bold color={theme.colors.primary}>
					🎵 {ICONS.PLAY} youtube-music-cli {ICONS.PLAY} 🎵
				</Text>
			</Box>

			<Box flexDirection="row" gap={1}>
				{/* Left Column: Quick Links */}
				<Box
					flexDirection="column"
					width="25%"
					borderStyle="round"
					borderColor={theme.colors.dim}
					paddingX={1}
				>
					<Box marginBottom={0}>
						<Text bold color={theme.colors.secondary}>
							Quick Links
						</Text>
					</Box>
					{quickLinks.map((link, index) => (
						<Box key={link.label}>
							<Text
								backgroundColor={
									selectedIndex === index ? theme.colors.primary : undefined
								}
								color={
									selectedIndex === index
										? theme.colors.background
										: theme.colors.text
								}
							>
								{selectedIndex === index ? '> ' : '  '}
								{link.label}
							</Text>
						</Box>
					))}
				</Box>

				{/* Right Column: Activity */}
				<Box flexDirection="column" flexGrow={1}>
					{/* Recently Played */}
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor={theme.colors.dim}
						paddingX={1}
					>
						<Text bold color={theme.colors.secondary}>
							🕒 Recently Played
						</Text>
						{recentHistory.length === 0 ? (
							<Text color={theme.colors.dim}> No history yet</Text>
						) : (
							recentHistory.map((entry, index) => {
								const actualIndex = index + quickLinks.length;
								return (
									<Box key={`${entry.playedAt}-${entry.track.videoId}`}>
										<Text
											backgroundColor={
												selectedIndex === actualIndex
													? theme.colors.primary
													: undefined
											}
											color={
												selectedIndex === actualIndex
													? theme.colors.background
													: theme.colors.text
											}
										>
											{selectedIndex === actualIndex ? '> ' : '  '}
											{truncate(entry.track.title, maxTitleLength)}
										</Text>
										<Text color={theme.colors.dim} wrap="truncate">
											{' '}
											- {entry.track.artists[0]?.name}
										</Text>
									</Box>
								);
							})
						)}
					</Box>

					{/* Top Favorites */}
					<Box
						flexDirection="column"
						borderStyle="round"
						borderColor={theme.colors.dim}
						paddingX={1}
					>
						<Text bold color={theme.colors.secondary}>
							{ICONS.HEART} Recent Favorites
						</Text>
						{recentFavorites.length === 0 ? (
							<Text color={theme.colors.dim}>
								{' '}
								No favorites yet (press 'f' while playing)
							</Text>
						) : (
							recentFavorites.map((track, index) => {
								const actualIndex =
									index + quickLinks.length + recentHistory.length;
								return (
									<Box key={track.videoId}>
										<Text
											backgroundColor={
												selectedIndex === actualIndex
													? theme.colors.primary
													: undefined
											}
											color={
												selectedIndex === actualIndex
													? theme.colors.background
													: theme.colors.text
											}
										>
											{selectedIndex === actualIndex ? '> ' : '  '}
											{truncate(track.title, maxTitleLength)}
										</Text>
										<Text color={theme.colors.dim} wrap="truncate">
											{' '}
											- {track.artists[0]?.name}
										</Text>
									</Box>
								);
							})
						)}
					</Box>
				</Box>
			</Box>

			{/* Player Status / Progress Bar */}
			{playerState.currentTrack && (
				<Box
					flexDirection="column"
					borderStyle="round"
					borderColor={theme.colors.primary}
					paddingX={1}
					marginY={0}
				>
					<Box justifyContent="space-between">
						<Box>
							<Text color={theme.colors.secondary}>
								{playerState.isPlaying ? ICONS.PLAY : ICONS.PAUSE} Currently
								playing:{' '}
							</Text>
							<Text bold color={theme.colors.primary}>
								{truncate(playerState.currentTrack.title, columns - 45)}
							</Text>
						</Box>
						<Text color={theme.colors.dim}>
							{formatTime(progress)} / {formatTime(duration)}
						</Text>
					</Box>
					<Box>
						<Text color={theme.colors.primary}>
							{'█'.repeat(Math.min(filledWidth, barWidth))}
						</Text>
						<Text color={theme.colors.dim}>
							{'░'.repeat(Math.max(0, barWidth - filledWidth))}
						</Text>
					</Box>
				</Box>
			)}

			{/* Footer / Shortcuts */}
			<Box
				paddingX={1}
				borderStyle="single"
				borderColor={theme.colors.dim}
				flexDirection="row"
				justifyContent="space-between"
			>
				<Box>
					<Text color={theme.colors.dim}>
						Navigate: Arrows • Select: Enter • Search: / • Quit: q
					</Text>
				</Box>
				<Box>
					<Text color={theme.colors.dim}>
						f: Favorites • Shift+H: History • ,: Settings
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
