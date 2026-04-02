// Chat store for LLM conversations
import {
	createContext,
	useContext,
	useEffect,
	useReducer,
	useRef,
	type ReactNode,
} from 'react';
import type {ChatMessage} from '../types/llm.types.ts';
import {getConfigService} from '../services/config/config.service.ts';
import {getLLMService} from '../services/llm/llm.service.ts';

type ChatAction =
	| {category: 'SET_MESSAGES'; messages: ChatMessage[]}
	| {category: 'ADD_USER_MESSAGE'; content: string}
	| {category: 'ADD_ASSISTANT_MESSAGE'; content: string}
	| {category: 'SET_PROCESSING'; isProcessing: boolean}
	| {category: 'SET_ERROR'; error: string | null}
	| {category: 'CLEAR_CHAT'};

interface ChatState {
	messages: ChatMessage[];
	isProcessing: boolean;
	error: string | null;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
	switch (action.category) {
		case 'SET_MESSAGES':
			return {...state, messages: action.messages};
		case 'ADD_USER_MESSAGE':
			return {
				...state,
				messages: [
					...state.messages,
					{
						role: 'user',
						content: action.content,
						timestamp: Date.now(),
					},
				],
			};
		case 'ADD_ASSISTANT_MESSAGE':
			return {
				...state,
				messages: [
					...state.messages,
					{
						role: 'assistant',
						content: action.content,
						timestamp: Date.now(),
					},
				],
			};
		case 'SET_PROCESSING':
			return {...state, isProcessing: action.isProcessing};
		case 'SET_ERROR':
			return {...state, error: action.error};
		case 'CLEAR_CHAT':
			return {...state, messages: [], error: null};
		default:
			return state;
	}
}

interface ChatContextValue {
	messages: ChatMessage[];
	isProcessing: boolean;
	error: string | null;
	sendMessage: (prompt: string) => Promise<void>;
	clearChat: () => void;
	isConfigured: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function ChatProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(chatReducer, {
		messages: [],
		isProcessing: false,
		error: null,
	});

	const configService = getConfigService();
	const configServiceRef = useRef(configService);
	const llmService = getLLMService();

	useEffect(() => {
		const savedHistory = configServiceRef.current.get('llmChatHistory');
		if (savedHistory && savedHistory.length > 0) {
			dispatch({category: 'SET_MESSAGES', messages: savedHistory});
		}
	}, []);

	useEffect(() => {
		configServiceRef.current.set('llmChatHistory', state.messages);
	}, [state.messages]);

	const isConfigured = llmService.isConfigured();

	const sendMessage = async (prompt: string): Promise<void> => {
		dispatch({category: 'ADD_USER_MESSAGE', content: prompt});
		dispatch({category: 'SET_PROCESSING', isProcessing: true});
		dispatch({category: 'SET_ERROR', error: null});

		try {
			const context = {
				currentTrack: '',
				queueLength: 0,
				playlists: [],
			};
			const response = await llmService.chat(prompt, context, state.messages);
			dispatch({category: 'ADD_ASSISTANT_MESSAGE', content: response.text});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'An error occurred';
			dispatch({category: 'SET_ERROR', error: message});
		} finally {
			dispatch({category: 'SET_PROCESSING', isProcessing: false});
		}
	};

	const clearChat = (): void => {
		dispatch({category: 'CLEAR_CHAT'});
	};

	return (
		<ChatContext.Provider
			value={{
				messages: state.messages,
				isProcessing: state.isProcessing,
				error: state.error,
				sendMessage,
				clearChat,
				isConfigured,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
}

function useChat(): ChatContextValue {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useChat must be used within a ChatProvider');
	}
	return context;
}

export {ChatProvider, useChat};
