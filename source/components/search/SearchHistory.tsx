// Search history component
import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {VIEW} from '../../utils/constants.ts';

type Props = {
	onSelect: (query: string) => void;
};

export default function SearchHistory({onSelect}: Props) {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const config = getConfigService();
	const history = config.getSearchHistory();
	const [selectedIndex, setSelectedIndex] = useState(0);

	const navigateUp = useCallback(() => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	}, []);

	const navigateDown = useCallback(() => {
		setSelectedIndex(prev => Math.min(history.length - 1, prev + 1));
	}, [history.length]);

	const handleSelect = useCallback(() => {
		const query = history[selectedIndex];
		if (query) {
			dispatch({category: 'NAVIGATE', view: VIEW.SEARCH});
			onSelect(query);
		}
	}, [history, selectedIndex, dispatch, onSelect]);

	useKeyBinding(resolveKeybinding('UP'), navigateUp);
	useKeyBinding(resolveKeybinding('DOWN'), navigateDown);
	useKeyBinding(resolveKeybinding('SELECT'), handleSelect);
	useKeyBinding(resolveKeybinding('BACK'), () => {
		dispatch({category: 'GO_BACK'});
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					Search History
				</Text>
			</Box>

			{history.length === 0 ? (
				<Text color={theme.colors.dim}>No search history yet</Text>
			) : (
				history.map((query, index) => (
					<Box key={index} paddingX={1}>
						<Text
							backgroundColor={
								selectedIndex === index ? theme.colors.primary : undefined
							}
							color={
								selectedIndex === index
									? theme.colors.background
									: theme.colors.text
							}
						>
							{query}
						</Text>
					</Box>
				))
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					↑↓ to navigate • Enter to search • Esc to go back
				</Text>
			</Box>
		</Box>
	);
}
