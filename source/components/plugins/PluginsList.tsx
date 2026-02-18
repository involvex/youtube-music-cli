// Plugins list component - displays installed plugins
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import type {PluginInstance} from '../../types/plugin.types.ts';

interface PluginsListProps {
	plugins: PluginInstance[];
	selectedIndex: number;
	onToggle?: (pluginId: string) => void;
}

export default function PluginsList({
	plugins,
	selectedIndex,
}: PluginsListProps) {
	const {theme} = useTheme();

	if (plugins.length === 0) {
		return (
			<Box paddingX={1}>
				<Text color={theme.colors.dim}>
					No plugins installed. Press &apos;i&apos; to install a plugin.
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{plugins.map((plugin, index) => {
				const isSelected = index === selectedIndex;
				const statusIcon = plugin.enabled ? '●' : '○';
				const statusColor = plugin.enabled
					? theme.colors.success
					: theme.colors.dim;

				return (
					<Box key={plugin.manifest.id} paddingX={1}>
						<Text
							backgroundColor={isSelected ? theme.colors.primary : undefined}
							color={isSelected ? theme.colors.background : theme.colors.text}
							bold={isSelected}
						>
							<Text color={isSelected ? undefined : statusColor}>
								{statusIcon}
							</Text>{' '}
							{plugin.manifest.name}
							<Text color={isSelected ? undefined : theme.colors.dim}>
								{' '}
								v{plugin.manifest.version}
							</Text>
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}
