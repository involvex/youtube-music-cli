// AI Chat View Component
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useState} from 'react';
import type {ReactNode} from 'react';
import {useChat} from '../../stores/chat.store.tsx';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {VIEW, KEYBINDINGS} from '../../utils/constants.ts';

export default function AIChatView(): ReactNode {
	const {messages, isProcessing, error, sendMessage, isConfigured} = useChat();
	const {dispatch} = useNavigation();
	const [input, setInput] = useState('');

	const handleSubmit = async (): Promise<void> => {
		if (!input.trim() || isProcessing) return;
		const prompt = input.trim();
		setInput('');
		await sendMessage(prompt);
	};

	const goToSettings = (): void => {
		dispatch({category: 'NAVIGATE', view: VIEW.SETTINGS});
	};

	useKeyBinding(KEYBINDINGS.SELECT, goToSettings);

	if (!isConfigured) {
		return (
			<Box flexDirection="column" padding={1} height={20}>
				<Box
					flexDirection="column"
					borderStyle="round"
					borderColor="cyan"
					padding={1}
				>
					<Text bold>AI Assistant</Text>
				</Box>

				<Box flexDirection="column" flexGrow={1} justifyContent="center">
					<Text>AI Assistant needs configuration to work.</Text>
					<Text />
					<Text bold>To get started:</Text>
					<Text>1. Go to Settings</Text>
					<Text>2. Turn AI Assistant ON</Text>
					<Text>3. Enter your Gemini API key</Text>
					<Text />
					<Text dimColor>Press Enter to go to Settings</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1} height={20}>
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="cyan"
				padding={1}
			>
				<Text bold>AI Assistant</Text>
				<Text dimColor>Press Esc to go back, type and press Enter to send</Text>
			</Box>

			<Box flexDirection="column" flexGrow={1}>
				{messages.length === 0 ? (
					<Text dimColor>Ask me anything about music!</Text>
				) : (
					messages.map(msg => (
						<Box key={msg.timestamp} flexDirection="column">
							<Text bold={msg.role === 'user'}>
								{msg.role === 'user' ? 'You: ' : 'AI: '}
							</Text>
							<Text>{msg.content}</Text>
						</Box>
					))
				)}
				{isProcessing && <Text dimColor>Thinking...</Text>}
				{error && <Text color="red">{error}</Text>}
			</Box>

			<Box marginTop={1}>
				<Text>{'> '}</Text>
				<TextInput
					value={input}
					onChange={setInput}
					onSubmit={handleSubmit}
					placeholder="Ask me to play music, create a playlist, etc."
				/>
			</Box>
		</Box>
	);
}
