import {Box, Text} from 'ink';
import {useState, useEffect, useCallback, useMemo} from 'react';
import {useTheme} from '../../hooks/useTheme.ts';
import {useNavigation} from '../../hooks/useNavigation.ts';
import {usePlayer} from '../../hooks/usePlayer.ts';
import {useKeyBinding} from '../../hooks/useKeyboard.ts';
import {resolveKeybinding} from '../../utils/keybinding-resolver.ts';
import {getMusicService} from '../../services/youtube-music/api.ts';
import type {Genre, Release} from '../../types/youtube-music.types.ts';

interface GenreSection {
	title: string;
	genres: Genre[];
}

export default function GenresLayout() {
	const {theme} = useTheme();
	const {dispatch} = useNavigation();
	const {dispatch: playerDispatch} = usePlayer();
	const [sections, setSections] = useState<GenreSection[]>([]);
	const [sectionIndex, setSectionIndex] = useState(0);
	const [genreIndex, setGenreIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Detail view state
	const [viewMode, setViewMode] = useState<'genres' | 'playlists'>('genres');
	const [playlists, setPlaylists] = useState<Release[]>([]);
	const [playlistIndex, setPlaylistIndex] = useState(0);
	const [activeGenreTitle, setActiveGenreTitle] = useState('');

	useEffect(() => {
		let cancelled = false;
		getMusicService()
			.getGenres()
			.then(results => {
				if (!cancelled) {
					setSections(results);
					setIsLoading(false);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : 'Failed to load genres',
					);
					setIsLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const loadPlaylistsForGenre = async (genre: Genre) => {
		setIsLoading(true);
		setError(null);
		try {
			const results = await getMusicService().getGenrePlaylists(
				genre.browseId,
				genre.params,
			);
			setPlaylists(results);
			setPlaylistIndex(0);
			setActiveGenreTitle(genre.title);
			setViewMode('playlists');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Failed to load playlists');
		} finally {
			setIsLoading(false);
		}
	};

	const currentSection = sections[sectionIndex];
	const genres = useMemo(() => currentSection?.genres ?? [], [currentSection]);

	const openSelectedGenre = useCallback(() => {
		const genre = genres[genreIndex];
		if (genre) void loadPlaylistsForGenre(genre);
	}, [genres, genreIndex]);

	const playSelectedPlaylist = useCallback(() => {
		const release = playlists[playlistIndex];
		if (release?.browseId) {
			setIsLoading(true);
			getMusicService()
				.getReleaseTracks(release.browseId)
				.then(tracks => {
					setIsLoading(false);
					if (tracks.length > 0) {
						playerDispatch({category: 'CLEAR_QUEUE'});
						playerDispatch({category: 'SET_QUEUE', queue: tracks});
						playerDispatch({category: 'PLAY', track: tracks[0]!});
					} else {
						setError('No tracks found in playlist');
					}
				})
				.catch((err: unknown) => {
					setIsLoading(false);
					setError(
						err instanceof Error
							? err.message
							: 'Failed to load playlist tracks',
					);
				});
		}
	}, [playlists, playlistIndex, playerDispatch]);

	const goBack = useCallback(() => {
		if (viewMode === 'playlists') {
			setViewMode('genres');
			setPlaylists([]);
			return;
		}
		dispatch({category: 'GO_BACK'});
	}, [viewMode, dispatch]);

	const inGenres = viewMode === 'genres';
	useKeyBinding(['left'], () => {
		if (!inGenres) return;
		setSectionIndex(i => Math.max(0, i - 1));
		setGenreIndex(0);
	});
	useKeyBinding(['right'], () => {
		if (!inGenres) return;
		setSectionIndex(i => Math.min(sections.length - 1, i + 1));
		setGenreIndex(0);
	});
	useKeyBinding(resolveKeybinding('UP'), () => {
		if (inGenres) {
			setGenreIndex(i => Math.max(0, i - 1));
		} else {
			setPlaylistIndex(i => Math.max(0, i - 1));
		}
	});
	useKeyBinding(resolveKeybinding('DOWN'), () => {
		if (inGenres) {
			setGenreIndex(i => Math.min(genres.length - 1, i + 1));
		} else {
			setPlaylistIndex(i => Math.min(playlists.length - 1, i + 1));
		}
	});
	useKeyBinding(resolveKeybinding('SELECT'), () => {
		if (inGenres) {
			openSelectedGenre();
		} else {
			playSelectedPlaylist();
		}
	});
	useKeyBinding(resolveKeybinding('BACK'), goBack);

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text color={theme.colors.primary} bold>
					{viewMode === 'genres'
						? '🎭 Moods & Genres'
						: `🎭 ${activeGenreTitle} Playlists`}
				</Text>
			</Box>

			{isLoading ? (
				<Text color={theme.colors.dim}>Loading...</Text>
			) : error ? (
				<Text color={theme.colors.error}>{error}</Text>
			) : viewMode === 'genres' && sections.length === 0 ? (
				<Text color={theme.colors.dim}>No genres found</Text>
			) : viewMode === 'playlists' && playlists.length === 0 ? (
				<Text color={theme.colors.dim}>No playlists found for this genre</Text>
			) : viewMode === 'genres' ? (
				<>
					{/* Section tabs */}
					<Box marginBottom={1} gap={2}>
						{sections.map((section, index) => (
							<Text
								key={section.title + String(index)}
								color={
									index === sectionIndex
										? theme.colors.primary
										: theme.colors.dim
								}
								bold={index === sectionIndex}
								underline={index === sectionIndex}
							>
								{section.title}
							</Text>
						))}
					</Box>

					{/* Genre list */}
					{genres.map((genre, index) => {
						const isSelected = index === genreIndex;
						return (
							<Box key={genre.browseId + String(index)}>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.dim}
								>
									{isSelected ? '▶ ' : `${String(index + 1).padStart(2)}. `}
								</Text>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.text}
									bold={isSelected}
								>
									{genre.title}
								</Text>
							</Box>
						);
					})}
				</>
			) : (
				<>
					{/* Playlists list */}
					{playlists.map((release, index) => {
						const isSelected = index === playlistIndex;
						return (
							<Box key={release.browseId + String(index)}>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.dim}
								>
									{isSelected ? '▶ ' : `${String(index + 1).padStart(2)}. `}
								</Text>
								<Text
									color={isSelected ? theme.colors.primary : theme.colors.text}
									bold={isSelected}
								>
									{release.title}
								</Text>
								<Text color={theme.colors.dim}> — {release.artist}</Text>
							</Box>
						);
					})}
				</>
			)}

			<Box marginTop={1}>
				<Text color={theme.colors.dim}>
					{viewMode === 'genres'
						? '←/→ Sections | ↑/↓ Genres | Enter Open | Esc Back'
						: '↑/↓ Playlists | Enter Play | Esc Back'}
				</Text>
			</Box>
		</Box>
	);
}
