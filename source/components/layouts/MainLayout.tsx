// Main layout shell
import React from 'react';
import {useNavigation} from '../../stores/navigation.store.tsx';
import PlaylistList from '../playlist/PlaylistList.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import SearchLayout from './SearchLayout.tsx';
import PlayerLayout from './PlayerLayout.tsx';
import {Box} from 'ink';

export default function MainLayout() {
	const {theme} = useTheme();
	const {state: navState} = useNavigation();

	const renderView = () => {
		switch (navState.currentView) {
			case 'player':
				return <PlayerLayout />;

			case 'search':
				return <SearchLayout />;

			case 'playlists':
				return <PlaylistList />;

			default:
				return <PlayerLayout />;
		}
	};

	return (
		<Box
			flexDirection="column"
			paddingX={1}
			borderStyle="single"
			borderColor={theme.colors.primary}
		>
			{renderView()}
		</Box>
	);
}
