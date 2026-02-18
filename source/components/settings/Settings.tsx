// Settings component
import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';

const QUALITIES: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

const SETTINGS_ITEMS = ['Stream Quality', 'Manage Plugins'] as const;

export default function Settings() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const config = getConfigService();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [quality, setQuality] = useState(config.get('streamQuality') || 'high');

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, [setSelectedIndex]);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(SETTINGS_ITEMS.length - 1, prev + 1));
	}, [setSelectedIndex]);

	const toggleQuality = useCallback(() => {
		const currentIndex = QUALITIES.indexOf(quality);
		const nextQuality = QUALITIES[(currentIndex + 1) % QUALITIES.length]!;
		setQuality(nextQuality);
		config.set('streamQuality', nextQuality);
	}, [quality, config]);

	const handleSelect = useCallback(() => {
		if (selectedIndex === 0) {
			toggleQuality();
		} else if (selectedIndex === 1) {
			dispatch({category: 'NAVIGATE', view: VIEW.PLUGINS});
		}
	}, [selectedIndex, toggleQuality, dispatch]);

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, handleSelect);

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					Settings
				</Text>
			</Box>

			{/* Stream Quality */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 0 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 0 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 0}
				>
					Stream Quality: {quality.toUpperCase()}
				</Text>
			</Box>

			{/* Manage Plugins */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 1 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 1 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 1}
				>
					Manage Plugins
				</Text>
			</Box>

			{/* Info */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Arrows to navigate, Enter to select, Esc/q to go back
				</Text>
			</Box>
		</Box>
	);
}
