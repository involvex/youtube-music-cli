// Plugin install dialog - prompts for plugin name or URL
import {useState, useCallback} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useTheme} from '../../hooks/useTheme.ts';
import {usePlugins} from '../../stores/plugins.store.tsx';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';

interface PluginInstallDialogProps {
	onClose: () => void;
}

export default function PluginInstallDialog({
	onClose,
}: PluginInstallDialogProps) {
	const {theme} = useTheme();
	const {installPlugin, state} = usePlugins();
	const [input, setInput] = useState('');
	const [installing, setInstalling] = useState(false);
	const [result, setResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const handleSubmit = useCallback(async () => {
		if (!input.trim() || installing) return;

		setInstalling(true);
		setResult(null);

		const installResult = await installPlugin(input.trim());

		setInstalling(false);
		setResult({
			success: installResult.success,
			message: installResult.success
				? `Successfully installed ${installResult.pluginId}`
				: installResult.error || 'Installation failed',
		});

		if (installResult.success) {
			// Close after a brief delay on success
			setTimeout(onClose, 1500);
		}
	}, [input, installing, installPlugin, onClose]);

	const handleClose = useCallback(() => {
		if (!installing) {
			onClose();
		}
	}, [installing, onClose]);

	useKeyBinding(KEYBINDINGS.BACK, handleClose);

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
			>
				<Text bold color={theme.colors.primary}>
					Install Plugin
				</Text>
			</Box>

			{/* Instructions */}
			<Box paddingX={1}>
				<Text color={theme.colors.dim}>
					Enter a plugin name (from default repo) or GitHub URL:
				</Text>
			</Box>

			{/* Input */}
			<Box paddingX={1}>
				<Text color={theme.colors.text}>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder="e.g., adblock or https://github.com/user/plugin"
				/>
			</Box>

			{/* Installing indicator */}
			{installing && (
				<Box paddingX={1}>
					<Text color={theme.colors.warning}>Installing...</Text>
				</Box>
			)}

			{/* Result */}
			{result && (
				<Box paddingX={1}>
					<Text
						color={result.success ? theme.colors.success : theme.colors.error}
					>
						{result.success ? '✓' : '✗'} {result.message}
					</Text>
				</Box>
			)}

			{/* Error from state */}
			{state.error && !result && (
				<Box paddingX={1}>
					<Text color={theme.colors.error}>Error: {state.error}</Text>
				</Box>
			)}

			{/* Help */}
			<Box marginTop={1} paddingX={1}>
				<Text color={theme.colors.dim}>
					Press <Text color={theme.colors.text}>Enter</Text> to install,{' '}
					<Text color={theme.colors.text}>Esc</Text> to cancel
				</Text>
			</Box>
		</Box>
	);
}
