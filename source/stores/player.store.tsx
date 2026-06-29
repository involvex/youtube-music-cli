// Player store - manages player state
import {
	createContext,
	useContext,
	useReducer,
	useEffect,
	useRef,
	type ReactNode,
} from 'react';
import type {PlayerState, PlayerAction} from '../types/player.types.ts';
import {getPlayerService} from '../services/player/player.service.ts';
import {
	loadPlayerState,
	savePlayerState,
} from '../services/player-state/player-state.service.ts';
import {logger} from '../services/logger/logger.service.ts';
import {shouldApplyMpvPauseSync} from '../services/player/mpv-event-policy.ts';
import {getNotificationService} from '../services/notification/notification.service.ts';
import {getScrobblingService} from '../services/scrobbling/scrobbling.service.ts';
import {getDiscordRpcService} from '../services/discord/discord-rpc.service.ts';
import {getMprisService} from '../services/mpris/mpris.service.ts';
import {getWebServerManager} from '../services/web/web-server-manager.ts';
import {getWebStreamingService} from '../services/web/web-streaming.service.ts';
import {getRadioService} from '../services/radio/radio.service.ts';
import type {RadioSeed} from '../types/radio.types.ts';

const initialState: PlayerState = {
	currentTrack: null,
	isPlaying: false,
	volume: 70,
	speed: 1.0,
	progress: 0,
	duration: 0,
	queue: [],
	queuePosition: 0,
	repeat: 'off',
	shuffle: false,
	autoplay: true,
	isLoading: false,
	error: null,
	playRequestId: 0,
	abLoop: {a: null, b: null},
	subtitle: null,
	radioIsActive: false,
	radioSeed: null,
};

// Get player service instance
const playerService = getPlayerService();

