// Gemini LLM service
import type {
	LLMConfig,
	ChatContext,
	ChatMessage,
	LLMResponse,
	LLMError,
	ToolCall,
} from '../../types/llm.types.ts';
import type {ToolDefinition} from '../../types/llm.types.ts';
import {logger} from '../logger/logger.service.ts';
import {getConfigService} from '../config/config.service.ts';
import {getToolDefinitions} from './tool-definitions.ts';
import {executeTool} from './tool-executor.ts';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiContentPart {
	text: string;
}

interface GeminiContent {
	role: string;
	parts: GeminiContentPart[];
}

class LLMService {
	private apiKey = '';

	private model = 'gemini-2.0-flash';

	private temperature = 0.7;

	private maxTokens = 2048;

	private maxMessagesInContext = 10;

	private requestTimestamps: number[] = [];

	constructor() {
		this.loadConfig();
	}

	private loadConfig(): void {
		const configService = getConfigService();
		const envKey = process.env['GEMINI_API_KEY'];
		if (envKey) {
			this.apiKey = envKey;
			return;
		}
		const llmConfig = configService.get('llm');
		if (llmConfig?.apiKey) {
			this.apiKey = llmConfig.apiKey;
		}
		if (llmConfig?.model) {
			this.model = llmConfig.model;
		}
		if (llmConfig?.temperature !== undefined) {
			this.temperature = llmConfig.temperature;
		}
		if (llmConfig?.maxTokens) {
			this.maxTokens = llmConfig.maxTokens;
		}
		if (llmConfig?.maxMessagesInContext) {
			this.maxMessagesInContext = llmConfig.maxMessagesInContext;
		}
	}

	isConfigured(): boolean {
		return Boolean(this.apiKey);
	}

	setApiKey(key: string): void {
		this.apiKey = key;
		const configService = getConfigService();
		const currentConfig = configService.get('llm') || {};
		configService.set('llm', {...currentConfig, apiKey: key});
	}

