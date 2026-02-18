// Shortcuts bar component
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';

export default function ShortcutsBar() {
	const {theme} = useTheme();
	const {
		state: playerState,
		pause,
		resume,
		next,
		previous,
		volumeUp,
		volumeDown,
		volumeFineUp,
		volumeFineDown,
		toggleShuffle,
		toggleRepeat,
	} = usePlayer();

	// Register key bindings globally
	const handlePlayPause = () => {
		if (playerState.isPlaying) {
			pause();
		} else {
			resume();
		}
	};

	useKeyBinding(KEYBINDINGS.PLAY_PAUSE, handlePlayPause);
	useKeyBinding(KEYBINDINGS.NEXT, next);
	useKeyBinding(KEYBINDINGS.PREVIOUS, previous);
	useKeyBinding(KEYBINDINGS.VOLUME_UP, volumeUp);
	useKeyBinding(KEYBINDINGS.VOLUME_DOWN, volumeDown);
	useKeyBinding(KEYBINDINGS.VOLUME_FINE_UP, volumeFineUp);
	useKeyBinding(KEYBINDINGS.VOLUME_FINE_DOWN, volumeFineDown);
	useKeyBinding(KEYBINDINGS.SHUFFLE, toggleShuffle);
	useKeyBinding(KEYBINDINGS.REPEAT, toggleRepeat);
	// Note: SETTINGS keybinding handled by MainLayout to avoid double-dispatch

	return (
		<Box
			borderStyle="single"
			borderColor={theme.colors.dim}
			paddingX={1}
			justifyContent="space-between"
		>
			{/* Left: Navigation shortcuts */}
			<Text color={theme.colors.dim}>
				Shortcuts: <Text color={theme.colors.text}>Space</Text> Play/Pause |{' '}
				<Text color={theme.colors.text}>→</Text> Next |{' '}
				<Text color={theme.colors.text}>←</Text> Prev |{' '}
				<Text color={theme.colors.text}>Shift+S</Text> 🔀 |{' '}
				<Text color={theme.colors.text}>r</Text> 🔄 |{' '}
				<Text color={theme.colors.text}>Shift+P</Text> Playlists |{' '}
				<Text color={theme.colors.text}>Shift+D</Text> Download |{' '}
				<Text color={theme.colors.text}>m</Text> Mix |{' '}
				<Text color={theme.colors.text}>/</Text> Search |{' '}
				<Text color={theme.colors.text}>?</Text> Help |{' '}
				<Text color={theme.colors.text}>q</Text> Quit
			</Text>

			{/* Right: Playback mode + volume indicator */}
			<Text color={theme.colors.text}>
				<Text
					color={playerState.shuffle ? theme.colors.primary : theme.colors.dim}
				>
					🔀
				</Text>{' '}
				<Text
					color={
						playerState.repeat === 'off'
							? theme.colors.dim
							: theme.colors.secondary
					}
				>
					{playerState.repeat === 'one' ? '🔂' : '🔄'}
				</Text>{' '}
				<Text color={theme.colors.dim}>[=/</Text>-
				<Text color={theme.colors.dim}>]</Text> Vol:{' '}
				<Text color={theme.colors.primary}>{playerState.volume}%</Text>
			</Text>
		</Box>
	);
}
