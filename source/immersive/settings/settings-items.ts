import {getConfigService} from '../../services/config/config.service.ts';
import {
	getSleepTimerService,
	SLEEP_TIMER_PRESETS,
	type SleepTimerPreset,
} from '../../services/sleep-timer/sleep-timer.service.ts';
import type {
	DownloadFormat,
	EqualizerPreset,
} from '../../types/config.types.ts';
import {ensureDownloadDirectory} from '../../utils/download-path.ts';
import {formatTime} from '../../utils/format.ts';
import type {SettingsRow} from '../ui/settings-overlay.ts';

type ConfigService = ReturnType<typeof getConfigService>;

export const IMMERSIVE_SETTINGS_COUNT = 23;

const QUALITIES: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
const DOWNLOAD_FORMATS: DownloadFormat[] = ['mp3', 'm4a'];
const CROSSFADE_PRESETS = [0, 1, 2, 3, 5];
const VOLUME_FADE_PRESETS = [0, 1, 2, 3, 5];
const EQUALIZER_PRESETS: EqualizerPreset[] = [
	'flat',
	'bass_boost',
	'vocal',
	'bright',
	'warm',
];
const LLM_MODELS = [
	'gemini-2.0-flash',
	'gemini-2.0-flash-lite',
	'gemini-1.5-flash',
	'kilo-auto/free',
	'kilo-auto/pro',
];
const LLM_TEMPERATURES = [0.3, 0.5, 0.7, 0.9, 1.1];
const LLM_ENDPOINTS = [
	'',
	'https://api.kilogateway.com/v1/chat/completions',
	'https://api.openai.com/v1/chat/completions',
];

export type SettingsTextField =
	'llmApiKey' | 'llmBaseUrl' | 'downloadDirectory';

export type SettingsRowKind = 'cycle' | 'text' | 'navigate';

export interface SleepTimerState {
	lastPreset: SleepTimerPreset | null;
}

export function createSleepTimerState(): SleepTimerState {
	return {lastPreset: null};
}

export function getSettingsRowKind(index: number): SettingsRowKind {
	if (index === 10 || index === 14 || index === 16) {
		return 'text';
	}
	if (index >= 19) {
		return 'navigate';
	}
	return 'cycle';
}

export function getSettingsTextField(index: number): SettingsTextField | null {
	switch (index) {
		case 10:
			return 'llmApiKey';
		case 14:
			return 'llmBaseUrl';
		case 16:
			return 'downloadDirectory';
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
	}
}

export function buildImmersiveSettingsRows(
	config: ConfigService,
): SettingsRow[] {
	const llmConfig = config.getLLMConfig();
	const llmModel = llmConfig?.model ?? 'gemini-2.0-flash';
	const llmTemperature = llmConfig?.temperature ?? 0.7;
	const llmEndpoint = llmConfig?.endpoint ?? '';
	const llmBaseUrl = llmConfig?.baseUrl ?? '';
	const crossfade = config.get('crossfadeDuration') ?? 0;
	const volumeFade = config.get('volumeFadeDuration') ?? 0;
	const equalizer = config.get('equalizerPreset') ?? 'flat';
	const quality = config.get('streamQuality') ?? 'high';
	const downloadDirectory = config.get('downloadDirectory') ?? '';
	const downloadFormat = config.get('downloadFormat') ?? 'mp3';

	const timerService = getSleepTimerService();
	const remainingSeconds = timerService.getRemainingSeconds();
	const sleepTimerValue =
		timerService.isActive() && remainingSeconds !== null
			? `${formatTime(remainingSeconds)} remaining (Enter to cancel)`
			: 'Off (Enter to set)';

	return [
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
		{label: 'Model', value: llmModel},
		{label: 'Temperature', value: llmTemperature.toFixed(1)},
		{
			label: 'Endpoint',
			value: llmEndpoint ? shortenUrl(llmEndpoint) : 'Default (Gemini)',
		},
		{
			label: 'Base URL',
			value: llmBaseUrl ? shortenUrl(llmBaseUrl) : '(not set)',
		},
		{
			label: 'Download Feature',
			value: formatOnOff(config.get('downloadsEnabled') ?? false),
		},
		{label: 'Download Folder', value: downloadDirectory || '(not set)'},
		{label: 'Download Format', value: downloadFormat.toUpperCase()},
		{label: 'Sleep Timer', value: sleepTimerValue},
		{label: 'Import Playlists', value: '→'},
		{label: 'Export Playlists', value: '→'},
		{label: 'Custom Keybindings', value: '→'},
		{label: 'Manage Plugins', value: '→'},
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
	}
}

export interface CycleSettingsOptions {
	onSleepTimerExpire: () => void;
	sleepTimer: SleepTimerState;
}

