// Main layout shell
import {useCallback, useMemo} from 'react';
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
import ConfigLayout from '../config/ConfigLayout.tsx';
import ShortcutsBar from '../common/ShortcutsBar.tsx';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box} from 'ink';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';

function MainLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {columns} = useTerminalSize();

	// Responsive padding based on terminal size
	const getPadding = () => (columns < 100 ? 0 : 1);

	// Navigate to different views
	const goToSearch = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SEARCH});
	}, [dispatch]);

	const goToPlaylists = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.PLAYLISTS});
	}, [dispatch]);

	const goToSuggestions = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SUGGESTIONS});
	}, [dispatch]);

	const goToSettings = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SETTINGS});
	}, [dispatch]);

	const goToHelp = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.HELP});
	}, [dispatch]);

	const handleQuit = useCallback(() => {
		// From player view, quit the app
		if (navState.currentView === VIEW.PLAYER) {
			process.exit(0);
		}
		// From other views, go back
		dispatch({category: 'GO_BACK'});
	}, [navState.currentView, dispatch]);

	// Global keyboard bindings
	useKeyBinding(KEYBINDINGS.QUIT, handleQuit);
	useKeyBinding(KEYBINDINGS.SEARCH, goToSearch);
	useKeyBinding(KEYBINDINGS.PLAYLISTS, goToPlaylists);
	useKeyBinding(KEYBINDINGS.SUGGESTIONS, goToSuggestions);
	useKeyBinding(KEYBINDINGS.SETTINGS, goToSettings);
	useKeyBinding(KEYBINDINGS.HELP, goToHelp);

	// Memoize the view component to prevent unnecessary remounts
	// Only recreate when currentView actually changes
	const currentView = useMemo(() => {
		switch (navState.currentView) {
			case 'player':
				return <PlayerLayout key="player" />;

			case 'search':
				return <SearchLayout key="search" />;

			case 'playlists':
				return <PlaylistList key="playlists" />;

			case 'suggestions':
				return <Suggestions key="suggestions" />;

			case 'settings':
				return <Settings key="settings" />;

			case 'config':
				return <ConfigLayout key="config" />;

			case 'help':
				return <Help key="help" />;

			default:
				return <PlayerLayout key="player-default" />;
		}
	}, [navState.currentView]);

	return (
		<Box
			flexDirection="column"
			paddingX={getPadding()}
			borderStyle="single"
			borderColor={theme.colors.primary}
		>
			{currentView}

			{/* Shortcuts bar at bottom - shows context-relevant shortcuts */}
			<ShortcutsBar />
		</Box>
	);
}

export default React.memo(MainLayout);
