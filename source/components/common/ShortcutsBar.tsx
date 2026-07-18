// Shortcuts bar component
import {useState} from 'react';
import {Box, Text} from 'ink';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {KEYBINDINGS, VIEW} from '../../utils/constants.ts';
import {ICONS} from '../../utils/icons.ts';
import {logger} from '../../services/logger/logger.service.ts';

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

	useKeyBinding(KEYBINDINGS.PLAY_PAUSE, handlePlayPause);
	useKeyBinding(KEYBINDINGS.NEXT, () => {
		flash('next');
		next();
	});
	useKeyBinding(KEYBINDINGS.PREVIOUS, () => {
		flash('prev');
		previous();
	});
	useKeyBinding(KEYBINDINGS.VOLUME_UP, () => {
		flash('volume');
		logger.debug('ShortcutsBar', 'VOLUME_UP handler called', {
			keys: KEYBINDINGS.VOLUME_UP,
			isPlaying: playerState.isPlaying,
			currentVolume: playerState.volume,
		});
		volumeUp();
	});
	useKeyBinding(KEYBINDINGS.VOLUME_DOWN, () => {
		flash('volume');
		logger.debug('ShortcutsBar', 'VOLUME_DOWN handler called', {
			keys: KEYBINDINGS.VOLUME_DOWN,
			isPlaying: playerState.isPlaying,
			currentVolume: playerState.volume,
		});
		volumeDown();
	});
	useKeyBinding(KEYBINDINGS.VOLUME_FINE_UP, () => {
		flash('volume');
		volumeFineUp();
	});
	useKeyBinding(KEYBINDINGS.VOLUME_FINE_DOWN, () => {
		flash('volume');
		volumeFineDown();
	});
	useKeyBinding(KEYBINDINGS.SHUFFLE, () => {
		flash('shuffle');
		toggleShuffle();
	});
	useKeyBinding(radioView ? [] : KEYBINDINGS.REPEAT, () => {
		flash('repeat');
		toggleRepeat();
	});
	useKeyBinding(KEYBINDINGS.AUTOPLAY_TOGGLE, () => {
		flash('autoplay');
		toggleAutoplay();
	});
	useKeyBinding(radioView ? [] : KEYBINDINGS.TOGGLE_RADIO, () => {
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

	const shuffleColor = flashState['shuffle']
		? theme.colors.success
		: playerState.shuffle
			? theme.colors.primary
			: theme.colors.dim;

	const repeatColor = flashState['repeat']
		? theme.colors.success
		: playerState.repeat !== 'off'
			? theme.colors.secondary
			: theme.colors.dim;

	const volumeColor = flashState['volume']
		? theme.colors.success
		: theme.colors.primary;

	const autoplayColor = flashState['autoplay']
		? theme.colors.success
		: playerState.autoplay
			? theme.colors.primary
			: theme.colors.dim;

	const radioColor = flashState['radio']
		? theme.colors.success
		: playerState.radioIsActive
			? theme.colors.primary
			: theme.colors.dim;

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
				<Text color={shuffleColor}>{ICONS.SHUFFLE} [Sft+S]</Text> •{' '}
				<Text color={repeatColor}>
					{playerState.repeat === 'one' ? ICONS.REPEAT_ONE : ICONS.REPEAT_ALL}{' '}
					[R]
				</Text>{' '}
				• <Text color={autoplayColor}>{ICONS.AUTOPLAY} [Sft+A]</Text> •{' '}
				<Text color={shortcutColor('radio')}>📡 [Shift+X]</Text> •{' '}
				<Text color={theme.colors.text}>Releases [Sft+N]</Text> •{' '}
				<Text color={theme.colors.text}>Genres [Sft+M]</Text> •{' '}
				<Text color={theme.colors.text}>{ICONS.SEARCH} [/]</Text> •{' '}
				<Text color={theme.colors.text}>{ICONS.HELP} [?]</Text>
			</Text>

			{/* Right: Playback mode + volume indicator */}
			<Text color={theme.colors.text}>
				<Text color={shuffleColor}>{ICONS.SHUFFLE}</Text>{' '}
				<Text color={repeatColor}>
					{playerState.repeat === 'one' ? ICONS.REPEAT_ONE : ICONS.REPEAT_ALL}
				</Text>{' '}
				<Text color={autoplayColor}>{ICONS.AUTOPLAY}</Text>{' '}
				{playerState.radioIsActive && <Text color={radioColor}>📡</Text>}{' '}
				<Text color={theme.colors.dim}>{ICONS.VOLUME} [+/-]</Text>{' '}
				<Text color={volumeColor}>{playerState.volume}%</Text>
			</Text>
		</Box>
	);
}
