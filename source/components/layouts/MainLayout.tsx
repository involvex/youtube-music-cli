// Main layout shell
import React from 'react';
import {useNavigation} from '../../hooks/useNavigation.ts';
import PlaylistList from '../playlist/PlaylistList.tsx';
import Help from '../common/Help.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import SearchLayout from './SearchLayout.tsx';
import PlayerLayout from './PlayerLayout.tsx';
import Suggestions from '../player/Suggestions.tsx';
import Settings from '../settings/Settings.tsx';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box} from 'ink';

export default function MainLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();

	// Navigate to different views
	const goToSearch = React.useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SEARCH});
	}, [dispatch]);

	const goToPlaylists = React.useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.PLAYLISTS});
	}, [dispatch]);

	const goToSuggestions = React.useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SUGGESTIONS});
	}, [dispatch]);

	const goToSettings = React.useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SETTINGS});
	}, [dispatch]);

	const goBack = React.useCallback(() => {
		dispatch({category: 'GO_BACK'});
	}, [dispatch]);

	// Global keyboard bindings
	useKeyBinding(KEYBINDINGS.SEARCH, goToSearch);
	useKeyBinding(KEYBINDINGS.PLAYLISTS, goToPlaylists);
	useKeyBinding(KEYBINDINGS.SUGGESTIONS, goToSuggestions);
	useKeyBinding(KEYBINDINGS.SETTINGS, goToSettings);
	useKeyBinding(KEYBINDINGS.HELP, goBack);

	const renderView = () => {
		switch (navState.currentView) {
			case 'player':
				return <PlayerLayout />;

			case 'search':
				return <SearchLayout />;

			case 'playlists':
				return <PlaylistList />;

			case 'suggestions':
				return <Suggestions />;

			case 'settings':
				return <Settings />;

			case 'help':
				return <Help />;

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
