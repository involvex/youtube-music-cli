import {useEffect, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useTerminalSize} from '../../hooks/useTerminalSize.ts';
import {getSponsorLine} from '../../utils/funding.ts';
import {BOOT_TAGLINE, resolveBootArt} from '../../utils/boot-art.ts';
import {APP_NAME, APP_VERSION, GITHUB_REPO_URL} from '../../utils/constants.ts';

const DEFAULT_TIMEOUT_MS = 1800;

export default function BootScreen({onBooted}: {onBooted: () => void}) {
	const theme = useTheme();
	const {columns, rows} = useTerminalSize();
	const [timedOut, setTimedOut] = useState(false);

	useKeyBinding(['*'], () => {
		onBooted();
	});

	useEffect(() => {
		const timer = setTimeout(() => {
			setTimedOut(true);
			onBooted();
		}, DEFAULT_TIMEOUT_MS);

		return () => clearTimeout(timer);
	}, [onBooted]);

	const artLines = useMemo(() => resolveBootArt(columns - 4), [columns]);
	const sponsor = useMemo(() => getSponsorLine(), []);

	if (timedOut) return null;

	const frameWidth = Math.max(columns, 20);
	const frameHeight = Math.max(rows, 10);

	return (
		<Box width={frameWidth} height={frameHeight} flexDirection="column">
			<Box
				borderStyle="round"
				borderColor={theme.theme.colors.secondary}
				width={frameWidth}
				height={frameHeight}
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
				paddingX={2}
			>
				{artLines.map((line, index) => (
					<Text key={index} color={theme.theme.colors.primary} bold>
						{line}
					</Text>
				))}
				<Box marginTop={1}>
					<Text color={theme.theme.colors.secondary}>{BOOT_TAGLINE}</Text>
				</Box>
				<Box marginTop={2} flexDirection="column" alignItems="center">
					<Text color={theme.theme.colors.text}>
						{APP_NAME} v{APP_VERSION}
					</Text>
					<Box marginTop={1}>
						<Text color={theme.theme.colors.dim} dimColor>
							{GITHUB_REPO_URL}
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color={theme.theme.colors.dim} dimColor>
							{sponsor}
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color={theme.theme.colors.primary} bold>
							press any key
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}
