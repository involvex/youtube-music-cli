import {usePlayer} from '../../hooks/usePlayer.ts';
import NowPlaying from '../player/NowPlaying.tsx';
import PlayerControls from '../player/PlayerControls.tsx';
import QueueList from '../player/QueueList.tsx';
import {Box} from 'ink';

export default function PlayerLayout() {
	const {state: playerState} = usePlayer();

	return (
		<Box flexDirection="column">
			<NowPlaying />
			<PlayerControls />
			{playerState.queue.length > 0 && <QueueList />}
		</Box>
	);
}
