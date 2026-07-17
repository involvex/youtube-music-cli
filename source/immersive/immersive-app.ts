import process from 'node:process';
import type {Flags} from '../types/cli.types.ts';
import type {RadioStation} from '../types/radio-station.types.ts';
import type {
	Playlist,
	SearchResult,
	Track,
} from '../types/youtube-music.types.ts';
import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {getPlayerService} from '../services/player/player.service.ts';
import {getDownloadService} from '../services/download/download.service.ts';
import {formatDownloadProgress} from '../utils/download-progress.ts';
import {getFavoritesManager} from '../services/favorites/favorites.service.ts';
import {ensurePlaybackDependencies} from '../services/player/dependency-check.service.ts';
import {
	loadPlayerState,
	savePlayerState,
} from '../services/player-state/player-state.service.ts';
import {
	ADVANCE_DEBOUNCE_MS,
	ADVANCE_GRACE_MS,
	BACKGROUND_PLAYBACK_TTL_MS,
	PLAYBACK_STALL_MS,
	shouldApplyMpvPauseSync,
	shouldDebounceAdvance,
} from '../services/player/mpv-event-policy.ts';
import {
	AUTOPLAY_MAX_FAILED_CYCLES,
	AUTOPLAY_RETRY_DELAY_MS,
	AUTOPLAY_TICK_MS,
	buildAutoplaySeedPlan,
	getTracksAhead,
	isAtExplicitQueueEnd,
	mergeSuggestionTracksForAutoplay,
	recordSessionTrack,
	shouldDeferPauseAtQueueEnd,
	shouldPrefetchAutoplay,
	shouldResumeAfterPrefetch,
} from '../services/player/autoplay-coordinator.ts';
import {getRadioService} from '../services/radio/radio.service.ts';
import {logger} from '../services/logger/logger.service.ts';
import {ImmersiveEngine} from './immersive-engine.ts';
import {
	addTrackToSavedPlaylist,
	createMixFromResult,
	loadPlaylists,
	playSearchResult,
	removeTrackFromSavedPlaylist,
} from './actions/playback-actions.ts';
import {
	advanceQueue,
	appendTracksForAutoplay,
	createInitialImmersiveState,
	cycleRepeat,
	formatRepeatLabel,
	previousQueue,
	resolveRandomFavoriteStartIndex,
	setQueue,
	toggleAutoplay,
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
		state.autoplay = persisted.autoplay ?? true;
	}
	if (tracks.length > 0) {
		setQueue(state, tracks, queueIndex);
		if (persisted?.explicitQueueLength !== undefined) {
			state.explicitQueueLength = persisted.explicitQueueLength;
		}
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
	let lastAdvanceAt = -ADVANCE_DEBOUNCE_MS;
	let advanceGraceUntil = 0;
	let lastTimePosChangeAt = Date.now();
	let lastObservedTimePos = state.currentTime;
	let stallNotified = false;
	let reattachTimePosWaiter: (() => void) | null = null;
	let fetchedForVideoId: string | null = null;
	let isFetchingAutoplay = false;
	let sessionHistory: string[] = persisted?.sessionHistory ?? [];
	let historySeedCursor = 0;
	let waitingForAutoplayAtQueueEnd = false;
	let autoplayFailedCycles = 0;
	let autoplayRetryTimer: ReturnType<typeof setTimeout> | null = null;
	let radioPhaseNotified = false;

	const getAutoplayQueueState = () => ({
		autoplay: state.autoplay,
		isPlaying: state.isPlaying,
		repeat: state.repeat,
		shuffle: state.shuffle,
		queueLength: state.queue.length,
		queuePosition: state.queueIndex,
		currentTrackVideoId: state.currentTrack?.videoId ?? null,
		radioIsActive: state.radioIsActive,
		explicitQueueLength: state.explicitQueueLength,
	});

	const beginAdvanceGrace = (): void => {
		advanceGraceUntil = Date.now() + ADVANCE_GRACE_MS;
	};

	const clearAdvanceGrace = (): void => {
		advanceGraceUntil = 0;
	};

	const persistImmersivePlayerState = (): void => {
		const payload = {
			currentTrack: state.currentTrack,
			queue: state.queue,
			queuePosition: state.queueIndex,
			progress: state.currentTime,
			volume: state.volume,
			shuffle: state.shuffle,
			repeat: state.repeat,
			autoplay: state.autoplay,
			sessionHistory,
			explicitQueueLength: state.explicitQueueLength,
		};
		if (state.queue.length >= 50) {
			// #region agent log
			fetch(
				'http://127.0.0.1:7639/ingest/7c0f2421-9802-418d-ac83-797a04e69089',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Debug-Session-Id': 'e16c7e',
					},
					body: JSON.stringify({
						sessionId: 'e16c7e',
						runId: 'pre-fix',
						hypothesisId: 'A,D',
						location: 'immersive-app.ts:persistImmersivePlayerState',
						message: 'persist state with large queue',
						data: {
							queueLength: state.queue.length,
							sessionHistoryLength: sessionHistory.length,
							payloadBytes: JSON.stringify(payload).length,
						},
						timestamp: Date.now(),
					}),
				},
			).catch(() => {});
			// #endregion
		}
		void savePlayerState(payload);
	};

	const scheduleAutoplayRetry = (waitingAtQueueEnd: boolean): void => {
		if (autoplayRetryTimer) {
			return;
		}
		autoplayRetryTimer = setTimeout(() => {
			autoplayRetryTimer = null;
			void runAutoplayTick({waitingAtQueueEnd});
		}, AUTOPLAY_RETRY_DELAY_MS);
	};

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
		state.playbackMode = 'youtube';
		state.currentStation = null;
		fetchedForVideoId = null;
		sessionHistory = recordSessionTrack(sessionHistory, track.videoId);

		const trackUrl = trackYouTubeUrl(track);
		const notificationsEnabled = config.get('notifications') ?? false;

		isAdvancing = true;
		beginAdvanceGrace();
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
			clearAdvanceGrace();
			playerService.stop();
			const message =
				error instanceof Error ? error.message : 'Playback failed';
			showTrackChangeToast('Playback error', message);
		} finally {
			isAdvancing = false;
			persistImmersivePlayerState();
		}
	};

	const queueAndPlay = async (
		nextTracks: Track[],
		startIndex = 0,
	): Promise<void> => {
		if (nextTracks.length === 0) {
			return;
		}
		setQueue(state, nextTracks, startIndex);
		radioPhaseNotified = false;
		state.isPlaying = true;
		beginAdvanceGrace();
		await playTrackAtIndex(state.queueIndex);
		persistImmersivePlayerState();
		if (state.autoplay) {
			void runAutoplayTick();
		}
	};

	const playRadioStream = async (station: RadioStation): Promise<void> => {
		state.playbackMode = 'stream';
		state.currentStation = station;
		state.currentTrack = null;
		state.queue = [];
		state.queueIndex = 0;
		state.explicitQueueLength = 0;
		state.radioIsActive = false;
		state.radioSeed = null;
		state.autoplay = false;
		state.currentTime = 0;
		state.duration = 0;
		fetchedForVideoId = null;
		waitingForAutoplayAtQueueEnd = false;
		radioPhaseNotified = false;

		const notificationsEnabled = config.get('notifications') ?? false;
		isAdvancing = true;
		beginAdvanceGrace();

		try {
			await playerService.play(station.streamUrl, {
				...getPlaybackOptions(state.volume),
				trackId: station.id,
			});
			playerService.resume();
			state.isPlaying = true;
			updateTrayIcon(`${station.name} - LIVE`);
			if (notificationsEnabled) {
				showTrackChangeToast(station.name, 'LIVE');
			}
		} catch (error) {
			state.isPlaying = false;
			clearAdvanceGrace();
			playerService.stop();
			const message =
				error instanceof Error ? error.message : 'Stream playback failed';
			showTrackChangeToast('Playback error', message);
		} finally {
			isAdvancing = false;
			persistImmersivePlayerState();
		}
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

		if (state.playbackMode === 'stream' && state.currentStation) {
			if (hasSession && state.isPlaying) {
				playerService.pause();
				state.isPlaying = false;
				return;
			}

			if (
				hasSession &&
				!state.isPlaying &&
				loadedTrackId === state.currentStation.id
			) {
				playerService.resume();
				state.isPlaying = true;
				return;
			}

			await playRadioStream(state.currentStation);
			return;
		}

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
			waitingForAutoplayAtQueueEnd = false;
			state.isPlaying = true;
			beginAdvanceGrace();
			await playTrackAtIndex(state.queueIndex);
			persistImmersivePlayerState();
			return;
		}

		if (shouldDeferPauseAtQueueEnd(state.autoplay, isFetchingAutoplay)) {
			waitingForAutoplayAtQueueEnd = true;
			fetchedForVideoId = null;
			state.isPlaying = true;
			beginAdvanceGrace();
			void runAutoplayTick({waitingAtQueueEnd: true});
			return;
		}

		waitingForAutoplayAtQueueEnd = false;
		clearAdvanceGrace();
		playerService.pause();
		state.isPlaying = false;
	};

	const runAutoplayTick = async (options?: {
		waitingAtQueueEnd?: boolean;
	}): Promise<void> => {
		const waitingAtQueueEnd =
			options?.waitingAtQueueEnd === true || waitingForAutoplayAtQueueEnd;
		const autoplayState = getAutoplayQueueState();
		if (
			!shouldPrefetchAutoplay(autoplayState, {
				fetchedForVideoId,
				isFetching: isFetchingAutoplay,
				waitingAtQueueEnd,
			})
		) {
			return;
		}

		const seedVideoId = state.currentTrack?.videoId;
		if (!seedVideoId) {
			return;
		}

		const queueLengthBefore = state.queue.length;
		const wasAtEndOfQueue = state.queueIndex >= queueLengthBefore - 1;
		const progressBefore = state.currentTime;
		const durationBefore = state.duration;
		const trackTitle = state.currentTrack?.title ?? seedVideoId;

		isFetchingAutoplay = true;

		try {
			const {seeds, nextCursor} = buildAutoplaySeedPlan(
				seedVideoId,
				sessionHistory,
				historySeedCursor,
			);
			historySeedCursor = nextCursor;

			const queueIds = new Set(
				state.queue.map(queueTrack => queueTrack.videoId).filter(Boolean),
			);
			const recentPlayedIds = new Set(sessionHistory);

			let tracks: Track[] = [];
			for (const seed of seeds) {
				const rawTracks =
					state.radioIsActive && state.radioSeed
						? await getRadioService().fetchMoreTracks(state.radioSeed)
						: await musicService.getSuggestions(seed);
				const merged = mergeSuggestionTracksForAutoplay(
					recentPlayedIds,
					queueIds,
					rawTracks,
				);
				if (merged.length > 0) {
					tracks = merged;
					fetchedForVideoId = seed;
					break;
				}
			}

			const added = appendTracksForAutoplay(state, tracks);
			if (added > 0) {
				const mem = process.memoryUsage();
				// #region agent log
				fetch(
					'http://127.0.0.1:7639/ingest/7c0f2421-9802-418d-ac83-797a04e69089',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'X-Debug-Session-Id': 'e16c7e',
						},
						body: JSON.stringify({
							sessionId: 'e16c7e',
							runId: 'pre-fix',
							hypothesisId: 'A',
							location: 'immersive-app.ts:runAutoplayTick',
							message: 'autoplay appended tracks',
							data: {
								added,
								queueLengthBefore,
								queueLengthAfter: state.queue.length,
								rssMb: Math.round(mem.rss / 1024 / 1024),
								heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
							},
							timestamp: Date.now(),
						}),
					},
				).catch(() => {});
				// #endregion
			}
			if (added === 0) {
				fetchedForVideoId = null;
				autoplayFailedCycles++;
				if (
					waitingAtQueueEnd &&
					autoplayFailedCycles >= AUTOPLAY_MAX_FAILED_CYCLES
				) {
					waitingForAutoplayAtQueueEnd = false;
					clearAdvanceGrace();
					playerService.pause();
					state.isPlaying = false;
					showTrackChangeToast('Autoplay', 'Could not find new tracks to play');
				} else if (waitingAtQueueEnd || wasAtEndOfQueue) {
					waitingForAutoplayAtQueueEnd = true;
					state.isPlaying = true;
					showTrackChangeToast('Autoplay', 'No new tracks found, retrying…');
					scheduleAutoplayRetry(true);
				}
				return;
			}

			autoplayFailedCycles = 0;
			waitingForAutoplayAtQueueEnd = false;

			if (
				!radioPhaseNotified &&
				state.explicitQueueLength > 0 &&
				wasAtEndOfQueue &&
				state.queueIndex >= state.explicitQueueLength - 1
			) {
				radioPhaseNotified = true;
				showTrackChangeToast('Autoplay', 'Playing similar tracks');
			}

			logger.info(
				state.radioIsActive ? 'Radio' : 'Autoplay',
				state.radioIsActive
					? 'Immersive radio: added tracks'
					: 'Immersive autoplay: added suggestions',
				{
					count: added,
					basedOn: trackTitle,
				},
			);

			persistImmersivePlayerState();

			if (
				shouldResumeAfterPrefetch(
					wasAtEndOfQueue,
					progressBefore,
					durationBefore,
				) ||
				(waitingAtQueueEnd && wasAtEndOfQueue)
			) {
				logger.info(
					'ImmersiveApp',
					'Autoplay: resuming playback via freshly added suggestions',
					{
						progress: progressBefore,
						duration: durationBefore,
					},
				);
				await handleNextFromEof(true);
			}
		} catch (error) {
			fetchedForVideoId = null;
			autoplayFailedCycles++;
			if (
				waitingAtQueueEnd &&
				autoplayFailedCycles >= AUTOPLAY_MAX_FAILED_CYCLES
			) {
				waitingForAutoplayAtQueueEnd = false;
				clearAdvanceGrace();
				playerService.pause();
				state.isPlaying = false;
				showTrackChangeToast('Autoplay', 'Failed to fetch suggestions');
			} else if (waitingAtQueueEnd) {
				waitingForAutoplayAtQueueEnd = true;
				state.isPlaying = true;
				scheduleAutoplayRetry(true);
			}
			logger.warn('ImmersiveApp', 'Autoplay: failed to fetch suggestions', {
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			isFetchingAutoplay = false;
		}
	};

	const handleNextFromEof = async (force = false): Promise<void> => {
		const now = Date.now();
		if (!force && shouldDebounceAdvance(lastAdvanceAt, now)) {
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
				if (advanceGraceUntil > 0 && event.timePos > 0) {
					clearAdvanceGrace();
				}
			}
			if (reattachTimePosWaiter) {
				reattachTimePosWaiter();
			}
		}

		if (event.eof) {
			if (state.playbackMode === 'stream') {
				return;
			}

			eofTimestamp = Date.now();
			if (state.repeat === 'one' && state.currentTrack) {
				state.currentTime = 0;
				state.isPlaying = true;
				beginAdvanceGrace();
				void playTrackAtIndex(state.queueIndex);
				return;
			}
			void handleNextFromEof();
		}

		if (event.paused !== undefined) {
			if (waitingForAutoplayAtQueueEnd && event.paused) {
				return;
			}
			if (
				!shouldApplyMpvPauseSync({
					paused: event.paused,
					isAdvancing,
					eofTimestamp,
					advanceGraceUntil,
					isFetchingAutoplay,
					waitingForAutoplayAtQueueEnd,
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
		const now = Date.now();
		const inAdvanceGrace = advanceGraceUntil > 0 && now < advanceGraceUntil;

		if (
			!state.isPlaying ||
			isAdvancing ||
			inAdvanceGrace ||
			waitingForAutoplayAtQueueEnd ||
			!playerService.hasActivePlaybackSession()
		) {
			lastTimePosChangeAt = now;
			return;
		}

		if (now - lastTimePosChangeAt >= PLAYBACK_STALL_MS && !stallNotified) {
			stallNotified = true;
			if (state.autoplay) {
				showTrackChangeToast('Playback slow', 'Buffering…');
				const tracksAhead = getTracksAhead({
					queueLength: state.queue.length,
					queuePosition: state.queueIndex,
				});
				if (
					tracksAhead === 0 ||
					isAtExplicitQueueEnd({
						queuePosition: state.queueIndex,
						explicitQueueLength: state.explicitQueueLength,
					})
				) {
					void runAutoplayTick({waitingAtQueueEnd: true});
				}
			} else {
				state.isPlaying = false;
				showTrackChangeToast('Playback stalled', 'Press Space to resume');
			}
		}
	}, 1000);

	const progressAdvanceCheck = setInterval(() => {
		if (
			!state.isPlaying ||
			isAdvancing ||
			state.duration <= 0 ||
			state.repeat === 'one'
		) {
			return;
		}

		if (state.currentTime < state.duration - 2) {
			return;
		}

		const hasNextTrack =
			state.queue.length > 0 &&
			(state.queueIndex < state.queue.length - 1 || state.autoplay);

		if (!hasNextTrack) {
			return;
		}

		void handleNextFromEof();
	}, 500);

	const autoplayTick = setInterval(() => {
		void runAutoplayTick();
	}, AUTOPLAY_TICK_MS);

	const debugMemoryProbe = setInterval(() => {
		const mem = process.memoryUsage();
		// #region agent log
		fetch('http://127.0.0.1:7639/ingest/7c0f2421-9802-418d-ac83-797a04e69089', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Debug-Session-Id': 'e16c7e',
			},
			body: JSON.stringify({
				sessionId: 'e16c7e',
				runId: 'pre-fix',
				hypothesisId: 'A,B,C,D,E',
				location: 'immersive-app.ts:debugMemoryProbe',
				message: 'periodic memory probe',
				data: {
					rssMb: Math.round(mem.rss / 1024 / 1024),
					heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
					externalMb: Math.round(mem.external / 1024 / 1024),
					queueLength: state.queue.length,
					queueIndex: state.queueIndex,
					sessionHistoryLength: sessionHistory.length,
					autoplay: state.autoplay,
					isPlaying: state.isPlaying,
				},
				timestamp: Date.now(),
			}),
		}).catch(() => {});
		// #endregion
	}, 30_000);

	process.on('exit', () => {
		unregisterGlobalHotkeys();
		clearInterval(stallWatchdog);
		clearInterval(progressAdvanceCheck);
		clearInterval(autoplayTick);
		clearInterval(debugMemoryProbe);
		if (autoplayRetryTimer) {
			clearTimeout(autoplayRetryTimer);
		}
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
		onDownloadSearchResult: async (result: SearchResult, onProgress) => {
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
				const summary = await downloadService.downloadTracks(target.tracks, {
					onProgress: info => {
						onProgress?.(formatDownloadProgress(info));
					},
				});
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
			const favorites = favoritesManager.getAllTracks();
			if (favorites.length === 0) {
				return 'No favorites yet — press F while playing';
			}
			const startIndex = resolveRandomFavoriteStartIndex(favorites.length);
			await queueAndPlay(favorites, startIndex);
			return null;
		},
		onPlayRadioStation: async (station: RadioStation) => {
			await playRadioStream(station);
		},
		onRemoveFavoriteTrack: async (track: Track) => {
			await favoritesManager.remove(track.videoId);
			return 'Removed from favorites';
		},
		onAddTrackToPlaylist: async (playlistId: string, track: Track) => {
			const result = addTrackToSavedPlaylist(playlistId, track);
			if (result === 'missing') {
				throw new Error('Playlist not found');
			}
			if (result === 'duplicate') {
				return 'Track already in playlist';
			}
			const playlist = loadPlaylists().find(
				item => item.playlistId === playlistId,
			);
			return playlist ? `Added to "${playlist.name}"` : 'Added to playlist';
		},
		onRemoveTrackFromPlaylist: async (
			playlistId: string,
			trackIndex: number,
		) => {
			const removed = removeTrackFromSavedPlaylist(playlistId, trackIndex);
			if (!removed) {
				throw new Error('Failed to remove track');
			}
			return 'Track removed';
		},
		onAddCurrentTrackToPlaylist: async (playlistId: string) => {
			const currentTrack = state.currentTrack;
			if (!currentTrack) {
				throw new Error('Nothing playing — start playback first');
			}
			const result = addTrackToSavedPlaylist(playlistId, currentTrack);
			if (result === 'missing') {
				throw new Error('Playlist not found');
			}
			if (result === 'duplicate') {
				return 'Current track already in playlist';
			}
			const playlist = loadPlaylists().find(
				item => item.playlistId === playlistId,
			);
			return playlist
				? `Added "${currentTrack.title}" to "${playlist.name}"`
				: 'Track added';
		},
		onToggleShuffle: () => {
			const enabled = toggleShuffle(state);
			showTrackChangeToast('Shuffle', enabled ? 'On' : 'Off');
			persistImmersivePlayerState();
		},
		onToggleRepeat: () => {
			const mode = cycleRepeat(state);
			showTrackChangeToast('Repeat', formatRepeatLabel(mode));
			persistImmersivePlayerState();
		},
		onToggleAutoplay: () => {
			const enabled = toggleAutoplay(state);
			fetchedForVideoId = null;
			autoplayFailedCycles = 0;
			if (enabled) {
				void runAutoplayTick();
			}
			showTrackChangeToast('Autoplay', enabled ? 'On' : 'Off');
			persistImmersivePlayerState();
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
