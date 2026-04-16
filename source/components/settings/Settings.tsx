// Settings component
import {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {useSleepTimer} from '../../hooks/useSleepTimer.ts';
import {formatTime} from '../../utils/format.ts';
import {useKeyboardBlocker} from '../../hooks/useKeyboardBlocker.tsx';
import type {
	DownloadFormat,
	EqualizerPreset,
} from '../../types/config.types.ts';

const QUALITIES: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
const DOWNLOAD_FORMATS: DownloadFormat[] = ['mp3', 'm4a'];
const CROSSFADE_PRESETS = [0, 1, 2, 3, 5];
const EQUALIZER_PRESETS: EqualizerPreset[] = [
	'flat',
	'bass_boost',
	'vocal',
	'bright',
	'warm',
];
const VOLUME_FADE_PRESETS = [0, 1, 2, 3, 5];

const SETTINGS_ITEMS = [
	'Stream Quality',
	'Audio Normalization',
	'Gapless Playback',
	'Crossfade Duration',
	'Volume Fade Duration',
	'Equalizer Preset',
	'Subtitles',
	'Notifications',
	'Discord Rich Presence',
	'LLM Enabled',
	'LLM API Key',
	'LLM Model',
	'LLM Temperature',
	'Downloads Enabled',
	'Download Folder',
	'Download Format',
	'Sleep Timer',
	'Import Playlists',
	'Export Playlists',
	'Custom Keybindings',
	'Manage Plugins',
] as const;

export default function Settings() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const config = getConfigService();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [quality, setQuality] = useState(config.get('streamQuality') || 'high');
	const [audioNormalization, setAudioNormalization] = useState(
		config.get('audioNormalization') ?? false,
	);
	const [gaplessPlayback, setGaplessPlayback] = useState(
		config.get('gaplessPlayback') ?? true,
	);
	const [crossfadeDuration, setCrossfadeDuration] = useState(
		config.get('crossfadeDuration') ?? 0,
	);
	const [volumeFadeDuration, setVolumeFadeDuration] = useState(
		config.get('volumeFadeDuration') ?? 0,
	);
	const [equalizerPreset, setEqualizerPreset] = useState<EqualizerPreset>(
		config.get('equalizerPreset') ?? 'flat',
	);
	const [subtitlesEnabled, setSubtitlesEnabled] = useState(
		config.get('subtitlesEnabled') ?? false,
	);
	const [notifications, setNotifications] = useState(
		config.get('notifications') ?? false,
	);
	const [discordRpc, setDiscordRpc] = useState(
		config.get('discordRichPresence') ?? false,
	);
	const [downloadsEnabled, setDownloadsEnabled] = useState(
		config.get('downloadsEnabled') ?? false,
	);
	const [downloadDirectory, setDownloadDirectory] = useState(
		config.get('downloadDirectory') ?? '',
	);
	const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>(
		config.get('downloadFormat') ?? 'mp3',
	);
	const [llmEnabled, setLLMEnabled] = useState(config.getLLMEnabled());
	const [llmApiKey, setLLMApiKey] = useState(config.getLLMApiKey() ?? '');
	const [llmModel, setLLMModel] = useState(
		config.getLLMConfig()?.model ?? 'gemini-2.0-flash',
	);
	const [llmTemperature, setLLMTemperature] = useState(
		config.getLLMConfig()?.temperature ?? 0.7,
	);
	const [isEditingDownloadDirectory, setIsEditingDownloadDirectory] =
		useState(false);
	const [isEditingApiKey, setIsEditingApiKey] = useState(false);
	const {
		isActive,
		activeMinutes,
		remainingSeconds,
		startTimer,
		cancelTimer,
		presets,
	} = useSleepTimer();
	useKeyboardBlocker(isEditingDownloadDirectory);
	useKeyboardBlocker(isEditingApiKey);

	const navigateUp = () => {
		setSelectedIndex(prev => Math.max(0, prev - 1));
	};

	const navigateDown = (): void => {
		setSelectedIndex(prev => Math.min(SETTINGS_ITEMS.length - 1, prev + 1));
	};

	const toggleQuality = () => {
		const currentIndex = QUALITIES.indexOf(quality);
		const nextQuality = QUALITIES[(currentIndex + 1) % QUALITIES.length]!;
		setQuality(nextQuality);
		config.set('streamQuality', nextQuality);
	};

	const toggleNormalization = () => {
		const next = !audioNormalization;
		setAudioNormalization(next);
		config.set('audioNormalization', next);
	};

	const toggleGaplessPlayback = () => {
		const next = !gaplessPlayback;
		setGaplessPlayback(next);
		config.set('gaplessPlayback', next);
	};

	const cycleCrossfadeDuration = () => {
		const currentIndex = CROSSFADE_PRESETS.indexOf(crossfadeDuration);
		const nextIndex =
			currentIndex === -1 ? 0 : (currentIndex + 1) % CROSSFADE_PRESETS.length;
		const next = CROSSFADE_PRESETS[nextIndex] ?? 0;
		setCrossfadeDuration(next);
		config.set('crossfadeDuration', next);
	};

	const cycleVolumeFadeDuration = () => {
		const currentIndex = VOLUME_FADE_PRESETS.indexOf(volumeFadeDuration);
		const nextIndex =
			currentIndex === -1 ? 0 : (currentIndex + 1) % VOLUME_FADE_PRESETS.length;
		const next = VOLUME_FADE_PRESETS[nextIndex] ?? 0;
		setVolumeFadeDuration(next);
		config.set('volumeFadeDuration', next);
	};

	const cycleEqualizerPreset = () => {
		const currentIndex = EQUALIZER_PRESETS.indexOf(equalizerPreset);
		const nextPreset =
			EQUALIZER_PRESETS[(currentIndex + 1) % EQUALIZER_PRESETS.length]!;
		setEqualizerPreset(nextPreset);
		config.set('equalizerPreset', nextPreset);
	};

	const toggleSubtitles = () => {
		const next = !subtitlesEnabled;
		setSubtitlesEnabled(next);
		config.set('subtitlesEnabled', next);
	};

	const formatEqualizerLabel = (preset: EqualizerPreset) =>
		preset
			.split('_')
			.map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
			.join(' ');

	const toggleNotifications = () => {
		const next = !notifications;
		setNotifications(next);
		config.set('notifications', next);
	};

	const toggleDiscordRpc = () => {
		const next = !discordRpc;
		setDiscordRpc(next);
		config.set('discordRichPresence', next);
	};

	const toggleDownloadsEnabled = () => {
		const next = !downloadsEnabled;
		setDownloadsEnabled(next);
		config.set('downloadsEnabled', next);
	};

	const cycleDownloadFormat = () => {
		const currentIndex = DOWNLOAD_FORMATS.indexOf(downloadFormat);
		const nextFormat =
			DOWNLOAD_FORMATS[(currentIndex + 1) % DOWNLOAD_FORMATS.length]!;
		setDownloadFormat(nextFormat);
		config.set('downloadFormat', nextFormat);
	};

	const toggleLLMEnabled = () => {
		const next = !llmEnabled;
		setLLMEnabled(next);
		config.setLLMEnabled(next);
	};

	const cycleLLMModel = () => {
		const models = [
			'gemini-2.0-flash',
			'gemini-2.0-flash-lite',
			'gemini-1.5-flash',
		];
		const currentIndex = models.indexOf(llmModel);
		const nextModel = models[(currentIndex + 1) % models.length]!;
		setLLMModel(nextModel);
		config.setLLMConfig({...config.getLLMConfig(), model: nextModel});
	};

	const cycleLLMTemperature = () => {
		const temps = [0.3, 0.5, 0.7, 0.9, 1.1];
		const currentIndex = temps.indexOf(llmTemperature);
		const nextTemp = temps[(currentIndex + 1) % temps.length]!;
		setLLMTemperature(nextTemp);
		config.setLLMConfig({...config.getLLMConfig(), temperature: nextTemp});
	};

	const cycleSleepTimer = () => {
		if (isActive) {
			cancelTimer();
			return;
		}
		// Find next preset (start from first if none active)
		const currentPresetIndex = activeMinutes
			? presets.indexOf(activeMinutes as (typeof presets)[number])
			: -1;
		const nextPreset = presets[(currentPresetIndex + 1) % presets.length]!;
		startTimer(nextPreset);
	};

	const handleSelect = () => {
		if (selectedIndex === 0) {
			toggleQuality();
		} else if (selectedIndex === 1) {
			toggleNormalization();
		} else if (selectedIndex === 2) {
			toggleGaplessPlayback();
		} else if (selectedIndex === 3) {
			cycleCrossfadeDuration();
		} else if (selectedIndex === 4) {
			cycleVolumeFadeDuration();
		} else if (selectedIndex === 5) {
			cycleEqualizerPreset();
		} else if (selectedIndex === 6) {
			toggleSubtitles();
		} else if (selectedIndex === 7) {
			toggleNotifications();
		} else if (selectedIndex === 8) {
			toggleDiscordRpc();
		} else if (selectedIndex === 9) {
			toggleLLMEnabled();
		} else if (selectedIndex === 10) {
			setIsEditingApiKey(true);
		} else if (selectedIndex === 11) {
			cycleLLMModel();
		} else if (selectedIndex === 12) {
			cycleLLMTemperature();
		} else if (selectedIndex === 13) {
			toggleDownloadsEnabled();
		} else if (selectedIndex === 14) {
			setIsEditingDownloadDirectory(true);
		} else if (selectedIndex === 15) {
			cycleDownloadFormat();
		} else if (selectedIndex === 16) {
			cycleSleepTimer();
		} else if (selectedIndex === 17) {
			dispatch({category: 'NAVIGATE', view: VIEW.EXPORT_PLAYLISTS});
		} else if (selectedIndex === 18) {
			dispatch({category: 'NAVIGATE', view: VIEW.KEYBINDINGS});
		} else if (selectedIndex === 19) {
			dispatch({category: 'NAVIGATE', view: VIEW.PLUGINS});
		}
	};

	useKeyBinding(KEYBINDINGS.UP, navigateUp);
	useKeyBinding(KEYBINDINGS.DOWN, navigateDown);
	useKeyBinding(KEYBINDINGS.SELECT, handleSelect);

	const sleepTimerLabel =
		isActive && remainingSeconds !== null
			? `Sleep Timer: ${formatTime(remainingSeconds)} remaining (Enter to cancel)`
			: 'Sleep Timer: Off (Enter to set)';

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				borderStyle="double"
				borderColor={theme.colors.secondary}
				paddingX={1}
				marginBottom={1}
			>
				<Text bold color={theme.colors.primary}>
					Settings
				</Text>
			</Box>

			{/* Stream Quality */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 0 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 0 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 0}
				>
					Stream Quality: {quality.toUpperCase()}
				</Text>
			</Box>

			{/* Audio Normalization */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 1 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 1 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 1}
				>
					Audio Normalization: {audioNormalization ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* Gapless Playback */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 2 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 2 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 2}
				>
					Gapless Playback: {gaplessPlayback ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* Crossfade Duration */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 3 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 3 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 3}
				>
					Crossfade: {crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}
				</Text>
			</Box>

			{/* Volume Fade Duration */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 4 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 4 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 4}
				>
					Volume Fade:{' '}
					{volumeFadeDuration === 0 ? 'Off' : `${volumeFadeDuration}s`}
				</Text>
			</Box>

			{/* Equalizer Preset */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 5 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 5 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 5}
				>
					Equalizer: {formatEqualizerLabel(equalizerPreset)}
				</Text>
			</Box>

			{/* Subtitles */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 6 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 6 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 6}
				>
					Subtitles: {subtitlesEnabled ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* Notifications */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 6 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 6 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 6}
				>
					Desktop Notifications: {notifications ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* Discord Rich Presence */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 7 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 7 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 7}
				>
					Discord Rich Presence: {discordRpc ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* LLM Enabled */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 8 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 8 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 8}
				>
					AI Assistant: {llmEnabled ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* LLM API Key */}
			<Box paddingX={1}>
				{isEditingApiKey && selectedIndex === 9 ? (
					<TextInput
						value={llmApiKey}
						onChange={setLLMApiKey}
						onSubmit={value => {
							const trimmed = value.trim();
							setLLMApiKey(trimmed);
							config.setLLMApiKey(trimmed);
							setIsEditingApiKey(false);
						}}
						placeholder="Enter your Gemini API key"
						focus
					/>
				) : (
					<Text
						backgroundColor={
							selectedIndex === 9 ? theme.colors.primary : undefined
						}
						color={
							selectedIndex === 9 ? theme.colors.background : theme.colors.text
						}
						bold={selectedIndex === 9}
					>
						API Key:{' '}
						{llmApiKey
							? `${llmApiKey.slice(0, 4)}...${llmApiKey.slice(-4)}`
							: '(not set)'}
					</Text>
				)}
			</Box>

			{/* LLM Model */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 10 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 10 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 10}
				>
					Model: {llmModel}
				</Text>
			</Box>

			{/* LLM Temperature */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 11 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 11 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 11}
				>
					Temperature: {llmTemperature.toFixed(1)}
				</Text>
			</Box>

			{/* Downloads Enabled */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 12 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 12 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 12}
				>
					Download Feature: {downloadsEnabled ? 'ON' : 'OFF'}
				</Text>
			</Box>

			{/* Download Folder */}
			<Box paddingX={1}>
				{isEditingDownloadDirectory && selectedIndex === 13 ? (
					<TextInput
						value={downloadDirectory}
						onChange={setDownloadDirectory}
						onSubmit={value => {
							const normalized = value.trim();
							if (!normalized) {
								setIsEditingDownloadDirectory(false);
								return;
							}
							setDownloadDirectory(normalized);
							config.set('downloadDirectory', normalized);
							setIsEditingDownloadDirectory(false);
						}}
						placeholder="Download directory"
						focus
					/>
				) : (
					<Text
						backgroundColor={
							selectedIndex === 13 ? theme.colors.primary : undefined
						}
						color={
							selectedIndex === 13 ? theme.colors.background : theme.colors.text
						}
						bold={selectedIndex === 13}
					>
						Download Folder: {downloadDirectory}
					</Text>
				)}
			</Box>

			{/* Download Format */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 14 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 14 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 14}
				>
					Download Format: {downloadFormat.toUpperCase()}
				</Text>
			</Box>

			{/* Sleep Timer */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 15 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 15
							? theme.colors.background
							: isActive
								? theme.colors.accent
								: theme.colors.text
					}
					bold={selectedIndex === 15}
				>
					{sleepTimerLabel}
				</Text>
			</Box>

			{/* Import Playlists */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 16 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 16 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 16}
				>
					Import Playlists →
				</Text>
			</Box>

			{/* Export Playlists */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 17 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 17 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 17}
				>
					Export Playlists →
				</Text>
			</Box>

			{/* Custom Keybindings */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 18 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 18 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 18}
				>
					Custom Keybindings →
				</Text>
			</Box>

			{/* Manage Plugins */}
			<Box paddingX={1}>
				<Text
					backgroundColor={
						selectedIndex === 19 ? theme.colors.primary : undefined
					}
					color={
						selectedIndex === 19 ? theme.colors.background : theme.colors.text
					}
					bold={selectedIndex === 19}
				>
					Manage Plugins
				</Text>
			</Box>

			{/* Info */}
			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					Arrows to navigate, Enter to select, Esc/q to go back
				</Text>
			</Box>
		</Box>
	);
}
