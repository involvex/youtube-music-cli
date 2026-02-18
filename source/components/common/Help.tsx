// Help component for keyboard shortcuts
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';

export default function Help() {
	const {theme} = useTheme();
	const {dispatch: _dispatch} = useNavigation();

	return (
		<Box flexDirection="column" gap={1} padding={1}>
			<Box
				borderStyle="single"
				borderColor={theme.colors.secondary}
				paddingX={1}
			>
				<Text bold color={theme.colors.primary}>
					Keyboard Shortcuts
				</Text>
			</Box>

			<Box flexDirection="column" gap={1}>
				{/* Global */}
				<Text bold color={theme.colors.secondary}>
					Global
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>q</Text> - Quit
						<Text> | </Text>
						<Text color={theme.colors.text}>?</Text> - Help
						<Text> | </Text>
						<Text color={theme.colors.text}>/</Text> - Search
						<Text> | </Text>
						<Text color={theme.colors.text}>Shift+P</Text> - Playlists
						<Text> | </Text>
						<Text color={theme.colors.text}>p</Text> - Plugins
						<Text> | </Text>
						<Text color={theme.colors.text}>g</Text> - Suggestions
						<Text> | </Text>
						<Text color={theme.colors.text}>,</Text> - Settings
					</Text>
				</Box>

				{/* Player */}
				<Text bold color={theme.colors.secondary}>
					Player
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>Space</Text> - Play/Pause
						<Text> | </Text>
						<Text color={theme.colors.text}>n</Text> - Next
						<Text> | </Text>
						<Text color={theme.colors.text}>b</Text> - Previous
						<Text> | </Text>
						<Text color={theme.colors.text}>=</Text> - Volume Up
						<Text> | </Text>
						<Text color={theme.colors.text}>-</Text> - Volume Down
						<Text> | </Text>
						<Text color={theme.colors.text}>Shift+S</Text> - Toggle Shuffle
						<Text> | </Text>
						<Text color={theme.colors.text}>r</Text> - Toggle Repeat
					</Text>
				</Box>

				{/* Navigation */}
				<Text bold color={theme.colors.secondary}>
					Navigation
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>Up</Text> /<Text> </Text>
						<Text color={theme.colors.text}>k</Text> - Move Up
						<Text> | </Text>
						<Text color={theme.colors.text}>Down</Text> /<Text> </Text>
						<Text color={theme.colors.text}>j</Text> - Move Down
						<Text> | </Text>
						<Text color={theme.colors.text}>Enter</Text> - Select
						<Text> | </Text>
						<Text color={theme.colors.text}>Esc</Text> - Go Back
					</Text>
				</Box>

				{/* Search */}
				<Text bold color={theme.colors.secondary}>
					Search
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>Tab</Text> - Switch Search Type
						<Text> | </Text>
						<Text color={theme.colors.text}>m</Text> - Create Mix Playlist
						<Text> | </Text>
						<Text color={theme.colors.text}>Shift+D</Text> - Download selection
						<Text> | </Text>
						<Text color={theme.colors.text}>Esc</Text> - Clear Search
						<Text> | </Text>
						<Text color={theme.colors.text}>[ / ]</Text> - Results Limit
					</Text>
				</Box>

				{/* Playlist */}
				<Text bold color={theme.colors.secondary}>
					Playlist
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>a</Text> - Add to Playlist
						<Text> | </Text>
						<Text color={theme.colors.text}>d</Text> - Remove from Playlist
						<Text> | </Text>
						<Text color={theme.colors.text}>c</Text> - Create Playlist
						<Text> | </Text>
						<Text color={theme.colors.text}>Shift+D</Text> - Download Playlist
						<Text> | </Text>
						<Text color={theme.colors.text}>D</Text> - Delete Playlist
					</Text>
				</Box>

				{/* View */}
				<Text bold color={theme.colors.secondary}>
					View
				</Text>
				<Box paddingX={2}>
					<Text>
						<Text color={theme.colors.text}>M</Text> - Toggle Mini Player
						<Text> | </Text>
						<Text color={theme.colors.text}>l</Text> - Lyrics
						<Text> | </Text>
						<Text color={theme.colors.text}>T</Text> - Trending
						<Text> | </Text>
						<Text color={theme.colors.text}>e</Text> - Explore
					</Text>
				</Box>

				{/* Instructions */}
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>Esc</Text> or{' '}
					<Text color={theme.colors.text}>?</Text> to close
				</Text>
			</Box>
		</Box>
	);
}
