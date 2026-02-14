// Player controls component
import React from 'react';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {Box, Text} from 'ink';

export default function PlayerControls() {
	const {theme} = useTheme();
	const {
		state: playerState,
		pause,
		resume,
		next,
		previous,
		volumeUp,
		volumeDown,
	} = usePlayer();

	const handlePlayPause = () => {
		if (playerState.isPlaying) {
			pause();
		} else {
			resume();
		}
	};

	// Keyboard bindings
	useKeyBinding(KEYBINDINGS.PLAY_PAUSE, handlePlayPause);
	useKeyBinding(KEYBINDINGS.NEXT, next);
	useKeyBinding(KEYBINDINGS.PREVIOUS, previous);
	useKeyBinding(KEYBINDINGS.VOLUME_UP, volumeUp);
	useKeyBinding(KEYBINDINGS.VOLUME_DOWN, volumeDown);

	return (
		<Box
			flexDirection="row"
			justifyContent="space-between"
			paddingX={2}
			borderStyle="classic"
			borderColor={theme.colors.dim}
		>
			{/* Previous */}
			<Text color={theme.colors.text}>
				[<Text color={theme.colors.dim}>b</Text>] Prev
			</Text>

			{/* Play/Pause */}
			<Text color={theme.colors.primary}>
				{playerState.isPlaying ? (
					<Text>
						[<Text color={theme.colors.dim}>Space</Text>] Pause
					</Text>
				) : (
					<Text>
						[<Text color={theme.colors.dim}>Space</Text>] Play
					</Text>
				)}
			</Text>

			{/* Next */}
			<Text color={theme.colors.text}>
				[<Text color={theme.colors.dim}>n</Text>] Next
			</Text>

			{/* Volume */}
			<Text color={theme.colors.text}>
				[<Text color={theme.colors.dim}>+/-</Text>] Vol: {playerState.volume}%
			</Text>
		</Box>
	);
}