	async chat(
		prompt: string,
		context: ChatContext,
		history: ChatMessage[] = [],
	): Promise<LLMResponse> {
		if (!this.isConfigured()) {
			const error: LLMError = {
				code: 'NO_API_KEY',
				message:
					'Gemini API key not configured. Set GEMINI_API_KEY or configure in settings.',
			};
			throw error;
		}

		if (!this.canMakeRequest()) {
			const error: LLMError = {
				code: 'RATE_LIMITED',
				message: 'Rate limited. Please wait before sending another message.',
				retryAfter: this.getRetryDelay(),
			};
			throw error;
		}

		const systemPrompt = this.buildSystemPrompt(context);
		const messages = this.buildMessages(prompt, history, systemPrompt);
		const tools = getToolDefinitions();

		try {
			this.recordRequest();
			const response = await this.makeRequest(messages, tools);
			return response;
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('API_KEY')) {
					const llmError: LLMError = {
						code: 'INVALID_KEY',
						message: 'Invalid API key. Please check your Gemini API key.',
					};
					throw llmError;
				}
				if (error.message.includes('quota')) {
					const llmError: LLMError = {
						code: 'QUOTA_EXCEEDED',
						message:
							'API quota exceeded. Please check your Google AI Studio usage.',
					};
					throw llmError;
				}
				const llmError: LLMError = {
					code: 'NETWORK_ERROR',
					message: `Network error: ${error.message}`,
				};
				throw llmError;
			}
			const llmError: LLMError = {
				code: 'MODEL_ERROR',
				message: 'An unexpected error occurred.',
			};
			throw llmError;
		}
	}

	private buildSystemPrompt(context: ChatContext): string {
		let prompt = `You are a helpful music assistant for YouTube Music CLI. 
You can help users:
- Find and play music using natural language
- Create and manage playlists  
- Get recommendations based on current track
- Answer questions about music

When user asks to play music or add to queue, use the add_to_queue tool.
When user asks for recommendations based on what's playing, use get_suggestions.
When user wants to create a playlist, use create_playlist.

Current playback state: `;

		if (context.currentTrack) {
			prompt += `Now playing: ${context.currentTrack}. `;
		}
		prompt += `Queue: ${context.queueLength} tracks. `;
		if (context.playlists.length > 0) {
			prompt += `Playlists: ${context.playlists.map(p => p.name).join(', ')}. `;
		}
		prompt += `
Be concise and helpful. Use tools to fulfill user requests.`;

		return prompt;
	}

	private buildMessages(
		prompt: string,
		history: ChatMessage[],
		systemPrompt: string,
	): GeminiContent[] {
		const messages: GeminiContent[] = [
			{role: 'user', parts: [{text: systemPrompt}]},
		];

		const recentHistory = history.slice(-this.maxMessagesInContext);
		for (const msg of recentHistory) {
			if (msg.role === 'user' || msg.role === 'assistant') {
				messages.push({
					role: msg.role,
					parts: [{text: msg.content}],
				});
			}
		}

		messages.push({role: 'user', parts: [{text: prompt}]});

		return messages;
	}

	private async makeRequest(
		messages: GeminiContent[],
		tools: ToolDefinition[],
	): Promise<LLMResponse> {
		const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

		const body = {
			contents: messages,
			generationConfig: {
				temperature: this.temperature,
				maxOutputTokens: this.maxTokens,
				tools: tools.length > 0 ? [{functionDeclarations: tools}] : [],
			},
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`${response.status}: ${errorText}`);
		}

		const data = (await response.json()) as {
			candidates?: Array<{
				content?: {
					parts?: Array<{
						text?: string;
						functionCall?: {name: string; args: Record<string, unknown>};
					}>;
				};
			}>;
			usageMetadata?: {
				promptTokenCount?: number;
				candidatesTokenCount?: number;
				totalTokenCount?: number;
			};
		};

		const candidate = data.candidates?.[0];
		if (!candidate) {
			throw new Error('No response from Gemini');
		}

		const parts = candidate.content?.parts || [];
		let text = '';
		const toolCalls: ToolCall[] = [];

		for (const part of parts) {
			if (part.text) {
				text += part.text;
			}
			if (part.functionCall) {
				toolCalls.push({
					name: part.functionCall.name,
					args: part.functionCall.args,
				});
			}
		}

		if (toolCalls.length > 0) {
			logger.debug('LLMService', 'Tool calls detected', {
				count: toolCalls.length,
			});
			for (const toolCall of toolCalls) {
				try {
					const result = await executeTool(toolCall.name, toolCall.args);
					logger.debug('LLMService', `Tool ${toolCall.name} executed`, {
						success: result.success,
					});
					if (!result.success) {
						text += `\n[Error: ${toolCall.name} - ${result.error}]`;
					}
				} catch (toolError) {
					logger.error('LLMService', `Tool ${toolCall.name} failed`, {
						error:
							toolError instanceof Error
								? toolError.message
								: String(toolError),
					});
					text += `\n[Error: ${toolCall.name} - ${
						toolError instanceof Error ? toolError.message : String(toolError)
					}]`;
				}
			}
		}

		return {
			text: text || '[No response]',
			toolCalls,
			usage: {
				promptTokens: data.usageMetadata?.promptTokenCount || 0,
				candidatesTokens: data.usageMetadata?.candidatesTokenCount || 0,
				totalTokens: data.usageMetadata?.totalTokenCount || 0,
			},
		};
	}

	private canMakeRequest(): boolean {
		const now = Date.now();
		const oneMinuteAgo = now - 60000;
		this.requestTimestamps = this.requestTimestamps.filter(
			t => t > oneMinuteAgo,
		);
		return this.requestTimestamps.length < 15;
	}

	private recordRequest(): void {
		this.requestTimestamps.push(Date.now());
	}

	private getRetryDelay(): number {
		const oldestRequest = this.requestTimestamps[0];
		if (!oldestRequest) return 0;
		return Math.max(0, 60000 - (Date.now() - oldestRequest));
	}

	getModel(): string {
		return this.model;
	}

	getConfig(): LLMConfig {
		return {
			provider: 'gemini',
			apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : undefined,
			model: this.model,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			maxMessagesInContext: this.maxMessagesInContext,
		};
	}
}

let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
	if (!llmServiceInstance) {
		llmServiceInstance = new LLMService();
	}

	return llmServiceInstance;
}
