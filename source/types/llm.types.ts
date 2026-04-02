// LLM type definitions
export type LLMProvider = 'gemini' | 'openai' | 'anthropic';

export interface LLMConfig {
	provider?: LLMProvider;
	apiKey?: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	maxMessagesInContext?: number;
}

export interface LLMUsage {
	requestsToday: number;
	inputTokensToday: number;
	outputTokensToday: number;
	lastReset: string;
}

export interface ChatContext {
	currentTrack?: string;
	queueLength: number;
	playlists: Array<{playlistId: string; name: string}>;
}

export interface ToolCall {
	name: string;
	args: Record<string, unknown>;
}

export interface ToolResult {
	success: boolean;
	data?: unknown;
	error?: string;
}

export interface ToolDefinition {
	name: string;
	description: string;
	parameters: {
		type: string;
		properties: Record<
			string,
			{type: string; description?: string; items?: {type: string}}
		>;
		required: string[];
	};
}

export interface LLMResponse {
	text: string;
	toolCalls?: ToolCall[];
	usage?: {
		promptTokens: number;
		candidatesTokens: number;
		totalTokens: number;
	};
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	toolCalls?: ToolCall[];
}

export interface LLMError {
	code:
		| 'NO_API_KEY'
		| 'INVALID_KEY'
		| 'RATE_LIMITED'
		| 'QUOTA_EXCEEDED'
		| 'NETWORK_ERROR'
		| 'MODEL_ERROR'
		| 'INVALID_RESPONSE';
	message: string;
	retryAfter?: number;
}