export function playerReducer(
	state: PlayerState,
	action: PlayerAction,
): PlayerState {
	switch (action.category) {
		case 'PLAY':
			return {
				...state,
				currentTrack: action.track,
				isPlaying: true,
				progress: 0,
				error: null,
				playRequestId: state.playRequestId + 1,
			};

		case 'PAUSE': {
			logger.debug('PlayerReducer', 'PAUSE action received', {
				stack: new Error().stack,
				isPlayingBefore: state.isPlaying,
			});
			return {...state, isPlaying: false};
		}

		case 'RESUME': {
			logger.debug('PlayerReducer', 'RESUME action received', {
				stack: new Error().stack,
				isPlayingBefore: state.isPlaying,
			});
			return {...state, isPlaying: true};
		}

		case 'STOP':
			logger.debug('PlayerReducer', 'STOP action received', {
				stack: new Error().stack,
			});
			return {
				...state,
				isPlaying: false,
				progress: 0,
				currentTrack: null,
			};

		case 'NEXT': {
			if (state.queue.length === 0) return state;

			// Shuffle mode: pick a random track excluding the current position
			if (state.shuffle && state.queue.length > 1) {
				let randomIndex: number;
				do {
					randomIndex = Math.floor(Math.random() * state.queue.length);
				} while (randomIndex === state.queuePosition);
				return {
					...state,
					queuePosition: randomIndex,
					currentTrack: state.queue[randomIndex] ?? null,
					isPlaying: true,
					progress: 0,
					playRequestId: state.playRequestId + 1,
				};
			}

			// Sequential mode
			const nextPosition = state.queuePosition + 1;
			if (nextPosition >= state.queue.length) {
				if (state.repeat === 'all') {
					return {
						...state,
						queuePosition: 0,
						currentTrack: state.queue[0] ?? null,
						isPlaying: true,
						progress: 0,
						playRequestId: state.playRequestId + 1,
					};
				}
				return state;
			}
			return {
				...state,
				queuePosition: nextPosition,
				currentTrack: state.queue[nextPosition] ?? null,
				isPlaying: true,
				progress: 0,
				playRequestId: state.playRequestId + 1,
			};
		}

		case 'PREVIOUS': {
			const prevPosition = state.queuePosition - 1;
			if (prevPosition < 0) {
				return state;
			}
			if (state.progress > 3) {
				return {
					...state,
					progress: 0,
					playRequestId: state.playRequestId + 1,
				};
			}
			return {
				...state,
				queuePosition: prevPosition,
				currentTrack: state.queue[prevPosition] ?? null,
				progress: 0,
				playRequestId: state.playRequestId + 1,
			};
		}

		case 'SEEK':
			return {
				...state,
				progress: Math.max(0, Math.min(action.position, state.duration)),
			};

		case 'SET_VOLUME': {
			const newVolume = Math.max(0, Math.min(100, action.volume));
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_UP': {
			const newVolume = Math.min(100, state.volume + 10);
			logger.debug('PlayerReducer', 'VOLUME_UP', {
				oldVolume: state.volume,
				newVolume,
			});
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_DOWN': {
			const newVolume = Math.max(0, state.volume - 10);
			logger.debug('PlayerReducer', 'VOLUME_DOWN', {
				oldVolume: state.volume,
				newVolume,
			});
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_FINE_UP': {
			const newVolume = Math.min(100, state.volume + 1);
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'VOLUME_FINE_DOWN': {
			const newVolume = Math.max(0, state.volume - 1);
			playerService.setVolume(newVolume);
			return {...state, volume: newVolume};
		}

		case 'TOGGLE_SHUFFLE':
			return {...state, shuffle: !state.shuffle};

		case 'TOGGLE_AUTOPLAY':
			return {...state, autoplay: !state.autoplay};

		case 'TOGGLE_REPEAT': {
			const repeatModes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
			const currentIndex = repeatModes.indexOf(state.repeat);
			const nextRepeat: 'off' | 'all' | 'one' =
				repeatModes[(currentIndex + 1) % 3] ?? 'off';
			return {...state, repeat: nextRepeat};
		}

		case 'SET_QUEUE':
			return {
				...state,
				queue: action.queue,
				queuePosition: 0,
			};

		case 'ADD_TO_QUEUE':
			return {...state, queue: [...state.queue, action.track]};

		case 'REMOVE_FROM_QUEUE': {
			const newQueue = [...state.queue];
			newQueue.splice(action.index, 1);
			return {...state, queue: newQueue};
		}

		case 'CLEAR_QUEUE':
			return {
				...state,
				queue: [],
				queuePosition: 0,
				isPlaying: false,
			};

		case 'SET_QUEUE_POSITION':
			if (action.position >= 0 && action.position < state.queue.length) {
				return {
					...state,
					queuePosition: action.position,
					currentTrack: state.queue[action.position] ?? null,
					progress: 0,
					playRequestId: state.playRequestId + 1,
				};
			}
			return state;

		case 'UPDATE_PROGRESS': {
			// Clamp progress to valid range
			const clampedProgress = Math.max(
				0,
				Math.min(action.progress, state.duration || action.progress),
			);
			return {...state, progress: clampedProgress};
		}

		case 'SET_DURATION':
			return {...state, duration: action.duration};

		case 'TICK':
			if (state.isPlaying && state.duration > 0) {
				const newProgress = state.progress + 1;
				// Don't exceed duration
				if (newProgress >= state.duration) {
					return {...state, progress: state.duration, isPlaying: false};
				}
				return {...state, progress: newProgress};
			}
			return state;

		case 'SET_LOADING':
			return {...state, isLoading: action.loading};

		case 'SET_ERROR':
			return {
				...state,
				error: action.error,
				isLoading: false,
				isPlaying: false,
			};

		case 'SET_SPEED': {
			const clampedSpeed = Math.max(0.25, Math.min(4.0, action.speed));
			playerService.setSpeed(clampedSpeed);
			return {...state, speed: clampedSpeed};
		}

		case 'SET_AB_LOOP': {
			playerService.setABLoop(action.a, action.b);
			return {...state, abLoop: {a: action.a, b: action.b}};
		}

		case 'SET_SUBTITLE':
			return {...state, subtitle: action.subtitle};

		case 'START_RADIO':
			return {
				...state,
				radioIsActive: true,
				radioSeed: action.seed,
				autoplay: true,
			};

		case 'STOP_RADIO':
			return {
				...state,
				radioIsActive: false,
				radioSeed: null,
			};

		case 'RESTORE_STATE':
			logger.info('PlayerReducer', 'RESTORE_STATE', {
				hasTrack: !!action.currentTrack,
				queueLength: action.queue.length,
			});
			return {
				...state,
				currentTrack: action.currentTrack,
				queue: action.queue,
				queuePosition: action.queuePosition,
				shuffle: action.shuffle,
				repeat: action.repeat,
				autoplay: action.autoplay ?? true,
				isPlaying: false, // Don't auto-play restored state
				abLoop: {a: null, b: null},
			};

		default:
			return state;
	}
}

import type {Track} from '../types/youtube-music.types.ts';

type PlayerContextValue = {
	state: PlayerState;
	dispatch: (action: PlayerAction) => void;
	play: (track: Track) => void;
	pause: () => void;
	resume: () => void;
	stop: () => void;
	next: () => void;
	previous: () => void;
	seek: (position: number) => void;
	setVolume: (volume: number) => void;
	volumeUp: () => void;
	volumeDown: () => void;
	volumeFineUp: () => void;
	volumeFineDown: () => void;
	toggleShuffle: () => void;
	toggleRepeat: () => void;
	toggleAutoplay: () => void;
	setQueue: (queue: Track[]) => void;
	addToQueue: (track: Track) => void;
	removeFromQueue: (index: number) => void;
	clearQueue: () => void;
	setQueuePosition: (position: number) => void;
	setSpeed: (speed: number) => void;
	speedUp: () => void;
	speedDown: () => void;
	setABLoop: (a: number | null, b: number | null) => void;
	startRadio: (seed: RadioSeed) => void;
	stopRadio: () => void;
};

import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {useMemo} from 'react';

const PlayerContext = createContext<PlayerContextValue | null>(null);

function PlayerManager() {
	const {state, dispatch, next} = usePlayer();
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const musicService = getMusicService();
	const playerService = getPlayerService();

	// Initialize MPRIS (Linux only, no-ops on other platforms)
	useEffect(() => {
		void getMprisService().initialize({
			onPlay: () => dispatch({category: 'RESUME'}),
			onPause: () => dispatch({category: 'PAUSE'}),
			onNext: () => dispatch({category: 'NEXT'}),
			onPrevious: () => dispatch({category: 'PREVIOUS'}),
		});
	}, [dispatch]);

	// Register event handler for mpv IPC events
	const eofTimestampRef = useRef(0);
	const lastAutoNextRef = useRef(0);
	useEffect(() => {
		let lastProgressUpdate = 0;
		const PROGRESS_THROTTLE_MS = 1000; // Update progress max once per second

		playerService.onEvent(event => {
			// Log all events at debug level to trace volume-pause correlation
			if (event.paused !== undefined || event.eof !== undefined) {
				logger.debug('PlayerManager', 'Player event received', {
					paused: event.paused,
					eof: event.eof,
					currentVolume: playerService.getVolume(),
					isPlaying: playerService.isCurrentlyPlaying(),
				});
			}

			if (event.duration !== undefined) {
				dispatch({category: 'SET_DURATION', duration: event.duration});
			}

			if (event.timePos !== undefined) {
				// Throttle progress updates to reduce re-renders
				const now = Date.now();
				if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
					dispatch({category: 'UPDATE_PROGRESS', progress: event.timePos});
					lastProgressUpdate = now;
				}
			}

			if (event.eof) {
				// Track ended — record timestamp so we can suppress mpv's spurious
				// pause event that immediately follows EOF (idle state).
				const now = Date.now();
				eofTimestampRef.current = now;
				next();
				lastAutoNextRef.current = now;
			}

			if (event.paused !== undefined) {
				if (
					!shouldApplyMpvPauseSync({
						paused: event.paused,
						eofTimestamp: eofTimestampRef.current,
					})
				) {
					logger.debug('PlayerManager', 'Pause suppressed (EOF or advancing)', {
						timeSinceEofMs: Date.now() - eofTimestampRef.current,
					});
					return;
				}

				if (event.paused) {
					logger.debug('PlayerManager', 'Dispatching PAUSE action from event');
					dispatch({category: 'PAUSE'});
				} else {
					logger.debug('PlayerManager', 'Dispatching RESUME action from event');
					dispatch({category: 'RESUME'});
				}
			}
		});
	}, [playerService, dispatch, next]);

	// Initialize audio on mount
	useEffect(() => {
		const config = getConfigService();
		dispatch({category: 'SET_VOLUME', volume: config.get('volume')});

		const currentInterval = progressIntervalRef.current;
		return () => {
			if (currentInterval) {
				clearInterval(currentInterval);
			}
			logger.debug(
				'PlayerProvider',
				'cleanup effect running - calling playerService.stop()',
				{
					stack: new Error().stack,
				},
			);
			playerService.stop();
		};
	}, [dispatch, playerService]);

	// Handle track changes
	const lastPlayedRequestId = useRef<number>(-1);
	useEffect(() => {
		const track = state.currentTrack;
		if (!track) {
			logger.debug('PlayerManager', 'No current track');
			return;
		}

		// Guard: Don't auto-play during initial state restoration
		if (!state.isPlaying) {
			logger.info('PlayerManager', 'Skipping auto-play (not playing)', {
				title: track.title,
				isPlaying: state.isPlaying,
			});
			return;
		}

		// Guard: Don't replay same track unless a new play request was explicitly dispatched
		const currentTrackId = playerService.getCurrentTrackId?.() || '';
		const isSameTrack = currentTrackId === track.videoId;
		const isNewPlayRequest =
			state.playRequestId !== lastPlayedRequestId.current;
		if (isSameTrack && !isNewPlayRequest) {
			logger.debug('PlayerManager', 'Track already playing, skipping', {
				videoId: track.videoId,
			});
			return;
		}

		lastPlayedRequestId.current = state.playRequestId;

		logger.info('PlayerManager', 'Loading track', {
			title: track.title,
			videoId: track.videoId,
		});

		const loadAndPlayTrack = async () => {
			// If a detached background session exists for this exact track, reattach
			// to the still-running mpv process instead of spawning a new one.
			const config = getConfigService();
			const bgState = config.getBackgroundPlaybackState();
			const trackUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
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
					dispatch({category: 'SET_LOADING', loading: false});
					logger.info('PlayerManager', 'Reattached to background mpv session');
					return;
				} catch (error) {
					logger.warn(
						'PlayerManager',
						'Failed to reattach background session, starting fresh',
						{
							error: error instanceof Error ? error.message : String(error),
						},
					);
					config.clearBackgroundPlaybackState();
					// Fall through to normal play()
				}
			}

			dispatch({category: 'SET_LOADING', loading: true});

			const MAX_RETRIES = 3;
			const RETRY_DELAY_MS = 1500;

			for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
				try {
					logger.debug('PlayerManager', 'Starting playback with mpv', {
						videoId: track.videoId,
						volume: state.volume,
						attempt,
					});

					// Pass YouTube URL directly to mpv (it handles stream extraction via yt-dlp)
					const youtubeUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
					const config = getConfigService();
					const artists =
						track.artists?.map(a => a.name).join(', ') ?? 'Unknown';

					// Fire desktop notification if enabled (only on first attempt)
					if (attempt === 1 && config.get('notifications')) {
						const notificationService = getNotificationService();
						notificationService.setEnabled(true);
						void notificationService.notifyTrackChange(track.title, artists);
					}

					// Discord Rich Presence
					if (config.get('discordRichPresence')) {
						const discord = getDiscordRpcService();
						discord.setEnabled(true);
						void discord
							.connect()
							.then(() =>
								discord.updateActivity({
									title: track.title,
									artist: artists,
									startTimestamp: Date.now(),
								}),
							)
							.catch(() => {
								// Discord not available; already logged by service
							});
					}

					// MPRIS (Linux)
					const mpris = getMprisService();
					mpris.updateTrack(
						{
							title: track.title,
							artist: artists,
							duration: (track.duration ?? 0) * 1_000_000,
						},
						true,
					);

					await playerService.play(youtubeUrl, {
						volume: state.volume,
						audioNormalization: config.get('audioNormalization') ?? false,
						proxy: config.get('proxy'),
						gaplessPlayback: config.get('gaplessPlayback') ?? true,
						crossfadeDuration: config.get('crossfadeDuration') ?? 0,
						equalizerPreset: config.get('equalizerPreset') ?? 'flat',
						volumeFadeDuration: config.get('volumeFadeDuration') ?? 0,
						duration: track.duration,
					});

					logger.info('PlayerManager', 'Playback started successfully', {
						attempt,
					});
					dispatch({category: 'SET_LOADING', loading: false});
					return; // Success
				} catch (error) {
					logger.error('PlayerManager', 'Failed to load track', {
						error: error instanceof Error ? error.message : String(error),
						track: {title: track.title, videoId: track.videoId},
						attempt,
					});

					if (attempt < MAX_RETRIES) {
						logger.info('PlayerManager', 'Retrying playback', {
							attempt,
							nextAttempt: attempt + 1,
							delayMs: RETRY_DELAY_MS,
						});
						await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
					} else {
						dispatch({
							category: 'SET_ERROR',
							error:
								error instanceof Error
									? `${error.message} (after ${MAX_RETRIES} attempts)`
									: 'Failed to load track',
						});
					}
				}
			}
		};

		void loadAndPlayTrack();
		// Note: state.volume intentionally excluded - volume changes should not restart playback
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		state.currentTrack,
		state.isPlaying,
		state.playRequestId,
		dispatch,
		musicService,
	]);

	// Handle progress tracking
	useEffect(() => {
		if (state.isPlaying && state.currentTrack) {
			const interval = setInterval(() => {
				dispatch({category: 'TICK'});
			}, 1000);

			return () => {
				clearInterval(interval);
			};
		}

		return undefined;
	}, [state.isPlaying, state.currentTrack, dispatch]);

	// Scrobble when >50% of track has been played
	const scrobbledRef = useRef<string | null>(null);
	useEffect(() => {
		if (
			state.currentTrack &&
			state.duration > 0 &&
			state.progress / state.duration > 0.5 &&
			scrobbledRef.current !== state.currentTrack.videoId
		) {
			scrobbledRef.current = state.currentTrack.videoId;
			const config = getConfigService();
			const scrobblingConfig = config.get('scrobbling');
			if (scrobblingConfig) {
				const scrobbler = getScrobblingService();
				scrobbler.configure(scrobblingConfig);
				const artist = state.currentTrack.artists?.[0]?.name ?? 'Unknown';
				void scrobbler.scrobble({
					title: state.currentTrack.title,
					artist,
					duration: state.duration,
				});
			}
		}

		if (
			state.currentTrack &&
			scrobbledRef.current !== state.currentTrack.videoId &&
			state.progress < 1
		) {
			// New track started — reset so we can scrobble again
			scrobbledRef.current = null;
		}
	}, [state.progress, state.duration, state.currentTrack]);

	// Handle play/pause state
	useEffect(() => {
		if (state.isPlaying) {
			// Resume only if the same track is already loaded in the player service.
			// If the track changed, the "handle track changes" effect will call play().
			const currentTrackId = playerService.getCurrentTrackId?.() ?? '';
			logger.debug('PlayerManager', 'Play/pause effect', {
				isPlaying: state.isPlaying,
				currentTrackId,
				stateVideoId: state.currentTrack?.videoId,
			});
			if (!currentTrackId || state.currentTrack?.videoId === currentTrackId) {
				playerService.resume();
			} else {
				logger.debug('PlayerManager', 'Skipping resume', {
					currentTrackId,
					stateVideoId: state.currentTrack?.videoId,
				});
			}
		} else {
			playerService.pause();
		}
	}, [state.isPlaying, state.currentTrack, playerService]);

	// Handle volume changes
	useEffect(() => {
		const config = getConfigService();
		config.set('volume', state.volume);
	}, [state.volume]);

	// Handle track completion
	const autoAdvanceRef = useRef(false);
	useEffect(() => {
		// Guard: Don't advance if duration not loaded or not currently playing
		if (state.duration <= 0 || !state.isPlaying) {
			autoAdvanceRef.current = false;
			return;
		}

		// Guard: Only advance if near the very end of the track (within 2s)
		if (state.progress < state.duration - 2) {
			autoAdvanceRef.current = false;
			return;
		}

		if (state.repeat === 'one') {
			dispatch({category: 'SEEK', position: 0});
			return;
		}

		const hasNextTrack =
			state.queue.length > 0 &&
			(state.repeat === 'all' ||
				state.queuePosition < state.queue.length - 1 ||
				(state.shuffle && state.queue.length > 1));

		if (!hasNextTrack) {
			return;
		}

		const now = Date.now();
		if (now - lastAutoNextRef.current < 1500) {
			return;
		}

		if (!autoAdvanceRef.current) {
			autoAdvanceRef.current = true;
			lastAutoNextRef.current = now;
			dispatch({category: 'NEXT'});
		}
	}, [
		state.duration,
		state.progress,
		state.isPlaying,
		state.repeat,
		state.queue.length,
		state.queuePosition,
		state.shuffle,
		dispatch,
	]);

	// Smart autoplay: fetch suggestions when near end of queue
	const fetchedForRef = useRef<string | null>(null);
	const isFetchingAutoplayRef = useRef(false);
	useEffect(() => {
		if (!state.autoplay || !state.currentTrack || !state.isPlaying) {
			return;
		}

		if (state.repeat === 'all' || (state.shuffle && state.queue.length > 1)) {
			return;
		}

		// In radio mode, fetch more aggressively (when ≤15 tracks ahead)
		// In regular autoplay, only fetch when ≤5 tracks ahead
		const tracksAheadThreshold = state.radioIsActive ? 15 : 5;
		const tracksAhead = state.queue.length - state.queuePosition - 1;
		if (tracksAhead > tracksAheadThreshold) return;

		if (
			fetchedForRef.current === state.currentTrack.videoId ||
			isFetchingAutoplayRef.current
		) {
			return;
		}

		const trackId = state.currentTrack.videoId;
		const trackTitle = state.currentTrack.title;
		isFetchingAutoplayRef.current = true;
		fetchedForRef.current = trackId;

		const fetchPromise =
			state.radioIsActive && state.radioSeed
				? getRadioService().fetchMoreTracks(state.radioSeed)
				: musicService.getSuggestions(trackId);

		fetchPromise
			.then(tracks => {
				for (const track of tracks) {
					dispatch({category: 'ADD_TO_QUEUE', track});
				}

				logger.info(
					state.radioIsActive ? 'Radio' : 'Autoplay',
					state.radioIsActive
						? 'Radio: added tracks'
						: 'Autoplay: added suggestions',
					{
						count: tracks.length,
						basedOn: trackTitle,
						radioMode: state.radioIsActive,
					},
				);

				// Check if we need to advance immediately (if we were stuck at the end)
				// We check if the queue position was at the end of the *previous* queue length
				// (current queue length - new suggestions length - 1)
				const wasAtEndOfQueue = state.queuePosition >= state.queue.length - 1;

				// Relaxed check: if we are near the end of the track (within 5s), trigger NEXT.
				// We do NOT check !state.isPlaying because mpv might be in a weird state
				// (idle but suppressed pause) if the track actually finished.
				if (wasAtEndOfQueue && state.progress >= state.duration - 5) {
					logger.info(
						'PlayerManager',
						'Autoplay: resuming playback via freshly added suggestions',
						{
							progress: state.progress,
							duration: state.duration,
						},
					);
					dispatch({category: 'NEXT'});
				}
			})
			.catch((error: unknown) => {
				isFetchingAutoplayRef.current = false;
				fetchedForRef.current = null;
				logger.warn('PlayerManager', 'Autoplay: failed to fetch suggestions', {
					error: error instanceof Error ? error.message : String(error),
				});
			})
			.finally(() => {
				isFetchingAutoplayRef.current = false;
			});
	}, [
		state.autoplay,
		state.currentTrack,
		state.isPlaying,
		state.repeat,
		state.shuffle,
		state.queue.length,
		state.queuePosition,
		state.radioIsActive,
		state.radioSeed,
		musicService,
		dispatch,
		state.progress,
		state.duration,
	]);

	return null;
}

