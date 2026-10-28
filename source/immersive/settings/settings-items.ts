import {getConfigService} from '../../services/config/config.service.ts';
import {
	getSleepTimerService,
	SLEEP_TIMER_PRESETS,
	type SleepTimerFadeOptions,
	type SleepTimerPreset,
} from '../../services/sleep-timer/sleep-timer.service.ts';
import type {
	DownloadFormat,
	EqualizerPreset,
} from '../../types/config.types.ts';
import {
	formatCookiesFromBrowserLabel,
	nextCookiesFromBrowser,
} from '../../services/player/ytdl-cookies.ts';
import {ensureDownloadDirectory} from '../../utils/download-path.ts';
import {formatTime} from '../../utils/format.ts';
import type {SettingsRow} from '../ui/settings-overlay.ts';
import {
	AI_PROVIDER_PRESETS,
	getAvailableModels,
	getProviderPreset,
} from '../../services/llm/ai-providers.ts';
import type {LLMProvider} from '../../types/llm.types.ts';
import {
	formatThemeLabel,
	nextBuiltinThemeId,
} from '../../config/themes.config.ts';

type ConfigService = ReturnType<typeof getConfigService>;

export const IMMERSIVE_SETTINGS_COUNT = 30;

const QUALITIES: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
const DOWNLOAD_FORMATS: DownloadFormat[] = ['mp3', 'm4a'];
const CROSSFADE_PRESETS = [0, 1, 2, 3, 5];
const VOLUME_FADE_PRESETS = [0, 1, 2, 3, 5];
const CACHE_TTL_PRESETS = [1, 5, 10, 15, 30];
const CACHE_ENTRIES_PRESETS = [50, 100, 200, 500];
const EQUALIZER_PRESETS: EqualizerPreset[] = [
	'flat',
	'bass_boost',
	'vocal',
	'bright',
	'warm',
];
const LLM_TEMPERATURES = [0.3, 0.5, 0.7, 0.9, 1.1];

function resolveLLMProvider(config: ConfigService): LLMProvider {
	const stored = config.getLLMConfig()?.provider;
	if (
		stored === 'gemini' ||
		stored === 'openai' ||
		stored === 'kilo' ||
		stored === 'opencode' ||
		stored === 'custom'
	) {
		return stored;
	}
	const endpoint = config.getLLMConfig()?.endpoint ?? '';
	if (/\/chat\/completions\/?$/.test(endpoint)) {
		if (endpoint.includes('api.kilo.ai')) return 'kilo';
		if (endpoint.includes('opencode.ai')) return 'opencode';
		return 'openai';
	}
	return 'kilo';
}

export type SettingsTextField =
	'llmApiKey' | 'llmBaseUrl' | 'downloadDirectory' | 'cookiesFile';

export type SettingsRowKind = 'cycle' | 'text' | 'navigate';

export interface SleepTimerState {
	lastPreset: SleepTimerPreset | null;
}

export function createSleepTimerState(): SleepTimerState {
	return {lastPreset: null};
}

export function getSettingsRowKind(index: number): SettingsRowKind {
	if (index === 0) {
		return 'navigate';
	}
	if (index === 12 || index === 16 || index === 18 || index === 22) {
		return 'text';
	}
	if (index >= 24 && index <= 27) {
		return 'navigate';
	}
	return 'cycle';
}

export function getSettingsTextField(index: number): SettingsTextField | null {
	switch (index) {
		case 12:
			return 'llmApiKey';
		case 16:
			return 'llmBaseUrl';
		case 18:
			return 'downloadDirectory';
		case 22:
			return 'cookiesFile';
		default:
			return null;
	}
}

function formatEqualizerLabel(preset: EqualizerPreset): string {
	return preset
		.split('_')
		.map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
		.join(' ');
}

function formatOnOff(value: boolean): string {
	return value ? 'ON' : 'OFF';
}

function formatToggleOff(value: number): string {
	return value === 0 ? 'Off' : `${value}s`;
}

