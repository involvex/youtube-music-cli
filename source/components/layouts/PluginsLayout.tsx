// Plugins layout - main plugin management view
import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlugins} from '../../stores/plugins.store.tsx';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import PluginsList from '../plugins/PluginsList.tsx';
import PluginInstallDialog from '../plugins/PluginInstallDialog.tsx';

type ViewMode = 'list' | 'install' | 'details';

export default function PluginsLayout() {
	const {theme} = useTheme();
	const {
		state,
		dispatch,
		enablePlugin,
		disablePlugin,
		uninstallPlugin,
		updatePlugin,
	} = usePlugins();
	const [viewMode, setViewMode] = useState<ViewMode>('list');

	const {installedPlugins, selectedIndex, isLoading, error, lastAction} = state;

	// Navigation
	const navigateUp = useCallback(() => {
		if (viewMode === 'list') {
			dispatch({
				type: 'SET_SELECTED',
				index: Math.max(0, selectedIndex - 1),
			});
		}
	}, [viewMode, selectedIndex, dispatch]);

	const navigateDown = useCallback(() => {
		if (viewMode === 'list') {
			dispatch({
				type: 'SET_SELECTED',
				index: Math.min(installedPlugins.length - 1, selectedIndex + 1),
			});
		}
	}, [viewMode, selectedIndex, installedPlugins.length, dispatch]);

	// Actions
	const togglePlugin = useCallback(async () => {
		const plugin = installedPlugins[selectedIndex];
		if (!plugin) return;

		if (plugin.enabled) {
			await disablePlugin(plugin.manifest.id);
		} else {
			await enablePlugin(plugin.manifest.id);
		}
	}, [installedPlugins, selectedIndex, enablePlugin, disablePlugin]);

	const removePlugin = useCallback(async () => {
		const plugin = installedPlugins[selectedIndex];
		if (!plugin) return;

		await uninstallPlugin(plugin.manifest.id);
	}, [installedPlugins, selectedIndex, uninstallPlugin]);

	const handleUpdate = useCallback(async () => {
		const plugin = installedPlugins[selectedIndex];
		if (!plugin) return;

		await updatePlugin(plugin.manifest.id);
	}, [installedPlugins, selectedIndex, updatePlugin]);

	const openInstall = useCallback(() => {
		setViewMode('install');
	}, []);

	const closeInstall = useCallback(() => {
		setViewMode('list');
	}, []);

	// Key bindings
	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(['e'], togglePlugin);
	useKeyBinding(['r'], removePlugin);
	useKeyBinding(['u'], handleUpdate);
	useKeyBinding(['i'], openInstall);

	// Show install dialog
	if (viewMode === 'install') {
		return <PluginInstallDialog onClose={closeInstall} />;
	}

	// Get selected plugin details
	const selectedPlugin = installedPlugins[selectedIndex];

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
			>
				<Text bold color={theme.colors.primary}>
					Plugin Manager
				</Text>
			</Box>

			{/* Loading indicator */}
			{isLoading && (
				<Box paddingX={1}>
					<Text color={theme.colors.warning}>Loading...</Text>
				</Box>
			)}

			{/* Error message */}
			{error && (
				<Box paddingX={1}>
					<Text color={theme.colors.error}>Error: {error}</Text>
				</Box>
			)}

			{/* Success message */}
			{lastAction && !error && (
				<Box paddingX={1}>
					<Text color={theme.colors.success}>✓ {lastAction}</Text>
				</Box>
			)}

			{/* Plugins list */}
			<PluginsList plugins={installedPlugins} selectedIndex={selectedIndex} />

			{/* Selected plugin details */}
			{selectedPlugin && (
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor={theme.colors.dim}
					paddingX={1}
					marginTop={1}
				>
					<Text bold color={theme.colors.secondary}>
						{selectedPlugin.manifest.name}
					</Text>
					<Text color={theme.colors.dim}>
						{selectedPlugin.manifest.description}
					</Text>
					<Text color={theme.colors.dim}>
						Author: {selectedPlugin.manifest.author}
					</Text>
					<Text color={theme.colors.dim}>
						Permissions: {selectedPlugin.manifest.permissions.join(', ')}
					</Text>
				</Box>
			)}

			{/* Shortcuts */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					<Text color={theme.colors.text}>i</Text>=Install{' '}
					<Text color={theme.colors.text}>e</Text>=Enable/Disable{' '}
					<Text color={theme.colors.text}>r</Text>=Remove{' '}
					<Text color={theme.colors.text}>u</Text>=Update{' '}
					<Text color={theme.colors.text}>Esc</Text>=Back
				</Text>
			</Box>
		</Box>
	);
}
