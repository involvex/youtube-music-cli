import {Box} from 'ink';
import PlayerControls from '../player/PlayerControls.tsx';
import NowPlaying from '../player/NowPlaying.tsx';
import RadioStationsList from '../radio/RadioStationsList.tsx';

export default function RadioStreamsLayout() {
	return (
		<Box flexDirection="column" flexGrow={1}>
			<NowPlaying />
			<PlayerControls />
			<RadioStationsList />
		</Box>
	);
}