function maskApiKey(apiKey: string | undefined): string {
	if (!apiKey) {
		return '(not set)';
	}
	if (apiKey.length <= 8) {
		return '********';
	}
	return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function shortenUrl(url: string, maxLength = 30): string {
	const stripped = url.replace(/^https?:\/\//, '');
	return stripped.length > maxLength
		? stripped.substring(0, maxLength)
		: stripped;
}

export function getSettingsTextDraft(
	config: ConfigService,
	field: SettingsTextField,
): string {
	switch (field) {
		case 'llmApiKey':
			return config.getLLMApiKey() ?? '';
		case 'llmBaseUrl':
			return config.getLLMConfig()?.baseUrl ?? '';
		case 'downloadDirectory':
			return config.get('downloadDirectory') ?? '';
		case 'cookiesFile':
			return config.get('cookiesFile') ?? '';
	}
}

export function buildImmersiveSettingsRows(
	config: ConfigService,
): SettingsRow[] {
	const llmConfig = config.getLLMConfig();
	const llmProvider = resolveLLMProvider(config);
	const llmModel =
		llmConfig?.model ?? getProviderPreset(llmProvider).defaultModel;
	const llmTemperature = llmConfig?.temperature ?? 0.7;
	const llmBaseUrl = llmConfig?.baseUrl ?? '';
	const crossfade = config.get('crossfadeDuration') ?? 0;
	const volumeFade = config.get('volumeFadeDuration') ?? 0;
	const equalizer = config.get('equalizerPreset') ?? 'flat';
	const quality = config.get('streamQuality') ?? 'high';
	const downloadDirectory = config.get('downloadDirectory') ?? '';
	const downloadFormat = config.get('downloadFormat') ?? 'mp3';
	const preferLocal = config.get('preferLocalPlayback') ?? true;

	const timerService = getSleepTimerService();
	const remainingSeconds = timerService.getRemainingSeconds();
	const sleepTimerValue =
		timerService.isActive() && remainingSeconds !== null
			? `${formatTime(remainingSeconds)} remaining (Enter to cancel)`
			: 'Off (Enter to set)';

	const themeId = String(config.get('theme') ?? 'dark');

	return [
		{label: 'Account', value: '→'},
		{label: 'Theme', value: formatThemeLabel(themeId)},
		{label: 'Stream Quality', value: quality.toUpperCase()},
		{
			label: 'Audio Normalization',
			value: formatOnOff(config.get('audioNormalization') ?? false),
		},
		{
			label: 'Gapless Playback',
			value: formatOnOff(config.get('gaplessPlayback') ?? true),
		},
		{label: 'Crossfade', value: formatToggleOff(crossfade)},
		{label: 'Volume Fade', value: formatToggleOff(volumeFade)},
		{label: 'Equalizer', value: formatEqualizerLabel(equalizer)},
		{
			label: 'Subtitles',
			value: formatOnOff(config.get('subtitlesEnabled') ?? false),
		},
		{
			label: 'Desktop Notifications',
			value: formatOnOff(config.get('notifications') ?? false),
		},
		{
			label: 'Discord Rich Presence',
			value: formatOnOff(config.get('discordRichPresence') ?? false),
		},
		{
			label: 'AI Assistant',
			value: formatOnOff(config.getLLMEnabled()),
		},
		{label: 'API Key', value: maskApiKey(config.getLLMApiKey())},
		{label: 'AI Provider', value: getProviderPreset(llmProvider).label},
		{label: 'Model', value: llmModel},
		{label: 'Temperature', value: llmTemperature.toFixed(1)},
		{
			label: 'Base URL',
			value: llmBaseUrl
				? shortenUrl(llmBaseUrl)
				: `Default (${shortenUrl(getProviderPreset(llmProvider).baseUrl)})`,
		},
		{
			label: 'Download Feature',
			value: formatOnOff(config.get('downloadsEnabled') ?? false),
		},
		{label: 'Download Folder', value: downloadDirectory || '(not set)'},
		{label: 'Download Format', value: downloadFormat.toUpperCase()},
		{
			label: 'Prefer Local Playback',
			value: formatOnOff(preferLocal),
		},
		{
			label: 'Cookies From Browser',
			value: formatCookiesFromBrowserLabel(config.get('cookiesFromBrowser')),
		},
		{
			label: 'Cookies File',
			value: config.get('cookiesFile')?.trim() || '(not set)',
		},
		{label: 'Sleep Timer', value: sleepTimerValue},
		{label: 'Import Playlists', value: '→'},
		{label: 'Export Playlists', value: '→'},
		{label: 'Custom Keybindings', value: '→'},
		{label: 'Manage Plugins', value: '→'},
		{
			label: 'Cache TTL',
			value: `${config.get('cacheTtlMinutes') ?? 5}m`,
		},
		{
			label: 'Cache Entries',
			value: String(config.get('cacheMaxEntries') ?? 100),
		},
	];
}

export function saveSettingsTextField(
	config: ConfigService,
	field: SettingsTextField,
	value: string,
): string | null {
	const trimmed = value.trim();

	switch (field) {
		case 'llmApiKey': {
			config.setLLMApiKey(trimmed);
			return null;
		}
		case 'llmBaseUrl': {
			config.setLLMConfig({...config.getLLMConfig(), baseUrl: trimmed});
			return null;
		}
		case 'downloadDirectory': {
			if (!trimmed) {
				return 'Download folder cannot be empty';
			}
			try {
				const normalized = ensureDownloadDirectory(trimmed);
				config.setSync('downloadDirectory', normalized);
				if (!(config.get('downloadsEnabled') ?? false)) {
					return 'Saved download folder (enable Download Feature to use)';
				}
				return 'Saved download folder';
			} catch (error) {
				return error instanceof Error
					? error.message
					: 'Failed to save download folder';
			}
		}
		case 'cookiesFile': {
			config.set('cookiesFile', trimmed || undefined);
			return trimmed
				? 'Saved cookies file (preferred over browser cookies)'
				: 'Cleared cookies file';
		}
	}
}

export interface CycleSettingsOptions {
	onSleepTimerExpire: () => void;
	sleepTimer: SleepTimerState;
	fadeHooks?: SleepTimerFadeOptions;
}

export async function cycleImmersiveSetting(
	config: ConfigService,
	index: number,
	options: CycleSettingsOptions,
): Promise<string | null> {
	switch (index) {
		case 0: {
			try {
				const {getAuthService} =
					await import('../../services/auth/auth.service.ts');
				const status = getAuthService().getStatus();
				if (status.loggedIn) {
					const name = status.accountName ?? 'YouTube account';
					return `Logged in as ${name}`;
				}
				return 'Not logged in — use "ymc login" in CLI';
			} catch {
				return 'Auth unavailable — use "ymc login" in CLI';
			}
		}
		case 1: {
			const current = String(config.get('theme') ?? 'dark');
			const next = nextBuiltinThemeId(current);
			config.updateTheme(next);
			return `Theme: ${formatThemeLabel(next)}`;
		}
		case 2: {
			const current = config.get('streamQuality') ?? 'high';
			const currentIndex = QUALITIES.indexOf(
				current as (typeof QUALITIES)[number],
			);
			const nextQuality =
				QUALITIES[(currentIndex + 1) % QUALITIES.length] ?? 'high';
			config.set('streamQuality', nextQuality);
			return `Stream quality: ${nextQuality.toUpperCase()}`;
		}
		case 3: {
			const next = !(config.get('audioNormalization') ?? false);
			config.set('audioNormalization', next);
			return `Audio normalization: ${formatOnOff(next)}`;
		}
		case 4: {
			const next = !(config.get('gaplessPlayback') ?? true);
			config.set('gaplessPlayback', next);
			return `Gapless playback: ${formatOnOff(next)}`;
		}
		case 5: {
			const current = config.get('crossfadeDuration') ?? 0;
			const currentIndex = CROSSFADE_PRESETS.indexOf(current);
			const next =
				CROSSFADE_PRESETS[
					(currentIndex === -1 ? 0 : currentIndex + 1) %
						CROSSFADE_PRESETS.length
				] ?? 0;
			config.set('crossfadeDuration', next);
			return next === 0 ? 'Crossfade: Off' : `Crossfade: ${next}s`;
		}
		case 6: {
			const current = config.get('volumeFadeDuration') ?? 0;
			const currentIndex = VOLUME_FADE_PRESETS.indexOf(current);
			const next =
				VOLUME_FADE_PRESETS[
					(currentIndex === -1 ? 0 : currentIndex + 1) %
						VOLUME_FADE_PRESETS.length
				] ?? 0;
			config.set('volumeFadeDuration', next);
			return next === 0 ? 'Volume fade: Off' : `Volume fade: ${next}s`;
		}
		case 7: {
			const current = config.get('equalizerPreset') ?? 'flat';
			const currentIndex = EQUALIZER_PRESETS.indexOf(current);
			const nextPreset =
				EQUALIZER_PRESETS[(currentIndex + 1) % EQUALIZER_PRESETS.length] ??
				'flat';
			config.set('equalizerPreset', nextPreset);
			return `Equalizer: ${formatEqualizerLabel(nextPreset)}`;
		}
		case 8: {
			const next = !(config.get('subtitlesEnabled') ?? false);
			config.set('subtitlesEnabled', next);
			return `Subtitles: ${formatOnOff(next)}`;
		}
		case 9: {
			const next = !(config.get('notifications') ?? false);
			config.set('notifications', next);
			return `Notifications: ${formatOnOff(next)}`;
		}
		case 10: {
			const next = !(config.get('discordRichPresence') ?? false);
			config.set('discordRichPresence', next);
			return `Discord Rich Presence: ${formatOnOff(next)}`;
		}
		case 11: {
			const next = !config.getLLMEnabled();
			config.setLLMEnabled(next);
			return `AI Assistant: ${formatOnOff(next)}`;
		}
		case 13: {
			const ids = AI_PROVIDER_PRESETS.map(p => p.id);
			const current = resolveLLMProvider(config);
			const next = ids[(ids.indexOf(current) + 1) % ids.length] ?? 'kilo';
			const preset = getProviderPreset(next);
			config.setLLMConfig({
				...config.getLLMConfig(),
				provider: next,
				model: preset.defaultModel,
				baseUrl: preset.baseUrl,
				endpoint: preset.chatCompletionsUrl,
			});
			const {models} = await getAvailableModels(
				next,
				config.getLLMApiKey() ?? '',
				undefined,
				{forceRefresh: true},
			).catch(() => ({models: [preset.defaultModel]}));
			if (models[0] && models.includes(models[0])) {
				config.setLLMConfig({...config.getLLMConfig(), model: models[0]});
			}
			return `AI provider: ${preset.label}`;
		}
		case 14: {
			const provider = resolveLLMProvider(config);
			const preset = getProviderPreset(provider);
			const {models} = await getAvailableModels(
				provider,
				config.getLLMApiKey() ?? '',
			).catch(() => ({models: [preset.defaultModel]}));
			const list = models.length > 0 ? models : [preset.defaultModel];
			const current = config.getLLMConfig()?.model ?? preset.defaultModel;
			const nextModel =
				list[(list.indexOf(current) + 1) % list.length] ?? preset.defaultModel;
			config.setLLMConfig({...config.getLLMConfig(), model: nextModel});
			return `Model: ${nextModel}`;
		}
		case 15: {
			const current = config.getLLMConfig()?.temperature ?? 0.7;
			const currentIndex = LLM_TEMPERATURES.indexOf(current);
			const nextTemp =
				LLM_TEMPERATURES[(currentIndex + 1) % LLM_TEMPERATURES.length] ?? 0.7;
			config.setLLMConfig({...config.getLLMConfig(), temperature: nextTemp});
			return `Temperature: ${nextTemp.toFixed(1)}`;
		}
		case 17: {
			const next = !(config.get('downloadsEnabled') ?? false);
			config.set('downloadsEnabled', next);
			return `Download feature: ${formatOnOff(next)}`;
		}
		case 19: {
			const current = config.get('downloadFormat') ?? 'mp3';
			const currentIndex = DOWNLOAD_FORMATS.indexOf(current);
			const nextFormat =
				DOWNLOAD_FORMATS[(currentIndex + 1) % DOWNLOAD_FORMATS.length] ?? 'mp3';
			config.set('downloadFormat', nextFormat);
			return `Download format: ${nextFormat.toUpperCase()}`;
		}
		case 20: {
			const next = !(config.get('preferLocalPlayback') ?? true);
			config.set('preferLocalPlayback', next);
			return `Prefer local playback: ${formatOnOff(next)}`;
		}
		case 21: {
			const next = nextCookiesFromBrowser(config.get('cookiesFromBrowser'));
			config.set('cookiesFromBrowser', next);
			return `Cookies from browser: ${formatCookiesFromBrowserLabel(next)}`;
		}
		case 23: {
			const timerService = getSleepTimerService();
			if (timerService.isActive()) {
				timerService.cancel();
				options.sleepTimer.lastPreset = null;
				return 'Sleep timer cancelled';
			}

			const currentPresetIndex = options.sleepTimer.lastPreset
				? SLEEP_TIMER_PRESETS.indexOf(options.sleepTimer.lastPreset)
				: -1;
			const nextPreset =
				SLEEP_TIMER_PRESETS[
					(currentPresetIndex + 1) % SLEEP_TIMER_PRESETS.length
				] ?? SLEEP_TIMER_PRESETS[0];
			options.sleepTimer.lastPreset = nextPreset;
			timerService.start(
				nextPreset,
				options.onSleepTimerExpire,
				options.fadeHooks,
			);
			return `Sleep timer: ${nextPreset} min`;
		}
		case 24:
			return 'Import Playlists: run youtube-music-cli (standard TUI) for this feature';
		case 25:
			return 'Export Playlists: run youtube-music-cli (standard TUI) for this feature';
		case 26:
			return 'Custom Keybindings: run youtube-music-cli (standard TUI) for this feature';
		case 27:
			return 'Manage Plugins: run youtube-music-cli (standard TUI) for this feature';
		case 28: {
			const current = config.get('cacheTtlMinutes') ?? 5;
			const currentIndex = CACHE_TTL_PRESETS.indexOf(current);
			const next =
				CACHE_TTL_PRESETS[
					(currentIndex === -1 ? 0 : currentIndex + 1) %
						CACHE_TTL_PRESETS.length
				] ?? 5;
			config.set('cacheTtlMinutes', next);
			return `Cache TTL: ${next}m`;
		}
		case 29: {
			const current = config.get('cacheMaxEntries') ?? 100;
			const currentIndex = CACHE_ENTRIES_PRESETS.indexOf(current);
			const next =
				CACHE_ENTRIES_PRESETS[
					(currentIndex === -1 ? 0 : currentIndex + 1) %
						CACHE_ENTRIES_PRESETS.length
				] ?? 100;
			config.set('cacheMaxEntries', next);
			return `Cache entries: ${next}`;
		}
		default:
			return null;
	}
}
