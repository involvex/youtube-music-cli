import process from 'node:process';
import type {Flags} from '../types/cli.types.ts';
import type {
	Playlist,
	SearchResult,
	Track,
} from '../types/youtube-music.types.ts';
import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {getPlayerService} from '../services/player/player.service.ts';
import {getDownloadService} from '../services/download/download.service.ts';
import {getFavoritesManager} from '../services/favorites/favorites.service.ts';
import {ensurePlaybackDependencies} from '../services/player/dependency-check.service.ts';
import {loadPlayerState} from '../services/player-state/player-state.service.ts';
import {
	BACKGROUND_PLAYBACK_TTL_MS,
	PLAYBACK_STALL_MS,
	shouldApplyMpvPauseSync,
	shouldDebounceAdvance,
} from '../services/player/mpv-event-policy.ts';
import {ImmersiveEngine} from './immersive-engine.ts';
import {
	createMixFromResult,
	loadPlaylists,
	playSearchResult,
} from './actions/playback-actions.ts';
import {
	advanceQueue,
	createInitialImmersiveState,
	cycleRepeat,
	formatRepeatLabel,
	previousQueue,
	setQueue,
	toggleShuffle,
	trackArtists,
	trackYouTubeUrl,
	type ImmersivePlayerState,
} from './state/queue-state.ts';
import {
	buildImmersiveSettingsRows,
	createSleepTimerState,
	cycleImmersiveSetting,
	getSettingsTextDraft,
	saveSettingsTextField,
	type SettingsTextField,
} from './settings/settings-items.ts';
import {updateTrayIcon} from './native/tray.ts';
import {showTrackChangeToast} from './native/notifications.ts';
import {
	registerGlobalHotkeys,
	unregisterGlobalHotkeys,
} from './native/hotkeys.ts';

export interface ImmersiveAppOptions {
	flags?: Flags;
	discoMode?: boolean;
}

let immersiveDownloadInProgress = false;
const sleepTimerState = createSleepTimerState();

function getPlaybackOptions(volume: number) {
	const config = getConfigService();
	return {
		volume,
		audioNormalization: config.get('audioNormalization'),
		volumeFadeDuration: config.get('volumeFadeDuration'),
		gaplessPlayback: config.get('gaplessPlayback'),
		crossfadeDuration: config.get('crossfadeDuration'),
		equalizerPreset: config.get('equalizerPreset'),
	};
}

export async function resolveInitialTrack(flags?: Flags): Promise<{
	tracks: Track[];
	queueIndex: number;
	startPlaying: boolean;
	savedProgress: number;
	savedVolume?: number;
}> {
	const musicService = getMusicService();

	if (flags?.playTrack) {
		const track = await musicService.getTrack(flags.playTrack);
		if (!track) {
			throw new Error(`Track not found: ${flags.playTrack}`);
		}
		return {
			tracks: [track],
			queueIndex: 0,
			startPlaying: true,
			savedProgress: 0,
		};
	}

	if (flags?.searchQuery) {
		const response = await musicService.search(flags.searchQuery, {
			type: 'songs',
			limit: 10,
		});
		const tracks = response.results
			.filter(result => result.type === 'song')
			.map(result => result.data as Track);
		if (tracks.length === 0) {
			throw new Error(`No playable tracks found for: "${flags.searchQuery}"`);
		}
		return {tracks, queueIndex: 0, startPlaying: true, savedProgress: 0};
	}

	if (flags?.playPlaylist) {
		const playlist = await musicService.getPlaylist(flags.playPlaylist);
		if (playlist.tracks.length === 0) {
			throw new Error(
				`No playable tracks found in playlist: ${flags.playPlaylist}`,
			);
		}
		return {
			tracks: playlist.tracks,
			queueIndex: 0,
			startPlaying: true,
			savedProgress: 0,
		};
	}

	const persisted = await loadPlayerState();
	if (persisted?.currentTrack) {
		const tracks =
			persisted.queue.length > 0 ? persisted.queue : [persisted.currentTrack];
		return {
			tracks,
			queueIndex: Math.min(
				persisted.queuePosition,
				Math.max(0, tracks.length - 1),
			),
			startPlaying: true,
			savedProgress: persisted.progress,
			savedVolume: persisted.volume,
		};
	}

	return {tracks: [], queueIndex: 0, startPlaying: false, savedProgress: 0};
}

