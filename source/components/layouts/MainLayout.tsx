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
import MiniPlayerLayout from './MiniPlayerLayout.tsx';
import PluginsLayout from './PluginsLayout.tsx';
import Suggestions from '../player/Suggestions.tsx';
import Settings from '../settings/Settings.tsx';
import ConfigLayout from '../config/ConfigLayout.tsx';
import ShortcutsBar from '../common/ShortcutsBar.tsx';
import LyricsLayout from './LyricsLayout.tsx';
import SearchHistory from '../search/SearchHistory.tsx';
import KeybindingsLayout from '../config/KeybindingsLayout.tsx';
import TrendingLayout from './TrendingLayout.tsx';
import ExploreLayout from './ExploreLayout.tsx';
import HistoryLayout from './HistoryLayout.tsx';
import ImportLayout from '../import/ImportLayout.tsx';
import ExportLayout from '../export/ExportLayout.tsx';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {Box} from 'ink';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {getPlayerService} from '../../services/player/player.service.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';

function MainLayout() {
	const {theme} = useTheme();
	const {state: navState, dispatch} = useNavigation();
	const {resume} = usePlayer();
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

	const goToPlugins = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.PLUGINS});
	}, [dispatch]);

	const goToSettings = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.SETTINGS});
	}, [dispatch]);

	const goToHistory = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.HISTORY});
	}, [dispatch]);

	const goToHelp = useCallback(() => {
		if (navState.currentView === VIEW.HELP) {
			dispatch({category: 'GO_BACK'});
			return;
		}

		dispatch({category: 'NAVIGATE', view: VIEW.HELP});
	}, [dispatch, navState.currentView]);

	const handleQuit = useCallback(() => {
		// From player view, quit the app
		if (navState.currentView === VIEW.PLAYER) {
			process.exit(0);
		}
		// From other views, go back
		dispatch({category: 'GO_BACK'});
	}, [navState.currentView, dispatch]);

	const goToLyrics = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.LYRICS});
	}, [dispatch]);

	const goToTrending = useCallback(() => {
		dispatch({category: 'NAVIGATE', view: VIEW.TRENDING});
	}, [dispatch]);

	const goToExplore = useCallback(() => {
		// Don't navigate to explore if we're in plugins view (e key is used for enable/disable there)
		if (navState.currentView !== VIEW.PLUGINS) {
			dispatch({category: 'NAVIGATE', view: VIEW.EXPLORE});
		}
	}, [dispatch, navState.currentView]);

	const goToImport = useCallback(() => {
		// Don't navigate to import if we're in plugins view (i key is used for plugin install there)
		// Don't navigate to import if we're in settings view (user navigates settings items with Enter)
		if (
			navState.currentView !== VIEW.PLUGINS &&
			navState.currentView !== VIEW.SETTINGS
		) {
			dispatch({category: 'NAVIGATE', view: VIEW.IMPORT});
		}
	}, [dispatch, navState.currentView]);

	const handleDetach = useCallback(() => {
		// Detach mode: Exit CLI while keeping music playing
		const player = getPlayerService();
		const config = getConfigService();

		// Get the IPC path and current URL before detaching
		const {ipcPath, currentUrl} = player.detach();

		// Save the background playback state if we have an active session
		if (ipcPath && currentUrl) {
			config.setBackgroundPlaybackState({ipcPath, currentUrl});
		}

		// Exit the app
		process.exit(0);
	}, []);

	const handleResumeBackground = useCallback(() => {
		const player = getPlayerService();
		const config = getConfigService();
		const backgroundState = config.getBackgroundPlaybackState();
		if (!backgroundState.enabled || !backgroundState.ipcPath) {
			return;
		}

		void player
			.reattach(backgroundState.ipcPath)
			.then(() => {
				resume();
				config.clearBackgroundPlaybackState();
			})
			.catch(() => {
				config.clearBackgroundPlaybackState();
			});
	}, [resume]);

	const togglePlayerMode = useCallback(() => {
		dispatch({category: 'TOGGLE_PLAYER_MODE'});
	}, [dispatch]);

	// Global keyboard bindings
	useKeyBinding(KEYBINDINGS.QUIT, handleQuit, {bypassBlock: true});
	useKeyBinding(KEYBINDINGS.SEARCH, goToSearch);
	useKeyBinding(KEYBINDINGS.PLAYLISTS, goToPlaylists);
	useKeyBinding(KEYBINDINGS.PLUGINS, goToPlugins);
	useKeyBinding(KEYBINDINGS.SUGGESTIONS, goToSuggestions);
	useKeyBinding(KEYBINDINGS.HISTORY, goToHistory);
	useKeyBinding(KEYBINDINGS.SETTINGS, goToSettings);
	useKeyBinding(KEYBINDINGS.HELP, goToHelp);
	useKeyBinding(['M'], togglePlayerMode);
	useKeyBinding(['l'], goToLyrics);
	useKeyBinding(['T'], goToTrending);
	useKeyBinding(['e'], goToExplore);
	useKeyBinding(['i'], goToImport);
	useKeyBinding(KEYBINDINGS.DETACH, handleDetach);
	useKeyBinding(KEYBINDINGS.RESUME_BACKGROUND, handleResumeBackground);

	// Memoize the view component to prevent unnecessary remounts
	// Only recreate when currentView actually changes
	const currentView = useMemo(() => {
		// In mini mode, only show the mini player bar
		if (navState.playerMode === 'mini') {
			return <MiniPlayerLayout key="mini-player" />;
		}

		switch (navState.currentView) {
			case 'player':
				return <PlayerLayout key="player" />;

			case 'search':
				return <SearchLayout key="search" />;

			case 'search_history':
				return (
					<SearchHistory
						key="search_history"
						onSelect={query => {
							dispatch({category: 'SET_SEARCH_QUERY', query});
						}}
					/>
				);

			case 'playlists':
				return <PlaylistList key="playlists" />;

			case 'suggestions':
				return <Suggestions key="suggestions" />;

			case 'history':
				return <HistoryLayout key="history" />;

			case 'settings':
				return <Settings key="settings" />;

			case 'plugins':
				return <PluginsLayout key="plugins" />;

			case 'config':
				return <ConfigLayout key="config" />;

			case 'lyrics':
				return <LyricsLayout key="lyrics" />;

			case 'keybindings':
				return <KeybindingsLayout key="keybindings" />;

			case 'trending':
				return <TrendingLayout key="trending" />;

			case 'explore':
				return <ExploreLayout key="explore" />;

			case 'import':
				return <ImportLayout key="import" />;

			case 'export_playlists':
				return <ExportLayout key="export_playlists" />;

			case 'help':
				return <Help key="help" />;

			default:
				return <PlayerLayout key="player-default" />;
		}
	}, [navState.currentView, navState.playerMode, dispatch]);

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