export function PlayerProvider({children}: {children: ReactNode}) {
	const [state, dispatch] = useReducer(playerReducer, initialState);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isInitializedRef = useRef(false);

	// Load persisted state on mount
	useEffect(() => {
		const config = getConfigService();
		const defaultVolume = config.get('volume');
		void loadPlayerState().then(persistedState => {
			// Mark as initialized after attempting load (even if no saved state)
			isInitializedRef.current = true;

			if (persistedState) {
				logger.info('PlayerProvider', 'Restoring persisted state', {
					hasTrack: !!persistedState.currentTrack,
					queueLength: persistedState.queue.length,
					progress: persistedState.progress,
				});

				// Restore all state atomically with single dispatch
				// Volume is set separately via PlayerManager; we keep the configured default here
				dispatch({
					category: 'RESTORE_STATE',
					currentTrack: persistedState.currentTrack,
					queue: persistedState.queue,
					queuePosition: persistedState.queuePosition,
					progress: persistedState.progress,
					volume: defaultVolume,
					shuffle: persistedState.shuffle,
					repeat: persistedState.repeat,
					autoplay: persistedState.autoplay ?? true,
				});
			}
		});
	}, [dispatch]); // Run only once on mount

	// Save state on changes (debounced for progress updates)
	useEffect(() => {
		// Don't save during initial load
		if (!isInitializedRef.current) return;

		// Debounce saves (every 5 seconds for progress, immediate for other changes)
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(
			() => {
				void savePlayerState({
					currentTrack: state.currentTrack,
					queue: state.queue,
					queuePosition: state.queuePosition,
					progress: state.progress,
					volume: state.volume,
					shuffle: state.shuffle,
					repeat: state.repeat,
					autoplay: state.autoplay,
				});
			},
			// Debounce progress updates (5s), immediate for track/queue changes
			state.progress > 0 ? 5000 : 0,
		);

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [
		state.currentTrack,
		state.queue,
		state.queuePosition,
		state.progress,
		state.volume,
		state.shuffle,
		state.repeat,
		state.autoplay,
	]);

	// Save immediately on unmount/quit
	useEffect(() => {
		const stateRef = {current: state}; // Capture state in ref for exit handler
		const isInitialized = isInitializedRef.current;

		const handleExit = () => {
			// Only save if initialized (has attempted to load or restore state)
			if (!isInitialized) return;

			const currentState = stateRef.current;
			void savePlayerState({
				currentTrack: currentState.currentTrack,
				queue: currentState.queue,
				queuePosition: currentState.queuePosition,
				progress: currentState.progress,
				volume: currentState.volume,
				shuffle: currentState.shuffle,
				repeat: currentState.repeat,
				autoplay: currentState.autoplay,
			});
		};

		process.on('beforeExit', handleExit);
		process.on('SIGINT', handleExit);
		process.on('SIGTERM', handleExit);

		// Update ref when state changes
		stateRef.current = state;

		return () => {
			handleExit(); // Save on component unmount
			process.off('beforeExit', handleExit);
			process.off('SIGINT', handleExit);
			process.off('SIGTERM', handleExit);
		};
		// Only register handlers once, update via ref
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Web streaming: Broadcast state changes to connected clients
	useEffect(() => {
		// Initialize web streaming service and set up command handler
		const streamingService = getWebStreamingService();

		// Set up handler for incoming commands from web clients
		const unsubscribe = streamingService.onMessage(message => {
			if (message.type === 'command') {
				dispatch(message.action);
			}
		});

		return () => {
			unsubscribe();
		};
	}, [dispatch]);

	// Broadcast state changes to web clients
	useEffect(() => {
		const webServerManager = getWebServerManager();
		if (webServerManager.isServerRunning()) {
			const streamingService = getWebStreamingService();
			streamingService.onStateChange(state);
		}
	}, [state]);

	const actions = useMemo(
		() => ({
			play: (track: Track) => {
				logger.info('PlayerProvider', 'play() action dispatched', {
					title: track.title,
					videoId: track.videoId,
				});
				dispatch({category: 'PLAY', track});
			},
			pause: () => dispatch({category: 'PAUSE'}),
			resume: () => dispatch({category: 'RESUME'}),
			stop: () => dispatch({category: 'STOP'}),
			next: () => dispatch({category: 'NEXT'}),
			previous: () => dispatch({category: 'PREVIOUS'}),
			seek: (position: number) => dispatch({category: 'SEEK', position}),
			setVolume: (volume: number) => dispatch({category: 'SET_VOLUME', volume}),
			volumeUp: () => {
				logger.debug('PlayerActions', 'volumeUp called');
				dispatch({category: 'VOLUME_UP'});
			},
			volumeDown: () => {
				logger.debug('PlayerActions', 'volumeDown called');
				dispatch({category: 'VOLUME_DOWN'});
			},
			volumeFineUp: () => {
				dispatch({category: 'VOLUME_FINE_UP'});
			},
			volumeFineDown: () => {
				dispatch({category: 'VOLUME_FINE_DOWN'});
			},
			toggleShuffle: () => dispatch({category: 'TOGGLE_SHUFFLE'}),
			toggleRepeat: () => dispatch({category: 'TOGGLE_REPEAT'}),
			toggleAutoplay: () => dispatch({category: 'TOGGLE_AUTOPLAY'}),
			setQueue: (queue: Track[]) => dispatch({category: 'SET_QUEUE', queue}),
			addToQueue: (track: Track) => dispatch({category: 'ADD_TO_QUEUE', track}),
			removeFromQueue: (index: number) =>
				dispatch({category: 'REMOVE_FROM_QUEUE', index}),
			clearQueue: () => dispatch({category: 'CLEAR_QUEUE'}),
			setQueuePosition: (position: number) =>
				dispatch({category: 'SET_QUEUE_POSITION', position}),
			setSpeed: (speed: number) => dispatch({category: 'SET_SPEED', speed}),
			speedUp: () => {
				dispatch({category: 'SET_SPEED', speed: (state.speed ?? 1.0) + 0.25});
			},
			speedDown: () => {
				dispatch({category: 'SET_SPEED', speed: (state.speed ?? 1.0) - 0.25});
			},
			setABLoop: (a: number | null, b: number | null) => {
				dispatch({category: 'SET_AB_LOOP', a, b});
			},
			startRadio: (seed: RadioSeed) => {
				dispatch({category: 'START_RADIO', seed});
			},
			stopRadio: () => {
				dispatch({category: 'STOP_RADIO'});
			},
		}),
		[dispatch, state.speed], // dispatch is stable, but include for correctness
	);

	const contextValue = useMemo(
		() => ({
			state,
			dispatch, // Needed by PlayerManager
			...actions,
		}),
		[state, dispatch, actions],
	);

	return (
		<PlayerContext.Provider value={contextValue}>
			<PlayerManager />
			{children}
		</PlayerContext.Provider>
	);
}

export function usePlayer(): PlayerContextValue {
	const context = useContext(PlayerContext);

	if (!context) {
		throw new Error('usePlayer must be used within PlayerProvider');
	}

	return context;
}