async function tryReattachBackgroundPlayback(
	state: ImmersivePlayerState,
	playerService: ReturnType<typeof getPlayerService>,
	config: ReturnType<typeof getConfigService>,
	waitForTimePos: (timeoutMs: number) => Promise<boolean>,
): Promise<boolean> {
	const bgState = config.getBackgroundPlaybackState();
	if (!bgState.enabled || !bgState.ipcPath) {
		return false;
	}

	const ageMs = Date.now() - Date.parse(bgState.timestamp);
	if (Number.isNaN(ageMs) || ageMs > BACKGROUND_PLAYBACK_TTL_MS) {
		config.clearBackgroundPlaybackState();
		return false;
	}

	const videoId = bgState.currentUrl.match(/[?&]v=([^&]+)/)?.[1];

	try {
		await playerService.reattach(bgState.ipcPath, {
			trackId: videoId,
			currentUrl: bgState.currentUrl,
		});
		const healthy = await waitForTimePos(2000);
		if (!healthy) {
			playerService.stop();
			config.clearBackgroundPlaybackState();
			return false;
		}

		config.clearBackgroundPlaybackState();
		state.isPlaying = true;
		playerService.resume();
		return true;
	} catch {
		config.clearBackgroundPlaybackState();
		return false;
	}
}

