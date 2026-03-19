import {Box} from 'ink';
import FavoritesList from '../favorites/FavoritesList.tsx';
import PlayerControls from '../player/PlayerControls.tsx';
import NowPlaying from '../player/NowPlaying.tsx';

export default function FavoritesLayout() {
	return (
		<Box flexDirection="column" flexGrow={1}>
			<NowPlaying />
			<PlayerControls />
			<FavoritesList />
		</Box>
	);
}
