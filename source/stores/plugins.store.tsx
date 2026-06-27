// Plugin store - manages plugin state in the TUI
import {
	createContext,
	useContext,
	useReducer,
	useMemo,
	useEffect,
	type ReactNode,
} from 'react';
import type {
	PluginInstance,
	AvailablePlugin,
	PluginInstallResult,
	PluginPlayerAPI,
	PluginNavigationAPI,
} from '../types/plugin.types.ts';
import {getPluginRegistryService} from '../services/plugin/plugin-registry.service.ts';
import {getPluginInstallerService} from '../services/plugin/plugin-installer.service.ts';
import {getPluginUpdaterService} from '../services/plugin/plugin-updater.service.ts';
import {getConfigService} from '../services/config/config.service.ts';
import {usePlayer} from '../hooks/usePlayer.ts';
import {useNavigation} from '../hooks/useNavigation.ts';
import type {Track} from '../types/youtube-music.types.ts';
import {logger} from '../services/logger/logger.service.ts';

interface PluginsState {
	installedPlugins: PluginInstance[];
	availablePlugins: AvailablePlugin[];
	selectedIndex: number;
	isLoading: boolean;
	error: string | null;
	lastAction: string | null;
}

type PluginsAction =
	| {type: 'SET_INSTALLED'; plugins: PluginInstance[]}
	| {type: 'SET_AVAILABLE'; plugins: AvailablePlugin[]}
	| {type: 'SET_SELECTED'; index: number}
	| {type: 'SET_LOADING'; loading: boolean}
	| {type: 'SET_ERROR'; error: string | null}
	| {type: 'SET_LAST_ACTION'; action: string | null}
	| {type: 'REFRESH'};

const initialState: PluginsState = {
	installedPlugins: [],
	availablePlugins: [],
	selectedIndex: 0,
	isLoading: false,
	error: null,
	lastAction: null,
};

function pluginsReducer(
	state: PluginsState,
	action: PluginsAction,
): PluginsState {
	switch (action.type) {
		case 'SET_INSTALLED':
			return {...state, installedPlugins: action.plugins};
		case 'SET_AVAILABLE':
			return {...state, availablePlugins: action.plugins};
		case 'SET_SELECTED':
			return {...state, selectedIndex: action.index};
		case 'SET_LOADING':
			return {...state, isLoading: action.loading};
		case 'SET_ERROR':
			return {...state, error: action.error};
		case 'SET_LAST_ACTION':
			return {...state, lastAction: action.action};
		case 'REFRESH':
			return {...state};
		default:
			return state;
	}
}

interface PluginsContextValue {
	state: PluginsState;
	dispatch: React.Dispatch<PluginsAction>;
	// Actions
	refreshPlugins: () => void;
	installPlugin: (nameOrUrl: string) => Promise<PluginInstallResult>;
	uninstallPlugin: (pluginId: string) => Promise<PluginInstallResult>;
	enablePlugin: (pluginId: string) => Promise<void>;
	disablePlugin: (pluginId: string) => Promise<void>;
	updatePlugin: (pluginId: string) => Promise<void>;
}

const PluginsContext = createContext<PluginsContextValue | null>(null);