export async function startImmersiveApp(
	options: ImmersiveAppOptions = {},
): Promise<void> {
	if (process.platform !== 'win32') {
		console.error('Immersive mode is only supported on Windows.');
		process.exit(1);
	}

	const dependencyCheck = await ensurePlaybackDependencies({interactive: true});
	if (!dependencyCheck.ready) {
		process.exit(1);
	}

	const config = getConfigService();
	const playerService = getPlayerService();
	const musicService = getMusicService();
	const favoritesManager = getFavoritesManager();
	await favoritesManager.ensureLoaded();
	const discoMode = options.discoMode ?? process.env.DISCO_MODE === 'true';

	const initialVolume = options.flags?.volume ?? config.get('volume');
	const state = createInitialImmersiveState({
		volume: initialVolume,
		isDiscoMode: discoMode,
	});

	playerService.setVolume(initialVolume);

	const {tracks, queueIndex, startPlaying, savedProgress, savedVolume} =
		await resolveInitialTrack(options.flags);
	const persisted = await loadPlayerState();
	if (persisted) {
		state.shuffle = persisted.shuffle;
		state.repeat = persisted.repeat;
	}
	if (tracks.length > 0) {
		setQueue(state, tracks);
		state.queueIndex = queueIndex;
		state.currentTrack = tracks[queueIndex] ?? tracks[0] ?? null;
		state.currentTime = savedProgress;
		if (state.currentTrack?.duration) {
			state.duration = state.currentTrack.duration;
		}
		if (savedVolume !== undefined) {
			state.volume = savedVolume;
			playerService.setVolume(savedVolume);
		}
	}

	let engine: ImmersiveEngine | null = null;
	let eofTimestamp = 0;
	let isAdvancing = false;
	let lastAdvanceAt = 0;
	let lastTimePosChangeAt = Date.now();
	let lastObservedTimePos = state.currentTime;
	let stallNotified = false;
	let reattachTimePosWaiter: (() => void) | null = null;

	const waitForTimePos = (timeoutMs: number): Promise<boolean> =>
		new Promise(resolve => {
			let settled = false;
			const finish = (ok: boolean) => {
				if (settled) {
					return;
				}
				settled = true;
				reattachTimePosWaiter = null;
				clearTimeout(timer);
				resolve(ok);
			};
			reattachTimePosWaiter = () => finish(true);
			const timer = setTimeout(() => finish(false), timeoutMs);
		});

	const playTrackAtIndex = async (index: number): Promise<void> => {
		const track = state.queue[index];
		if (!track) {
			return;
		}

		state.queueIndex = index;
		state.currentTrack = track;

		const trackUrl = trackYouTubeUrl(track);
		const notificationsEnabled = config.get('notifications') ?? false;

		isAdvancing = true;
		state.currentTime = 0;

		try {
			const bgState = config.getBackgroundPlaybackState();
			if (
				bgState.enabled &&
				bgState.ipcPath &&
				bgState.currentUrl === trackUrl
			) {
				try {
					await playerService.reattach(bgState.ipcPath, {
						trackId: track.videoId,
						currentUrl: trackUrl,
					});
					config.clearBackgroundPlaybackState();
				} catch {
					config.clearBackgroundPlaybackState();
					await playerService.play(trackUrl, getPlaybackOptions(state.volume));
				}
			} else {
				await playerService.play(trackUrl, getPlaybackOptions(state.volume));
			}

			playerService.resume();
			state.isPlaying = true;

			if (track.duration) {
				state.duration = track.duration;
			}

			const title = track.title;
			const artist = trackArtists(track);
			updateTrayIcon(`${title} - ${artist}`);
			if (notificationsEnabled) {
				showTrackChangeToast(title, artist);
			}
		} catch (error) {
			state.isPlaying = false;
			playerService.stop();
			const message =
				error instanceof Error ? error.message : 'Playback failed';
			showTrackChangeToast('Playback error', message);
		} finally {
			isAdvancing = false;
		}
	};

	const queueAndPlay = async (nextTracks: Track[]): Promise<void> => {
		if (nextTracks.length === 0) return;
		setQueue(state, nextTracks);
		await playTrackAtIndex(0);
	};

	const playCurrent = async (): Promise<void> => {
		if (!state.currentTrack) {
			return;
		}
		await playTrackAtIndex(state.queueIndex);
	};

	const togglePlayback = async (): Promise<void> => {
		const hasSession = playerService.hasActivePlaybackSession();
		const loadedTrackId = playerService.getCurrentTrackId();
		const currentVideoId = state.currentTrack?.videoId ?? null;

		if (hasSession && state.isPlaying) {
			playerService.pause();
			state.isPlaying = false;
			return;
		}

		if (
			hasSession &&
			!state.isPlaying &&
			loadedTrackId &&
			currentVideoId &&
			loadedTrackId === currentVideoId
		) {
			playerService.resume();
			state.isPlaying = true;
			return;
		}

		if (state.currentTrack) {
			await playCurrent();
		}
	};

	const handleNext = async (): Promise<void> => {
		const track = advanceQueue(state);
		if (track) {
			await playTrackAtIndex(state.queueIndex);
		} else {
			playerService.pause();
			state.isPlaying = false;
		}
	};

	const handleNextFromEof = async (): Promise<void> => {
		const now = Date.now();
		if (shouldDebounceAdvance(lastAdvanceAt, now)) {
			return;
		}
		lastAdvanceAt = now;
		await handleNext();
	};

	const handlePrevious = async (): Promise<void> => {
		const track = previousQueue(state);
		if (track) {
			await playTrackAtIndex(state.queueIndex);
		}
	};

	playerService.onEvent(event => {
		if (event.duration !== undefined) {
			state.duration = event.duration;
		}

		if (event.timePos !== undefined) {
			state.currentTime = event.timePos;
			if (event.timePos !== lastObservedTimePos) {
				lastObservedTimePos = event.timePos;
				lastTimePosChangeAt = Date.now();
				stallNotified = false;
			}
			if (reattachTimePosWaiter) {
				reattachTimePosWaiter();
			}
		}

		if (event.eof) {
			eofTimestamp = Date.now();
			if (state.repeat === 'one' && state.currentTrack) {
				state.currentTime = 0;
				void playTrackAtIndex(state.queueIndex);
				return;
			}
			void handleNextFromEof();
		}

		if (event.paused !== undefined) {
			if (
				!shouldApplyMpvPauseSync({
					paused: event.paused,
					isAdvancing,
					eofTimestamp,
				})
			) {
				return;
			}
			state.isPlaying = !event.paused;
			if (event.paused) {
				stallNotified = false;
			}
		}
	});

	registerGlobalHotkeys({
		onTogglePlay: () => {
			void togglePlayback();
		},
		onNext: () => {
			void handleNext();
		},
		onPrevious: () => {
			void handlePrevious();
		},
	});

	const stallWatchdog = setInterval(() => {
		if (
			!state.isPlaying ||
			isAdvancing ||
			!playerService.hasActivePlaybackSession()
		) {
			lastTimePosChangeAt = Date.now();
			return;
		}

		if (
			Date.now() - lastTimePosChangeAt >= PLAYBACK_STALL_MS &&
			!stallNotified
		) {
			state.isPlaying = false;
			stallNotified = true;
			showTrackChangeToast('Playback stalled', 'Press Space to resume');
		}
	}, 1000);

	process.on('exit', () => {
		unregisterGlobalHotkeys();
		clearInterval(stallWatchdog);
		playerService.stop();
	});

	engine = new ImmersiveEngine({
		discoMode: state.isDiscoMode,
		enableTray: true,
		enableNotifications: config.get('notifications') ?? false,
		getState: () => state,
		isFavorite: videoId => favoritesManager.isFavorite(videoId),
		onTogglePlay: () => {
			void togglePlayback();
		},
		onToggleDisco: () => {
			state.isDiscoMode = !state.isDiscoMode;
			engine?.setDiscoMode(state.isDiscoMode);
		},
		onVolumeUp: () => {
			state.volume = Math.min(100, state.volume + 5);
			playerService.setVolume(state.volume);
		},
		onVolumeDown: () => {
			state.volume = Math.max(0, state.volume - 5);
			playerService.setVolume(state.volume);
		},
		onNext: () => {
			void handleNext();
		},
		onPrevious: () => {
			void handlePrevious();
		},
		onToggleFavoriteCurrent: async () => {
			if (!state.currentTrack) return;
			const added = await favoritesManager.toggle(state.currentTrack);
			showTrackChangeToast(
				state.currentTrack.title,
				added ? 'Added to favorites' : 'Removed from favorites',
			);
		},
		onSearch: async ({query, type, limit}) => {
			const response = await musicService.search(query, {
				type,
				limit,
			});
			if (response.results.length === 0) {
				return {results: [], message: 'No results found'};
			}
			return {results: response.results, message: null};
		},
		onPlaySearchResult: async (result: SearchResult) => {
			const outcome = await playSearchResult(result, musicService);
			if (!outcome.ok) {
				throw new Error(outcome.message);
			}
			await queueAndPlay(outcome.tracks);
		},
		onCreateMix: async (result: SearchResult) => {
			const outcome = await createMixFromResult(result, musicService);
			if (!outcome.ok) {
				return outcome.message;
			}
			await queueAndPlay(outcome.tracks);
			return `Mix "${outcome.playlistName}" (${outcome.tracks.length} tracks)`;
		},
		onToggleFavoriteSearchResult: async (result: SearchResult) => {
			if (result.type !== 'song') {
				return 'Favorites only apply to songs';
			}
			const track = result.data as Track;
			const added = await favoritesManager.toggle(track);
			return added ? 'Added to favorites' : 'Removed from favorites';
		},
		onDownloadSearchResult: async (result: SearchResult) => {
			if (immersiveDownloadInProgress) {
				return 'Download already in progress. Please wait.';
			}

			const downloadService = getDownloadService();
			const downloadConfig = downloadService.getConfig();
			if (!downloadConfig.enabled) {
				return 'Downloads are disabled. Enable Downloads in Settings.';
			}

			try {
				immersiveDownloadInProgress = true;
				const target = await downloadService.resolveSearchTarget(result);
				if (target.tracks.length === 0) {
					return `No tracks found for "${target.name}".`;
				}

				showTrackChangeToast(
					'Download',
					`Downloading ${target.tracks.length} track(s)...`,
				);
				const summary = await downloadService.downloadTracks(target.tracks);
				return `Downloaded ${summary.downloaded}, skipped ${summary.skipped}, failed ${summary.failed}.`;
			} catch (error) {
				return error instanceof Error ? error.message : 'Download failed.';
			} finally {
				immersiveDownloadInProgress = false;
			}
		},
		getSavedPlaylists: () => loadPlaylists(),
		getFavoriteTracks: () => favoritesManager.getAllTracks(),
		getRecentFavorites: () => favoritesManager.getRecentTracks(8),
		onPlaySavedPlaylist: async (playlist: Playlist) => {
			if (playlist.tracks.length === 0) {
				throw new Error(`No tracks in "${playlist.name}"`);
			}
			await queueAndPlay(playlist.tracks);
		},
		onPlayFavoriteTrack: async (track: Track) => {
			await queueAndPlay([track]);
		},
		onPlayAllFavorites: async () => {
			const favorites = favoritesManager.getAllTracks();
			if (favorites.length === 0) {
				return 'No favorites yet — press F while playing';
			}
			await queueAndPlay(favorites);
			return null;
		},
		onPlayRandomFavorite: async () => {
			const track = favoritesManager.randomOne();
			if (!track) {
				return 'No favorites yet — press F while playing';
			}
			await queueAndPlay([track]);
			return null;
		},
		onToggleShuffle: () => {
			const enabled = toggleShuffle(state);
			showTrackChangeToast('Shuffle', enabled ? 'On' : 'Off');
		},
		onToggleRepeat: () => {
			const mode = cycleRepeat(state);
			showTrackChangeToast('Repeat', formatRepeatLabel(mode));
		},
		getSettingsRows: () => buildImmersiveSettingsRows(config),
		getSettingsTextDraft: (field: SettingsTextField) =>
			getSettingsTextDraft(config, field),
		onSettingsCycle: index =>
			cycleImmersiveSetting(config, index, {
				sleepTimer: sleepTimerState,
				onSleepTimerExpire: () => {
					playerService.pause();
					state.isPlaying = false;
					sleepTimerState.lastPreset = null;
				},
			}),
		onSettingsTextSave: (field, value) =>
			saveSettingsTextField(config, field, value),
	});

	await engine.start();

	let playbackStarted = false;
	if (state.currentTrack) {
		playbackStarted = await tryReattachBackgroundPlayback(
			state,
			playerService,
			config,
			waitForTimePos,
		);
	}

	if (startPlaying && state.currentTrack && !playbackStarted) {
		await playCurrent();
	}
}
