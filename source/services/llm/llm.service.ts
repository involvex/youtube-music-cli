// LLM service supporting both Gemini and OpenAI-compatible APIs
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
import type {ToolExecutorContext} from './tool-executor.ts';

import type {LLMProvider} from '../../types/llm.types.ts';
import {
	AI_PROVIDER_PRESETS,
	fetchAvailableModels,
	getAvailableModels,
	getCachedModels,
	getProviderPreset,
} from './ai-providers.ts';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

type Provider = LLMProvider;

const OPENAI_COMPATIBLE_PROVIDERS: Provider[] = [
	'openai',
	'kilo',
	'opencode',
	'custom',
];

function normalizeBaseUrl(value: string): string {
	return value.trim().replace(/\/+$/, '');
}

function resolveChatUrl(baseUrl: string, endpoint: string): string {
	const trimmedEndpoint = endpoint.trim();
	if (trimmedEndpoint) {
		return trimmedEndpoint;
	}
	const base = normalizeBaseUrl(baseUrl);
	if (/\/chat\/completions\/?$/.test(base)) {
		return base;
	}
	return `${base}/chat/completions`;
}

interface GeminiContentPart {
	text: string;
}

interface GeminiContent {
	role: string;
	parts: GeminiContentPart[];
}

interface OpenAIMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: 'function';
		function: {name: string; arguments: string};
	}>;
	tool_call_id?: string;
}

interface OpenAITool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: ToolDefinition['parameters'];
	};
}

class LLMService {
	private apiKey = '';

	private provider: Provider = 'gemini';

	private model = 'gemini-2.0-flash';

	private temperature = 0.7;

	private maxTokens = 2048;

	private maxMessagesInContext = 10;

	private requestTimestamps: number[] = [];

	private baseUrl = GEMINI_API_BASE;

	private endpoint = '';

	constructor() {
		this.loadConfig();
	}

