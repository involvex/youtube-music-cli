import PlayerControls from '../player/PlayerControls.tsx';
import {usePlayer} from '../../hooks/usePlayer.ts';
import NowPlaying from '../player/NowPlaying.tsx';
import ProgressBar from '../player/ProgressBar.tsx';
import QueueList from '../player/QueueList.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box, Text} from 'ink';
import {useCallback} from 'react';

export default function PlayerLayout() {
	const {theme} = useTheme();
	const {state: playerState} = usePlayer();
	const {dispatch} = useNavigation();

	const goHelp = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.HELP});
	}, [dispatch]);

	useKeyBinding(KEYBINDINGS.HELP, goHelp);

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					YouTube Music CLI
				</Text>
				<Text> </Text>
				<Text color={theme.colors.dim}>v0.0.1</Text>
			</Box>

			<NowPlaying />

			<PlayerControls />

			<ProgressBar />

			{playerState.queue.length > 0 && <QueueList />}

			<Box
				marginTop={1}
				borderColor={theme.colors.dim}
				borderStyle="classic"
				paddingX={1}
			>
				<Text color={theme.colors.dim}>
					Shortcuts: <Text color={theme.colors.text}>Space</Text> Play/Pause
					{' | '}
					<Text color={theme.colors.text}>n</Text> Next
					{' | '}
					<Text color={theme.colors.text}>p</Text> Previous
					{' | '}
					<Text color={theme.colors.text}>/</Text> Search
					{' | '}
					<Text color={theme.colors.text}>?</Text> Help
				</Text>
			</Box>
		</Box>
	);
}
