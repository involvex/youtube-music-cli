// Theme switcher component
import {Box, Text} from 'ink';
import {useTheme} from '../../hooks/useTheme.ts';
import {BUILTIN_THEMES} from '../../config/themes.config.ts';
import {useState} from 'react';

export default function ThemeSwitcher() {
	const {theme} = useTheme();
	const [expanded, _setExpanded] = useState(false);

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
			>
				<Text bold color={theme.colors.primary}>
					Theme: {theme.name}
				</Text>
				<Text> </Text>
				<Text color={theme.colors.dim}>(Enter to change, Esc to close)</Text>
			</Box>

			{expanded ? (
				<>
					{Object.keys(BUILTIN_THEMES).map(themeName => (
						<Box key={themeName} paddingX={2}>
							<Text color={theme.colors.text}>→ </Text>
							<Text color={theme.colors.dim}>{themeName}</Text>
							<Text> </Text>
							<Text color={theme.colors.dim}>
								Press <Text color={theme.colors.text}>Enter</Text> to select
							</Text>
						</Box>
					))}
				</>
			) : (
				<Box paddingX={2}>
					<Text color={theme.colors.dim}>Press </Text>
					<Text color={theme.colors.text}>Enter</Text>
					<Text color={theme.colors.dim}> to browse themes</Text>
				</Box>
			)}

			{/* Instructions */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Current: <Text color={theme.colors.primary}>{theme.name}</Text>
				</Text>
			</Box>
		</Box>
	);
}
