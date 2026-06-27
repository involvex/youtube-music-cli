import process from 'node:process';
import type {Flags} from '../types/cli.types.ts';
import type {Track} from '../types/youtube-music.types.ts';
import {getConfigService} from '../services/config/config.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {getPlayerService} from '../services/player/player.service.ts';
import {ensurePlaybackDependencies} from '../services/player/dependency-check.service.ts';
import {loadPlayerState} from '../services/player-state/player-state.service.ts';
import {ImmersiveEngine} from './immersive-engine.ts';
import {
	addToQueue,
	advanceQueue,
	createInitialImmersiveState,
	previousQueue,
	setQueue,
	trackArtists,
	trackYouTubeUrl,
	type ImmersivePlayerState,
} from './state/queue-state.ts';
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

async function resolveInitialTrack(flags?: Flags): Promise<{
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
			startPlaying: Boolean(flags?.continue),
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
): Promise<boolean> {
	const bgState = config.getBackgroundPlaybackState();
	if (!bgState.enabled || !bgState.ipcPath) {
		return false;
	}

	const videoId = bgState.currentUrl.match(/[?&]v=([^&]+)/)?.[1];

	try {
		await playerService.reattach(bgState.ipcPath, {
			trackId: videoId,
			currentUrl: bgState.currentUrl,
		});
		config.clearBackgroundPlaybackState();
		state.isPlaying = true;
		return true;
	} catch {
		config.clearBackgroundPlaybackState();
		return false;
	}
}

async function playTrackAtIndex(
	state: ImmersivePlayerState,
	index: number,
): Promise<void> {
	const track = state.queue[index];
	if (!track) {
		return;
	}

	state.queueIndex = index;
	state.currentTrack = track;
	state.isPlaying = true;

	const playerService = getPlayerService();
	const config = getConfigService();
	const trackUrl = trackYouTubeUrl(track);

	const bgState = config.getBackgroundPlaybackState();
	if (bgState.enabled && bgState.ipcPath && bgState.currentUrl === trackUrl) {
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

	const title = track.title;
	const artist = trackArtists(track);
	updateTrayIcon(`${title} - ${artist}`);
	showTrackChangeToast(title, artist);
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
	const discoMode = options.discoMode ?? process.env.DISCO_MODE === 'true';

	const initialVolume = options.flags?.volume ?? config.get('volume');
	const state = createInitialImmersiveState({
		volume: initialVolume,
		isDiscoMode: discoMode,
	});

	playerService.setVolume(initialVolume);

	const {tracks, queueIndex, startPlaying, savedProgress, savedVolume} =
		await resolveInitialTrack(options.flags);
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

	const playCurrent = async (): Promise<void> => {
		if (!state.currentTrack) {
			return;
		}
		await playTrackAtIndex(state, state.queueIndex);
	};

	const togglePlayback = async (): Promise<void> => {
		const hasSession = playerService.hasActivePlaybackSession();

		if (hasSession && state.isPlaying) {
			playerService.pause();
			state.isPlaying = false;
			return;
		}

		if (hasSession && !state.isPlaying) {
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
			await playTrackAtIndex(state, state.queueIndex);
		} else {
			playerService.pause();
			state.isPlaying = false;
		}
	};

	const handlePrevious = async (): Promise<void> => {
		const track = previousQueue(state);
		if (track) {
			await playTrackAtIndex(state, state.queueIndex);
		}
	};

	playerService.onEvent(event => {
		if (event.duration !== undefined) {
			state.duration = event.duration;
		}

		if (event.timePos !== undefined) {
			state.currentTime = event.timePos;
		}

		if (event.eof) {
			eofTimestamp = Date.now();
			void handleNext();
		}

		if (event.paused !== undefined) {
			if (event.paused && Date.now() - eofTimestamp < 2000) {
				return;
			}
			state.isPlaying = !event.paused;
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

	process.on('exit', () => {
		unregisterGlobalHotkeys();
		playerService.stop();
	});

	engine = new ImmersiveEngine({
		discoMode: state.isDiscoMode,
		enableTray: true,
		enableNotifications: true,
		getState: () => state,
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
		onSearch: async query => {
			const response = await musicService.search(query, {
				type: 'songs',
				limit: 10,
			});
			const results = response.results
				.filter(result => result.type === 'song')
				.map(result => result.data as Track);

			if (results.length === 0) {
				return {tracks: [], message: 'No tracks found'};
			}

			return {tracks: results, message: null};
		},
		onSearchPlay: async tracks => {
			setQueue(state, tracks);
			await playTrackAtIndex(state, 0);
		},
		onAddToQueue: track => {
			addToQueue(state, track);
		},
	});

	await engine.start();

	if (state.currentTrack) {
		await tryReattachBackgroundPlayback(state, playerService, config);
	}

	if (startPlaying && state.currentTrack) {
		await playCurrent();
	}
}