export function PluginsProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(pluginsReducer, initialState);

	const registryService = getPluginRegistryService();
	const installerService = getPluginInstallerService();
	const updaterService = getPluginUpdaterService();

	// Get player and navigation contexts for plugin API
	const player = usePlayer();
	const navigation = useNavigation();

	// Build player API for plugins
	const playerAPI: PluginPlayerAPI = {
		play: async (track: Track) => {
			player.play(track);
		},
		pause: () => player.pause(),
		resume: () => player.resume(),
		stop: () => player.dispatch({category: 'STOP'}),
		next: () => player.next(),
		previous: () => player.previous(),
		seek: (position: number) => player.seek(position),
		setVolume: (volume: number) => player.setVolume(volume),
		getVolume: () => player.state.volume,
		getCurrentTrack: () => player.state.currentTrack,
		getQueue: () => player.state.queue,
		addToQueue: (track: Track) => player.addToQueue(track),
		removeFromQueue: (index: number) => player.removeFromQueue(index),
		clearQueue: () => player.clearQueue(),
		shuffle: (enabled: boolean) => {
			if (player.state.shuffle !== enabled) {
				// Toggle to change shuffle state (accepts only toggle for now)
				player.dispatch({category: 'TOGGLE_SHUFFLE'});
			}
		},
		setRepeat: (_mode: 'off' | 'all' | 'one') => {
			// Not fully implemented; placeholder
			logger.warn('PluginsProvider', 'setRepeat not implemented yet');
		},
	};

	// Build navigation API for plugins
	const navigationAPI: PluginNavigationAPI = {
		navigate: (view: string) =>
			navigation.dispatch({category: 'NAVIGATE', view}),
		goBack: () => navigation.dispatch({category: 'GO_BACK'}),
		getCurrentView: () => navigation.state.currentView,
		registerView: (_viewId: string, _component: React.ReactElement) => {
			console.warn('Plugin registerView not implemented');
		},
		unregisterView: (_viewId: string) => {
			console.warn('Plugin unregisterView not implemented');
		},
	};

	// Set APIs on registry before any plugin loads (once on mount)
	useEffect(() => {
		registryService.setPlayerAPI(playerAPI);
		registryService.setNavigationAPI(navigationAPI);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const refreshPlugins = () => {
		const plugins = registryService.getAllPlugins();
		dispatch({type: 'SET_INSTALLED', plugins});
	};

	const installPlugin = async (
		nameOrUrl: string,
	): Promise<PluginInstallResult> => {
		dispatch({type: 'SET_LOADING', loading: true});
		dispatch({type: 'SET_ERROR', error: null});

		try {
			let result: PluginInstallResult;

			if (nameOrUrl.startsWith('http')) {
				result = await installerService.installFromGitHub(nameOrUrl);
			} else {
				result = await installerService.installFromDefaultRepo(nameOrUrl);
			}

			if (result.success) {
				dispatch({
					type: 'SET_LAST_ACTION',
					action: `Installed ${result.pluginId}`,
				});
				// Reload plugins
				await registryService.loadAllPlugins();
				refreshPlugins();
			} else {
				dispatch({type: 'SET_ERROR', error: result.error || 'Install failed'});
			}

			return result;
		} finally {
			dispatch({type: 'SET_LOADING', loading: false});
		}
	};

	const uninstallPlugin = async (
		pluginId: string,
	): Promise<PluginInstallResult> => {
		dispatch({type: 'SET_LOADING', loading: true});

		try {
			// Unload from registry first
			await registryService.unloadPlugin(pluginId);

			// Then uninstall from disk
			const result = await installerService.uninstall(pluginId);

			if (result.success) {
				dispatch({
					type: 'SET_LAST_ACTION',
					action: `Uninstalled ${pluginId}`,
				});
				refreshPlugins();
			} else {
				dispatch({
					type: 'SET_ERROR',
					error: result.error || 'Uninstall failed',
				});
			}

			return result;
		} finally {
			dispatch({type: 'SET_LOADING', loading: false});
		}
	};

	const enablePlugin = async (pluginId: string): Promise<void> => {
		try {
			await registryService.enablePlugin(pluginId);
			dispatch({type: 'SET_LAST_ACTION', action: `Enabled ${pluginId}`});
			refreshPlugins();
		} catch (error) {
			dispatch({
				type: 'SET_ERROR',
				error: error instanceof Error ? error.message : 'Enable failed',
			});
		}
	};

	const disablePlugin = async (pluginId: string): Promise<void> => {
		try {
			await registryService.disablePlugin(pluginId);
			dispatch({type: 'SET_LAST_ACTION', action: `Disabled ${pluginId}`});
			refreshPlugins();
		} catch (error) {
			dispatch({
				type: 'SET_ERROR',
				error: error instanceof Error ? error.message : 'Disable failed',
			});
		}
	};

	const updatePlugin = async (pluginId: string): Promise<void> => {
		dispatch({type: 'SET_LOADING', loading: true});

		try {
			const result = await updaterService.updatePlugin(pluginId);

			if (result.success) {
				dispatch({
					type: 'SET_LAST_ACTION',
					action: `Updated ${pluginId} to ${result.newVersion}`,
				});
				// Reload the plugin
				await registryService.loadAllPlugins();
				refreshPlugins();
			} else {
				dispatch({type: 'SET_ERROR', error: result.error || 'Update failed'});
			}
		} finally {
			dispatch({type: 'SET_LOADING', loading: false});
		}
	};

	// Load plugins on mount, initialize contexts, and restore enabled state
	useEffect(() => {
		// Set APIs on registry before loading plugins
		registryService.setPlayerAPI(playerAPI);
		registryService.setNavigationAPI(navigationAPI);

		const loadPlugins = async () => {
			await registryService.loadAllPlugins();

			// Restore previously enabled plugins (with error handling)
			const config = getConfigService();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const pluginStates = config.get('pluginStates' as any) as
				Record<string, {enabled: boolean}> | undefined;
			for (const plugin of registryService.getAllPlugins()) {
				if (pluginStates?.[plugin.manifest.id]?.enabled && !plugin.enabled) {
					try {
						await registryService.enablePlugin(plugin.manifest.id);
					} catch (error) {
						logger.warn(
							'PluginsProvider',
							`Failed to auto-enable plugin ${plugin.manifest.id}`,
							{
								error: error instanceof Error ? error.message : String(error),
							},
						);
						// Continue with other plugins
					}
				}
			}

			// Update state
			dispatch({
				type: 'SET_INSTALLED',
				plugins: registryService.getAllPlugins(),
			});
		};
		void loadPlugins();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const contextValue = useMemo(
		() => ({
			state,
			dispatch,
			refreshPlugins,
			installPlugin,
			uninstallPlugin,
			enablePlugin,
			disablePlugin,
			updatePlugin,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[state],
	);

	return (
		<PluginsContext.Provider value={contextValue}>
			{children}
		</PluginsContext.Provider>
	);
}

export function usePlugins(): PluginsContextValue {
	const context = useContext(PluginsContext);

	if (!context) {
		throw new Error('usePlugins must be used within PluginsProvider');
	}

	return context;
}
