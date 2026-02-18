// Available plugins component - displays plugins from the default repo
import {useMemo} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import type {AvailablePlugin} from '../../types/plugin.types.ts';
import {usePlugins} from '../../stores/plugins.store.tsx';

interface PluginsAvailableProps {
	selectedIndex: number;
}

// Mock available plugins (in production, these would be fetched from the repo)
const AVAILABLE_PLUGINS: AvailablePlugin[] = [
	{
		id: 'adblock',
		name: 'Adblock',
		version: '1.0.0',
		description: 'Blocks ads by filtering known ad video IDs',
		author: 'involvex',
		repository: 'https://github.com/involvex/youtube-music-cli-plugins',
		installUrl: 'adblock',
		tags: ['audio', 'filter'],
	},
	{
		id: 'now-playing',
		name: 'Now Playing',
		version: '1.0.0',
		description: 'Shows system notifications when track changes',
		author: 'involvex',
		repository: 'https://github.com/involvex/youtube-music-cli-plugins',
		installUrl: 'now-playing',
		tags: ['notifications'],
	},
	{
		id: 'lyrics',
		name: 'Lyrics',
		version: '1.0.0',
		description: 'Displays lyrics for the current track',
		author: 'involvex',
		repository: 'https://github.com/involvex/youtube-music-cli-plugins',
		installUrl: 'lyrics',
		tags: ['ui', 'lyrics'],
	},
];

export default function PluginsAvailable({
	selectedIndex,
}: PluginsAvailableProps) {
	const {theme} = useTheme();
	const {state} = usePlugins();

	// Use useMemo instead of useEffect to avoid setState in effect
	const plugins = useMemo(() => {
		const installedIds = new Set(
			state.installedPlugins.map(p => p.manifest.id),
		);
		return AVAILABLE_PLUGINS.filter(p => !installedIds.has(p.id));
	}, [state.installedPlugins]);

	if (plugins.length === 0) {
		return (
			<Box paddingX={1}>
				<Text color={theme.colors.dim}>
					All available plugins are already installed.
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box paddingX={1} marginBottom={1}>
				<Text bold color={theme.colors.secondary}>
					Available Plugins
				</Text>
			</Box>

			{plugins.map((plugin, index) => {
				const isSelected = index === selectedIndex;

				return (
					<Box key={plugin.id} paddingX={1}>
						<Text
							backgroundColor={isSelected ? theme.colors.primary : undefined}
							color={isSelected ? theme.colors.background : theme.colors.text}
							bold={isSelected}
						>
							{plugin.name}
							<Text color={isSelected ? undefined : theme.colors.dim}>
								{' '}
								v{plugin.version} - {plugin.description}
							</Text>
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}