export function cycleImmersiveSetting(
	config: ConfigService,
	index: number,
	options: CycleSettingsOptions,
): string | null {
	switch (index) {
		case 0: {
			const current = config.get('streamQuality') ?? 'high';
			const currentIndex = QUALITIES.indexOf(
				current as (typeof QUALITIES)[number],
			);
			const nextQuality =
				QUALITIES[(currentIndex + 1) % QUALITIES.length] ?? 'high';
			config.set('streamQuality', nextQuality);
			return `Stream quality: ${nextQuality.toUpperCase()}`;
		}
		case 1: {
			const next = !(config.get('audioNormalization') ?? false);
			config.set('audioNormalization', next);
			return `Audio normalization: ${formatOnOff(next)}`;
		}
		case 2: {
			const next = !(config.get('gaplessPlayback') ?? true);
			config.set('gaplessPlayback', next);
			return `Gapless playback: ${formatOnOff(next)}`;
		}
		case 3: {
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
		case 4: {
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
		case 5: {
			const current = config.get('equalizerPreset') ?? 'flat';
			const currentIndex = EQUALIZER_PRESETS.indexOf(current);
			const nextPreset =
				EQUALIZER_PRESETS[(currentIndex + 1) % EQUALIZER_PRESETS.length] ??
				'flat';
			config.set('equalizerPreset', nextPreset);
			return `Equalizer: ${formatEqualizerLabel(nextPreset)}`;
		}
		case 6: {
			const next = !(config.get('subtitlesEnabled') ?? false);
			config.set('subtitlesEnabled', next);
			return `Subtitles: ${formatOnOff(next)}`;
		}
		case 7: {
			const next = !(config.get('notifications') ?? false);
			config.set('notifications', next);
			return `Notifications: ${formatOnOff(next)}`;
		}
		case 8: {
			const next = !(config.get('discordRichPresence') ?? false);
			config.set('discordRichPresence', next);
			return `Discord Rich Presence: ${formatOnOff(next)}`;
		}
		case 9: {
			const next = !config.getLLMEnabled();
			config.setLLMEnabled(next);
			return `AI Assistant: ${formatOnOff(next)}`;
		}
		case 11: {
			const current = config.getLLMConfig()?.model ?? 'gemini-2.0-flash';
			const currentIndex = LLM_MODELS.indexOf(current);
			const nextModel =
				LLM_MODELS[(currentIndex + 1) % LLM_MODELS.length] ??
				'gemini-2.0-flash';
			config.setLLMConfig({...config.getLLMConfig(), model: nextModel});
			return `Model: ${nextModel}`;
		}
		case 12: {
			const current = config.getLLMConfig()?.temperature ?? 0.7;
			const currentIndex = LLM_TEMPERATURES.indexOf(current);
			const nextTemp =
				LLM_TEMPERATURES[(currentIndex + 1) % LLM_TEMPERATURES.length] ?? 0.7;
			config.setLLMConfig({...config.getLLMConfig(), temperature: nextTemp});
			return `Temperature: ${nextTemp.toFixed(1)}`;
		}
		case 13: {
			const current = config.getLLMConfig()?.endpoint ?? '';
			const currentIndex = LLM_ENDPOINTS.indexOf(current);
			const nextEndpoint =
				LLM_ENDPOINTS[(currentIndex + 1) % LLM_ENDPOINTS.length] ?? '';
			config.setLLMConfig({...config.getLLMConfig(), endpoint: nextEndpoint});
			return nextEndpoint
				? `Endpoint: ${shortenUrl(nextEndpoint)}`
				: 'Endpoint: Default (Gemini)';
		}
		case 15: {
			const next = !(config.get('downloadsEnabled') ?? false);
			config.set('downloadsEnabled', next);
			return `Download feature: ${formatOnOff(next)}`;
		}
		case 17: {
			const current = config.get('downloadFormat') ?? 'mp3';
			const currentIndex = DOWNLOAD_FORMATS.indexOf(current);
			const nextFormat =
				DOWNLOAD_FORMATS[(currentIndex + 1) % DOWNLOAD_FORMATS.length] ?? 'mp3';
			config.set('downloadFormat', nextFormat);
			return `Download format: ${nextFormat.toUpperCase()}`;
		}
		case 18: {
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
			timerService.start(nextPreset, options.onSleepTimerExpire);
			return `Sleep timer: ${nextPreset} min`;
		}
		case 19:
			return 'Import Playlists: run youtube-music-cli (standard TUI) for this feature';
		case 20:
			return 'Export Playlists: run youtube-music-cli (standard TUI) for this feature';
		case 21:
			return 'Custom Keybindings: run youtube-music-cli (standard TUI) for this feature';
		case 22:
			return 'Manage Plugins: run youtube-music-cli (standard TUI) for this feature';
		default:
			return null;
	}
}