	private loadConfig(): void {
		const configService = getConfigService();
		const presetIds = AI_PROVIDER_PRESETS.map(p => p.id);
		const envKey =
			process.env['GEMINI_API_KEY'] ||
			process.env['KILO_API_KEY'] ||
			process.env['OPENCODE_API_KEY'] ||
			process.env['OPENAI_API_KEY'];
		if (envKey) {
			this.apiKey = envKey;
		}
		const llmConfig = configService.get('llm');
		if (llmConfig?.apiKey) {
			this.apiKey = llmConfig.apiKey;
		}
		if (llmConfig?.provider) {
			const provider = llmConfig.provider as Provider;
			if (presetIds.includes(provider) || provider === 'anthropic') {
				this.provider = provider;
			}
		}
		// Infer OpenAI-compatible provider from a stored chat-completions URL
		// when provider was never set (fixes legacy kilo configs showing undefined).
		const storedEndpoint = llmConfig?.endpoint?.trim() ?? '';
		if (
			!llmConfig?.provider &&
			/\/chat\/completions\/?$/.test(storedEndpoint)
		) {
			if (storedEndpoint.includes('api.kilo.ai')) {
				this.provider = 'kilo';
			} else if (storedEndpoint.includes('opencode.ai')) {
				this.provider = 'opencode';
			} else {
				this.provider = 'openai';
			}
		}
		const preset = getProviderPreset(this.provider);
		if (llmConfig?.model) {
			this.model = llmConfig.model;
		} else {
			this.model = preset.defaultModel;
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
		if (llmConfig?.baseUrl) {
			this.baseUrl = llmConfig.baseUrl;
		}
		if (llmConfig?.endpoint) {
			this.endpoint = llmConfig.endpoint;
		}
		this.applyProviderDefaults();
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

	setProvider(provider: Provider): void {
		this.provider = provider;
		this.applyProviderDefaults();
		const configService = getConfigService();
		const currentConfig = configService.get('llm') || {};
		const preset = getProviderPreset(provider);
		configService.set('llm', {
			...currentConfig,
			provider,
			baseUrl: this.baseUrl,
			endpoint: this.endpoint || preset.chatCompletionsUrl,
			model: currentConfig.model || preset.defaultModel,
		});
		this.loadConfig();
	}

	private isOpenAICompatible(): boolean {
		return OPENAI_COMPATIBLE_PROVIDERS.includes(this.provider);
	}

	private applyProviderDefaults(): void {
		const preset = getProviderPreset(this.provider);
		if (this.isOpenAICompatible()) {
			if (!this.baseUrl || this.baseUrl === GEMINI_API_BASE) {
				this.baseUrl = preset.baseUrl;
			}
			if (!this.endpoint) {
				this.endpoint = preset.chatCompletionsUrl;
			}
			if (
				!this.model ||
				this.model === 'gemini-2.0-flash' ||
				this.model === 'undefined'
			) {
				this.model = preset.defaultModel;
			}
		} else if (this.provider === 'gemini') {
			if (
				!this.baseUrl ||
				this.baseUrl.includes('api.kilo.ai') ||
				this.baseUrl.includes('opencode.ai')
			) {
				this.baseUrl = GEMINI_API_BASE;
			}
			if (this.endpoint && /\/chat\/completions\/?$/.test(this.endpoint)) {
				this.endpoint = '';
			}
		}
	}

	reloadConfig(): void {
		this.loadConfig();
	}

	getProviderPresets() {
		return AI_PROVIDER_PRESETS;
	}

	getChatCompletionsUrl(): string {
		if (this.provider === 'gemini') {
			return this.endpoint
				? `${this.endpoint}?key=${this.apiKey}`
				: `${normalizeBaseUrl(this.baseUrl)}/models/${this.model}:generateContent?key=${this.apiKey}`;
		}
		return resolveChatUrl(this.baseUrl, this.endpoint);
	}

	async fetchAvailableModels(forceRefresh = false): Promise<string[]> {
		const {models} = await getAvailableModels(
			this.provider,
			this.apiKey,
			undefined,
			{forceRefresh},
		);
		return models;
	}

	getCachedModels(): string[] {
		const cached = getCachedModels(this.provider);
		return cached.length > 0
			? cached
			: [getProviderPreset(this.provider).defaultModel];
	}

	async refreshModels(): Promise<string[]> {
		return fetchAvailableModels(this.provider, this.apiKey);
	}

	async chat(
		prompt: string,
		context: ChatContext,
		history: ChatMessage[] = [],
		toolContext?: ToolExecutorContext,
	): Promise<LLMResponse> {
		if (!this.isConfigured()) {
			const error: LLMError = {
				code: 'NO_API_KEY',
				message:
					'API key not configured. Set GEMINI_API_KEY, KILO_API_KEY, OPENCODE_API_KEY, or OPENAI_API_KEY, or configure in settings.',
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
		const tools = getToolDefinitions();

		try {
			this.recordRequest();
			let response: LLMResponse;
			if (this.isOpenAICompatible()) {
				response = await this.makeOpenAIRequest(
					prompt,
					history,
					systemPrompt,
					tools,
					toolContext,
				);
			} else {
				response = await this.makeGeminiRequest(
					prompt,
					history,
					systemPrompt,
					tools,
					toolContext,
				);
			}
			return response;
		} catch (error) {
			if (error instanceof Error) {
				if (
					error.message.includes('API_KEY') ||
					error.message.includes('auth') ||
					error.message.includes('401')
				) {
					const llmError: LLMError = {
						code: 'INVALID_KEY',
						message: 'Invalid API key. Please check your API key.',
					};
					throw llmError;
				}
				if (error.message.includes('quota') || error.message.includes('429')) {
					const llmError: LLMError = {
						code: 'QUOTA_EXCEEDED',
						message: 'API quota exceeded. Please check your usage.',
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
- Generate playlists from mood or description
- Answer questions about music

When user asks to play music or add to queue, use the add_to_queue tool.
When user asks for recommendations based on what's playing, use get_suggestions.
When user wants to create a playlist, use create_playlist.
When user asks to generate a playlist from a mood or description, use generate_playlist.

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

	private buildGeminiMessages(
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

	private buildOpenAIMessages(
		prompt: string,
		history: ChatMessage[],
		systemPrompt: string,
	): OpenAIMessage[] {
		const messages: OpenAIMessage[] = [{role: 'system', content: systemPrompt}];

		const recentHistory = history.slice(-this.maxMessagesInContext);
		for (const msg of recentHistory) {
			if (msg.role === 'user' || msg.role === 'assistant') {
				messages.push({
					role: msg.role,
					content: msg.content,
				});
			}
		}

		messages.push({role: 'user', content: prompt});

		return messages;
	}

	private convertToolsToOpenAI(tools: ToolDefinition[]): OpenAITool[] {
		return tools.map(t => ({
			type: 'function',
			function: {
				name: t.name,
				description: t.description,
				parameters: t.parameters,
			},
		}));
	}

	private async makeGeminiRequest(
		prompt: string,
		history: ChatMessage[],
		systemPrompt: string,
		tools: ToolDefinition[],
		toolContext?: ToolExecutorContext,
	): Promise<LLMResponse> {
		const messages = this.buildGeminiMessages(prompt, history, systemPrompt);

		const url = this.endpoint
			? `${this.endpoint}?key=${this.apiKey}`
			: `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

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
					const result = await executeTool(
						toolCall.name,
						toolCall.args,
						toolContext,
					);
					toolCall.result = result;
					logger.debug('LLMService', `Tool ${toolCall.name} executed`, {
						success: result.success,
					});
					if (!result.success) {
						text += `\n[Error: ${toolCall.name} - ${result.error}]`;
					}
				} catch (toolError) {
					toolCall.result = {
						success: false,
						error:
							toolError instanceof Error
								? toolError.message
								: String(toolError),
					};
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

	private async makeOpenAIRequest(
		prompt: string,
		history: ChatMessage[],
		systemPrompt: string,
		tools: ToolDefinition[],
		toolContext?: ToolExecutorContext,
	): Promise<LLMResponse> {
		const messages = this.buildOpenAIMessages(prompt, history, systemPrompt);
		const openAITools = this.convertToolsToOpenAI(tools);

		const url = resolveChatUrl(this.baseUrl, this.endpoint);

		const body = {
			model: this.model,
			messages,
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			tools: openAITools.length > 0 ? openAITools : undefined,
			tool_choice: openAITools.length > 0 ? 'auto' : undefined,
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`${response.status}: ${errorText}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{
				message?: {
					content?: string | null;
					tool_calls?: Array<{
						id: string;
						type: 'function';
						function: {name: string; arguments: string};
					}>;
				};
			}>;
			usage?: {
				prompt_tokens?: number;
				completion_tokens?: number;
				total_tokens?: number;
			};
		};

		const choice = data.choices?.[0];
		if (!choice) {
			throw new Error('No response from OpenAI-compatible API');
		}

		const message = choice.message;
		let text = message?.content || '';
		const toolCalls: ToolCall[] = [];

		if (message?.tool_calls) {
			for (const tc of message.tool_calls) {
				if (tc.type === 'function') {
					try {
						const args = JSON.parse(tc.function.arguments);
						toolCalls.push({
							name: tc.function.name,
							args,
						});
					} catch {
						logger.error('LLMService', 'Failed to parse tool call arguments', {
							arguments: tc.function.arguments,
						});
					}
				}
			}
		}

		if (toolCalls.length > 0) {
			logger.debug('LLMService', 'Tool calls detected', {
				count: toolCalls.length,
			});
			for (const toolCall of toolCalls) {
				try {
					const result = await executeTool(
						toolCall.name,
						toolCall.args,
						toolContext,
					);
					toolCall.result = result;
					logger.debug('LLMService', `Tool ${toolCall.name} executed`, {
						success: result.success,
					});
					if (!result.success) {
						text += `\n[Error: ${toolCall.name} - ${result.error}]`;
					}
				} catch (toolError) {
					toolCall.result = {
						success: false,
						error:
							toolError instanceof Error
								? toolError.message
								: String(toolError),
					};
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
				promptTokens: data.usage?.prompt_tokens || 0,
				candidatesTokens: data.usage?.completion_tokens || 0,
				totalTokens: data.usage?.total_tokens || 0,
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

	getProvider(): Provider {
		return this.provider;
	}

	getConfig(): LLMConfig {
		return {
			provider: this.provider,
			apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : undefined,
			model: this.model,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			maxMessagesInContext: this.maxMessagesInContext,
			baseUrl: this.baseUrl,
			endpoint: this.endpoint,
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
