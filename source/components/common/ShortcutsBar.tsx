// Shortcuts bar component
import {useState} from 'react';
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {ICONS} from '../../utils/icons.ts';
import {logger} from '../../services/logger/logger.service.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import PlaybackModeIcon from './PlaybackModeIcon.tsx';

const FLASH_DURATION_MS = 300;

export default function ShortcutsBar() {
	const {theme} = useTheme();
	const {state: navState} = useNavigation();
	const radioView = navState.currentView === VIEW.RADIO;
	const {
		state: playerState,
		pause,
		resume,
		next,
		previous,
		volumeUp,
		volumeDown,
		volumeFineUp,
		volumeFineDown,
		toggleShuffle,
		toggleRepeat,
		toggleAutoplay,
		startRadio,
		stopRadio,
	} = usePlayer();

	const [flashState, setFlashState] = useState<Record<string, boolean>>({});

	const flash = (key: string) => {
		setFlashState(prev => ({...prev, [key]: true}));
		setTimeout(() => {
			setFlashState(prev => ({...prev, [key]: false}));
		}, FLASH_DURATION_MS);
	};

	const shortcutColor = (key: string) =>
		flashState[key] ? theme.colors.success : theme.colors.text;

	// Register key bindings globally
	const handlePlayPause = () => {
		flash('playPause');
		if (playerState.isPlaying) {
			pause();
		} else {
			resume();
		}
	};

	useKeyBinding(resolveKeybinding('PLAY_PAUSE'), handlePlayPause);
	useKeyBinding(resolveKeybinding('NEXT'), () => {
		flash('next');
		next();
	});
	useKeyBinding(resolveKeybinding('PREVIOUS'), () => {
		flash('prev');
		previous();
	});
	useKeyBinding(resolveKeybinding('VOLUME_UP'), () => {
		flash('volume');
		logger.debug('ShortcutsBar', 'VOLUME_UP handler called', {
			keys: KEYBINDINGS.VOLUME_UP,
			isPlaying: playerState.isPlaying,
			currentVolume: playerState.volume,
		});
		volumeUp();
	});
	useKeyBinding(resolveKeybinding('VOLUME_DOWN'), () => {
		flash('volume');
		logger.debug('ShortcutsBar', 'VOLUME_DOWN handler called', {
			keys: KEYBINDINGS.VOLUME_DOWN,
			isPlaying: playerState.isPlaying,
			currentVolume: playerState.volume,
		});
		volumeDown();
	});
	useKeyBinding(resolveKeybinding('VOLUME_FINE_UP'), () => {
		flash('volume');
		volumeFineUp();
	});
	useKeyBinding(resolveKeybinding('VOLUME_FINE_DOWN'), () => {
		flash('volume');
		volumeFineDown();
	});
	useKeyBinding(resolveKeybinding('SHUFFLE'), () => {
		flash('shuffle');
		toggleShuffle();
	});
	useKeyBinding(radioView ? [] : resolveKeybinding('REPEAT'), () => {
		flash('repeat');
		toggleRepeat();
	});
	useKeyBinding(resolveKeybinding('AUTOPLAY_TOGGLE'), () => {
		flash('autoplay');
		toggleAutoplay();
	});
	useKeyBinding(radioView ? [] : resolveKeybinding('TOGGLE_RADIO'), () => {
		flash('radio');
		if (playerState.radioIsActive) {
			stopRadio();
		} else if (playerState.currentTrack) {
			void startRadio({
				type: 'track',
				id: playerState.currentTrack.videoId,
				name: playerState.currentTrack.title,
			});
		}
	});
	// Note: SETTINGS keybinding handled by MainLayout to avoid double-dispatch

	const volumeColor = flashState['volume']
		? theme.colors.success
		: theme.colors.primary;

	const radioColor = flashState['radio']
		? theme.colors.success
		: playerState.radioIsActive
			? theme.colors.accent
			: theme.colors.dim;

	const repeatIcon =
		playerState.repeat === 'one' ? ICONS.REPEAT_ONE : ICONS.REPEAT_ALL;

	const llmEnabled = getConfigService().getLLMEnabled();

	return (
		<Box
			borderStyle="single"
			borderColor={theme.colors.dim}
			paddingX={1}
			justifyContent="space-between"
		>
			{/* Left: Navigation shortcuts */}
			<Text color={theme.colors.dim}>
				<Text color={shortcutColor('playPause')}>
					{playerState.isPlaying ? ICONS.PAUSE : ICONS.PLAY_PAUSE_ON} [Space]
				</Text>{' '}
				• <Text color={shortcutColor('prev')}>{ICONS.PREV} [B]</Text> •{' '}
				<Text color={shortcutColor('next')}>{ICONS.NEXT} [N]</Text> •{' '}
				<PlaybackModeIcon
					icon={ICONS.SHUFFLE}
					active={playerState.shuffle}
					flash={Boolean(flashState['shuffle'])}
					label="[Sft+S]"
				/>{' '}
				•{' '}
				<PlaybackModeIcon
					icon={repeatIcon}
					active={playerState.repeat !== 'off'}
					flash={Boolean(flashState['repeat'])}
					label="[R]"
				/>{' '}
				•{' '}
				<PlaybackModeIcon
					icon={ICONS.AUTOPLAY}
					active={playerState.autoplay}
					flash={Boolean(flashState['autoplay'])}
					label="[Sft+A]"
				/>{' '}
				•{' '}
				<Text
					color={radioColor}
					bold={playerState.radioIsActive || Boolean(flashState['radio'])}
					dimColor={!playerState.radioIsActive && !flashState['radio']}
				>
					📡{playerState.radioIsActive ? '•' : ''} [Shift+X]
				</Text>{' '}
				• <Text color={theme.colors.text}>Releases [Sft+N]</Text> •{' '}
				<Text color={theme.colors.text}>Genres [Sft+M]</Text> •{' '}
				<Text color={theme.colors.text}>{ICONS.SEARCH} [/]</Text> •{' '}
				<Text color={theme.colors.text}>{ICONS.HELP} [?]</Text>
				{llmEnabled && (
					<>
						{' '}
						• <Text color={theme.colors.text}>AI Chat [A]</Text> •{' '}
						<Text color={theme.colors.text}>AI Recs [Ctrl+Shift+A]</Text>
					</>
				)}
			</Text>

			{/* Right: Active playback modes + volume */}
			<Text color={theme.colors.text}>
				{playerState.shuffle && (
					<>
						<PlaybackModeIcon icon={ICONS.SHUFFLE} active />{' '}
					</>
				)}
				{playerState.repeat !== 'off' && (
					<>
						<PlaybackModeIcon icon={repeatIcon} active />{' '}
					</>
				)}
				{playerState.autoplay && (
					<>
						<PlaybackModeIcon icon={ICONS.AUTOPLAY} active />{' '}
					</>
				)}
				{playerState.radioIsActive && (
					<Text color={theme.colors.accent} bold>
						📡•{' '}
					</Text>
				)}
				<Text color={theme.colors.dim}>{ICONS.VOLUME} [+/-]</Text>{' '}
				<Text color={volumeColor}>{playerState.volume}%</Text>
			</Text>
		</Box>
	);
}
