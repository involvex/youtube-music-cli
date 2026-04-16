// Player controls component
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {KEYBINDINGS} from '../../utils/constants.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useTheme} from '../../hooks/useTheme.ts';
import {useFavorites} from '../../stores/favorites.store.tsx';
import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';
import {logger} from '../../services/logger/logger.service.ts';
import {ICONS} from '../../utils/icons.ts';
import type {EqualizerPreset} from '../../types/config.types.ts';
import {formatTime} from '../../utils/format.ts';

let mountCount = 0;

const CROSSFADE_PRESETS = [0, 1, 2, 3, 5];
const EQUALIZER_PRESETS: EqualizerPreset[] = [
	'flat',
	'bass_boost',
	'vocal',
	'bright',
	'warm',
];

const formatEqualizerLabel = (preset: EqualizerPreset) =>
	preset
		.split('_')
		.map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
		.join(' ');

export default function PlayerControls() {
	const instanceId = ++mountCount;

	useEffect(() => {
		logger.debug('PlayerControls', 'Component mounted', {instanceId});
		return () => {
			logger.debug('PlayerControls', 'Component unmounted', {instanceId});
		};
	}, [instanceId]);

	const {theme} = useTheme();
	const {
		state: playerState,
		pause,
		resume,
		next,
		previous,
		volumeUp,
		volumeDown,
		speedUp,
		speedDown,
		toggleShuffle,
		setABLoop,
	} = usePlayer();
	const {toggleFavorite} = useFavorites();
	const config = getConfigService();
	const [gaplessPlayback, setGaplessPlayback] = useState(
		config.get('gaplessPlayback') ?? true,
	);
	const [crossfadeDuration, setCrossfadeDuration] = useState(
		config.get('crossfadeDuration') ?? 0,
	);
	const [equalizerPreset, setEqualizerPreset] = useState<EqualizerPreset>(
		config.get('equalizerPreset') ?? 'flat',
	);

	const handlePlayPause = () => {
		if (playerState.isPlaying) {
			pause();
		} else {
			resume();
		}
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

	const cycleEqualizerPreset = () => {
		const currentIndex = EQUALIZER_PRESETS.indexOf(equalizerPreset);
		const next =
			EQUALIZER_PRESETS[(currentIndex + 1) % EQUALIZER_PRESETS.length]!;
		setEqualizerPreset(next);
		config.set('equalizerPreset', next);
	};

	const handleABLoopA = () => {
		setABLoop(playerState.progress, playerState.abLoop.b);
	};

	const handleABLoopB = () => {
		setABLoop(playerState.abLoop.a, playerState.progress);
	};

	const handleABLoopClear = () => {
		setABLoop(null, null);
	};

	// Keyboard bindings
	useKeyBinding(KEYBINDINGS.PLAY_PAUSE, handlePlayPause);
	useKeyBinding(KEYBINDINGS.NEXT, next);
	useKeyBinding(KEYBINDINGS.PREVIOUS, previous);
	useKeyBinding(['up'], volumeUp);
	useKeyBinding(['down'], volumeDown);
	useKeyBinding(['left'], previous);
	useKeyBinding(['right'], next);
	useKeyBinding(KEYBINDINGS.SPEED_UP, speedUp);
	useKeyBinding(KEYBINDINGS.SPEED_DOWN, speedDown);
	useKeyBinding(KEYBINDINGS.SHUFFLE, toggleShuffle);
	useKeyBinding(KEYBINDINGS.GAPLESS_TOGGLE, toggleGaplessPlayback);
	useKeyBinding(KEYBINDINGS.CROSSFADE_CYCLE, cycleCrossfadeDuration);
	useKeyBinding(KEYBINDINGS.EQUALIZER_CYCLE, cycleEqualizerPreset);
	useKeyBinding(KEYBINDINGS.AB_LOOP_A, handleABLoopA);
	useKeyBinding(KEYBINDINGS.AB_LOOP_B, handleABLoopB);
	useKeyBinding(KEYBINDINGS.AB_LOOP_CLEAR, handleABLoopClear);
	useKeyBinding(KEYBINDINGS.TOGGLE_FAVORITE, () => {
		if (playerState.currentTrack) {
			toggleFavorite(playerState.currentTrack);
		}
	});
	useKeyBinding(KEYBINDINGS.TOGGLE_SUBTITLES, () => {
		const current = config.get('subtitlesEnabled') ?? false;
		config.set('subtitlesEnabled', !current);
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box
				flexDirection="row"
				justifyContent="space-between"
				paddingX={2}
				borderStyle="classic"
				borderColor={theme.colors.dim}
			>
				{/* Previous */}
				<Text color={theme.colors.text}>
					[<Text color={theme.colors.dim}>← / b</Text>] Prev
				</Text>

				{/* Play/Pause */}
				<Text color={theme.colors.primary}>
					{playerState.isPlaying ? (
						<Text>
							[<Text color={theme.colors.dim}>Space</Text>] Pause
						</Text>
					) : (
						<Text>
							[<Text color={theme.colors.dim}>Space</Text>] Play
						</Text>
					)}
				</Text>

				{/* Next */}
				<Text color={theme.colors.text}>
					[<Text color={theme.colors.dim}>→ / n</Text>] Next
				</Text>

				{/* Volume */}
				<Text color={theme.colors.text}>
					[<Text color={theme.colors.dim}>+/-</Text>] Vol: {playerState.volume}%
				</Text>

				{/* Shuffle indicator */}
				<Text
					color={playerState.shuffle ? theme.colors.primary : theme.colors.dim}
				>
					[<Text color={theme.colors.dim}>Shift+S</Text>]{' '}
					{playerState.shuffle ? `${ICONS.SHUFFLE} ON` : `${ICONS.SHUFFLE} OFF`}
				</Text>

				{/* Speed indicator (only shown when not 1.0x) */}
				{(playerState.speed ?? 1.0) !== 1.0 && (
					<Text color={theme.colors.accent}>
						[<Text color={theme.colors.dim}>&lt;&gt;</Text>]{' '}
						{(playerState.speed ?? 1.0).toFixed(2)}x
					</Text>
				)}

				{/* A/B Loop indicator */}
				{(playerState.abLoop.a !== null || playerState.abLoop.b !== null) && (
					<Text color={theme.colors.accent}>
						[<Text color={theme.colors.dim}>| {'{}'}</Text>] A-B:{' '}
						{playerState.abLoop.a !== null
							? formatTime(playerState.abLoop.a)
							: '-'}{' '}
						-{' '}
						{playerState.abLoop.b !== null
							? formatTime(playerState.abLoop.b)
							: '-'}
					</Text>
				)}
			</Box>

			<Box
				flexDirection="row"
				justifyContent="space-between"
				paddingX={2}
				gap={2}
			>
				<Text color={gaplessPlayback ? theme.colors.primary : theme.colors.dim}>
					Gapless: {gaplessPlayback ? 'ON' : 'OFF'}
				</Text>
				<Text color={theme.colors.text}>
					Crossfade: {crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}
				</Text>
				<Text color={theme.colors.text}>
					Equalizer: {formatEqualizerLabel(equalizerPreset)}
				</Text>
			</Box>
		</Box>
	);
}
