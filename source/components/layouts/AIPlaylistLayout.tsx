// AI Playlist Layout Component
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {useState, useCallback} from 'react';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {useKeyboardBlocker} from '../../hooks/useKeyboardBlocker.tsx';
import {useTheme} from '../../hooks/useTheme.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {VIEW} from '../../utils/constants.ts';
import {
	useAIPlaylist,
	type AIPlaylistResult,
} from '../../hooks/use-ai-playlist.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {getConfigService} from '../../services/config/config.service.ts';
import {logger} from '../../services/logger/logger.service.ts';
import type {NavigationAction} from '../../types/navigation.types.ts';

type Phase = 'input' | 'generating' | 'results';

export default function AIPlaylistLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {play, setQueue} = usePlayer();
	const configService = getConfigService();
	const {generatePlaylist, savePlaylist, loadPlaylists} = useAIPlaylist();

	const [phase, setPhase] = useState<Phase>('input');
	const [input, setInput] = useState('');
	const [generatedPlaylist, setGeneratedPlaylist] =
		useState<AIPlaylistResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [savedPlaylists, setSavedPlaylists] = useState<
		Array<{id: string; name: string; trackCount: number}>
	>(() => {
		const playlists = loadPlaylists();
		return playlists.map(p => ({
			id: p.id,
			name: p.name,
			trackCount: p.tracks.length,
		}));
	});
	const [selectedIndex, setSelectedIndex] = useState(0);

	const llmEnabled = configService.getLLMEnabled();
	function refreshSavedPlaylists() {
		const playlists = loadPlaylists();
		setSavedPlaylists(
			playlists.map(p => ({
				id: p.id,
				name: p.name,
				trackCount: p.tracks.length,
			})),
		);
	}

	useKeyboardBlocker(phase === 'input');

	async function handleGenerate() {
		if (!input.trim()) return;
		if (!llmEnabled) {
			setError(
				'AI not configured. Please set up your API key in Settings (press ",")',
			);
			return;
		}

		setPhase('generating');
		setError(null);

		try {
			const result = await generatePlaylist(input.trim(), 20);
			if (result.tracks.length === 0) {
				setError('No tracks generated. Try a different prompt.');
				setPhase('input');
			} else {
				setGeneratedPlaylist(result);
				setPhase('results');
				setSelectedIndex(0);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const debugConfig = configService.getLLMConfig();
			const detail = {
				provider: debugConfig?.provider ?? '(auto)',
				model: debugConfig?.model ?? '(default)',
				endpoint: debugConfig?.endpoint || debugConfig?.baseUrl || '(default)',
				error: message,
			};
			logger.debug('AIPlaylist', 'Playlist generation failed', detail);
			if (logger.isVerbose()) {
				console.error('Error generating playlist:', err);
				console.log(
					'Configured Provider:',
					detail.provider,
					', Model:',
					detail.model,
					', Endpoint:',
					detail.endpoint,
				);
			}
			setError(`Failed to generate playlist: ${message}`);
			setPhase('input');
		}
	}

	function handlePlay() {
		if (generatedPlaylist) {
			const tracks = generatedPlaylist.tracks
				.map(t => ({
					videoId: t.videoId.startsWith('search:') ? '' : t.videoId,
					title: t.title,
					artists: t.artists.map(a => ({name: a, artistId: ''})),
					duration: t.duration,
				}))
				.filter(t => t.videoId);

			if (tracks.length > 0) {
				setQueue(
					tracks as unknown as import('../../types/youtube-music.types.ts').Track[],
				);
				const firstTrack = tracks[0];
				if (firstTrack) {
					play(firstTrack);
				}
			} else {
				setError(
					'No playable tracks found. The searches returned no matches — try a different prompt.',
				);
			}
		}
	}

	function handleSave() {
		if (generatedPlaylist) {
			savePlaylist(generatedPlaylist.playlist);
			refreshSavedPlaylists();
			setError(null);
			// Show saved confirmation briefly
			setGeneratedPlaylist(prev =>
				prev
					? {
							...prev,
							playlist: {...prev.playlist, name: prev.playlist.name + ' ✓'},
						}
					: null,
			);
			setTimeout(() => {
				if (generatedPlaylist) {
					setGeneratedPlaylist(prev =>
						prev
							? {
									...prev,
									playlist: {
										...prev.playlist,
										name: generatedPlaylist.playlist.name,
									},
								}
							: null,
					);
				}
			}, 1500);
		}
	}

	function handleRerun() {
		setPhase('input');
		setGeneratedPlaylist(null);
		setSelectedIndex(0);
	}

	function handleModify() {
		// For now, just rerun with same prompt - future enhancement could open chat
		handleRerun();
	}

	const navigateHome = useCallback(() => {
		const action: NavigationAction = {category: 'NAVIGATE', view: VIEW.HOME};
		dispatch(action);
	}, [dispatch]);

	useKeyBinding(resolveKeybinding('BACK'), navigateHome);

	useKeyBinding(resolveKeybinding('SELECT'), () => {
		if (phase === 'input') handleGenerate();
		else if (phase === 'results') handlePlay();
	});

	useKeyBinding(['s'], handleSave);
	useKeyBinding(['r'], handleRerun);
	useKeyBinding(['a'], handleModify);

	const shortcuts =
		phase === 'input'
			? [
					{key: 'Enter', desc: 'Generate'},
					{key: 'Esc', desc: 'Back'},
				]
			: phase === 'generating'
				? [{key: 'Esc', desc: 'Back (after generation)'}]
				: [
						{key: 'Enter', desc: 'Play'},
						{key: 's', desc: 'Save'},
						{key: 'r', desc: 'Rerun'},
						{key: 'a', desc: 'Modify'},
						{key: 'Esc', desc: 'Back'},
					];

	const {colors} = theme;

	return (
		<Box flexDirection="column" height="100%">
			<Box
				paddingX={2}
				paddingY={1}
				borderStyle="single"
				borderColor={colors.accent}
			>
				<Text color={colors.accent} bold>
					🤖 AI Playlist Generator
				</Text>
			</Box>

			{error && (
				<Box paddingX={2} marginY={1}>
					<Text color={colors.error}>⚠ {error}</Text>
				</Box>
			)}

			{phase === 'input' && (
				<Box flexDirection="column" paddingX={2} paddingY={1}>
					<Text color={colors.dim}>
						Enter a song title, track URL, or topic description:
					</Text>
					<Box marginTop={1}>
						<TextInput
							value={input}
							onChange={setInput}
							placeholder="e.g., 'Bohemian Rhapsody', 'relaxing evening jazz', or a YouTube Music URL"
							onSubmit={handleGenerate}
						/>
					</Box>

					{savedPlaylists.length > 0 && (
						<Box marginTop={2} flexDirection="column">
							<Text color={colors.accent} bold>
								📋 Saved AI Playlists:
							</Text>
							{savedPlaylists.map((p, i) => (
								<Box key={p.id} flexDirection="row" marginTop={1}>
									<Text
										color={i === selectedIndex ? colors.accent : colors.text}
									>
										{i === selectedIndex ? '▸ ' : '  '}
										{p.name}
									</Text>
									<Text color={colors.dim}> ({p.trackCount} tracks)</Text>
								</Box>
							))}
						</Box>
					)}

					<Box marginTop={2} flexDirection="row" flexWrap="wrap">
						{shortcuts.map((s, i) => (
							<Box key={i} marginRight={3} marginBottom={1}>
								<Text color={colors.accent}>{s.key}</Text>
								<Text color={colors.dim}> {s.desc}</Text>
							</Box>
						))}
					</Box>
				</Box>
			)}

			{phase === 'generating' && (
				<Box flexDirection="column" paddingX={2} paddingY={1}>
					<Box marginTop={2} flexDirection="column" alignItems="center">
						<Text color={colors.accent} bold>
							🎵 Generating playlist...
						</Text>
						<Box marginTop={1}>
							<Text color={colors.dim}>" {input} "</Text>
						</Box>
						<Box marginTop={2}>
							<Text color={colors.dim}>This may take a few seconds...</Text>
						</Box>
					</Box>
				</Box>
			)}

			{phase === 'results' && generatedPlaylist && (
				<Box flexDirection="column" paddingX={2} paddingY={1}>
					<Box flexDirection="row" marginBottom={1}>
						<Text color={colors.accent} bold>
							{generatedPlaylist.playlist.name}
						</Text>
						<Box marginLeft={2}>
							<Text color={colors.dim}>
								({generatedPlaylist.tracks.length} tracks)
							</Text>
						</Box>
					</Box>

					<Box flexDirection="column">
						{generatedPlaylist.tracks.slice(0, 20).map((track, i) => (
							<Box
								key={track.videoId}
								flexDirection="row"
								marginBottom={1}
								backgroundColor={
									i === selectedIndex ? colors.secondary : undefined
								}
							>
								<Box width={3}>
									<Text color={colors.dim}>{i + 1}.</Text>
								</Box>
								<Text color={i === selectedIndex ? colors.accent : colors.text}>
									{track.title}
								</Text>
								<Text color={colors.dim}>
									{'  '}
									{track.artists.join(', ')}
								</Text>
							</Box>
						))}
						{generatedPlaylist.tracks.length > 20 && (
							<Box marginTop={1}>
								<Text color={colors.dim}>
									... and {generatedPlaylist.tracks.length - 20} more tracks
								</Text>
							</Box>
						)}
					</Box>

					<Box marginTop={1} flexDirection="row" flexWrap="wrap">
						{shortcuts.map((s, i) => (
							<Box key={i} marginRight={3} marginBottom={1}>
								<Text color={colors.accent}>{s.key}</Text>
								<Text color={colors.dim}> {s.desc}</Text>
							</Box>
						))}
					</Box>
				</Box>
			)}
		</Box>
	);
}
