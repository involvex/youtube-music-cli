import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import type {LLMProvider} from '../../types/llm.types.ts';

export interface AIProviderPreset {
	id: LLMProvider;
	label: string;
	modelsUrl: string;
	chatCompletionsUrl: string;
	baseUrl: string;
	defaultModel: string;
	envKey: string;
	isGemini: boolean;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
	{
		id: 'kilo',
		label: 'Kilo',
		modelsUrl: 'https://api.kilo.ai/api/gateway/models',
		chatCompletionsUrl: 'https://api.kilo.ai/api/gateway/chat/completions',
		baseUrl: 'https://api.kilo.ai/api/gateway',
		defaultModel: 'kilo-auto/free',
		envKey: 'KILO_API_KEY',
		isGemini: false,
	},
	{
		id: 'gemini',
		label: 'Gemini',
		modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
		chatCompletionsUrl: '',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		defaultModel: 'gemini-2.0-flash',
		envKey: 'GEMINI_API_KEY',
		isGemini: true,
	},
	{
		id: 'opencode',
		label: 'Opencode Console',
		modelsUrl: 'https://opencode.ai/inference/v1/models',
		chatCompletionsUrl:
			'https://opencode.ai/inference/openai/v1/chat/completions',
		baseUrl: 'https://opencode.ai/inference/openai/v1',
		defaultModel: 'opencode-auto',
		envKey: 'OPENCODE_API_KEY',
		isGemini: false,
	},
	{
		id: 'openai',
		label: 'OpenAI compatible',
		modelsUrl: 'https://api.openai.com/v1/models',
		chatCompletionsUrl: 'https://api.openai.com/v1/chat/completions',
		baseUrl: 'https://api.openai.com/v1',
		defaultModel: 'gpt-4o-mini',
		envKey: 'OPENAI_API_KEY',
		isGemini: false,
	},
];

export function getProviderPreset(id: LLMProvider): AIProviderPreset {
	return AI_PROVIDER_PRESETS.find(p => p.id === id) ?? AI_PROVIDER_PRESETS[0]!;
}

function cacheFilePath(): string {
	return join(CONFIG_DIR, 'llm-models-cache.json');
}

interface ModelsCacheFile {
	updatedAt: number;
	byProvider: Partial<Record<LLMProvider, string[]>>;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCache(): ModelsCacheFile {
	try {
		if (!existsSync(cacheFilePath())) {
			return {updatedAt: 0, byProvider: {}};
		}
		const raw = readFileSync(cacheFilePath(), 'utf8');
		return JSON.parse(raw) as ModelsCacheFile;
	} catch {
		return {updatedAt: 0, byProvider: {}};
	}
}

function writeCache(cache: ModelsCacheFile): void {
	try {
		if (!existsSync(CONFIG_DIR)) {
			mkdirSync(CONFIG_DIR, {recursive: true});
		}
		writeFileSync(cacheFilePath(), JSON.stringify(cache, null, 2), 'utf8');
	} catch {
		/* cache is best-effort */
	}
}

export function getCachedModels(provider: LLMProvider): string[] {
	return readCache().byProvider[provider] ?? [];
}

function normalizeModelId(entry: unknown): string | null {
	if (typeof entry === 'string') {
		return entry;
	}
	if (entry !== null && typeof entry === 'object') {
		const record = entry as Record<string, unknown>;
		for (const key of ['id', 'name', 'model']) {
			if (typeof record[key] === 'string' && (record[key] as string)) {
				return record[key] as string;
			}
		}
	}
	return null;
}

export async function fetchAvailableModels(
	provider: LLMProvider,
	apiKey: string,
	modelsUrlOverride?: string,
): Promise<string[]> {
	const preset = getProviderPreset(provider);
	const url = modelsUrlOverride?.trim() || preset.modelsUrl;
	const headers: Record<string, string> = {};
	if (apiKey && !preset.isGemini) {
		headers['Authorization'] = `Bearer ${apiKey}`;
	}
	const target = preset.isGemini && apiKey ? `${url}?key=${apiKey}` : url;
	const response = await fetch(target, {headers});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`${response.status}: ${text.slice(0, 200)}`);
	}
	const data = (await response.json()) as unknown;
	const list = Array.isArray(data)
		? data
		: ((data as {data?: unknown})?.data ??
			(data as {models?: unknown})?.models);
	if (!Array.isArray(list)) {
		throw new Error('Unexpected models response shape');
	}
	const models = list
		.map(normalizeModelId)
		.filter((m): m is string => Boolean(m));
	if (models.length === 0) {
		throw new Error('No models returned by provider');
	}
	const cache = readCache();
	cache.updatedAt = Date.now();
	cache.byProvider[provider] = models;
	writeCache(cache);
	return models;
}

export async function getAvailableModels(
	provider: LLMProvider,
	apiKey: string,
	modelsUrlOverride?: string,
	options: {forceRefresh?: boolean} = {},
): Promise<{models: string[]; fromCache: boolean}> {
	const cached = getCachedModels(provider);
	const cache = readCache();
	const fresh = Date.now() - cache.updatedAt < CACHE_TTL_MS;
	if (!options.forceRefresh && cached.length > 0 && fresh) {
		return {models: cached, fromCache: true};
	}
	try {
		const models = await fetchAvailableModels(
			provider,
			apiKey,
			modelsUrlOverride,
		);
		return {models, fromCache: false};
	} catch {
		if (cached.length > 0) {
			return {models: cached, fromCache: true};
		}
		return {
			models: [getProviderPreset(provider).defaultModel],
			fromCache: true,
		};
	}
}
