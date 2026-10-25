// Web server manager - manages the WebSocket server lifecycle
import type {WebServerConfig, WebServerOptions} from '../../types/web.types.ts';
import type {PlayerState, PlayerAction} from '../../types/player.types.ts';
import {getWebSocketServer} from './websocket.server.ts';
import {getWebStreamingService} from './web-streaming.service.ts';
import {getConfigService} from '../config/config.service.ts';
import {getImportService} from '../import/import.service.ts';
import {getPlayerService} from '../player/player.service.ts';
import {getSearchService} from '../youtube-music/search.service.ts';
import {logger} from '../logger/logger.service.ts';
import {resolveTrackPlayUrl} from '../../utils/local-track.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import type {RadioStation} from '../../types/radio-station.types.ts';
import {
	getLiveStreams,
	toRadioStation,
} from '../live-streams/live-streams.service.ts';
import {
	loadBrowseStations,
	loadSearchStations,
	flattenRadioStations,
} from '../radio-stations/radio-stations.service.ts';
import {getFavoritesManager} from '../favorites/favorites.service.ts';
import {
	defaultWebAllowedOrigins,
	filterWebRemoteConfig,
} from './web-config-policy.ts';

class WebServerManager {
	private config: WebServerConfig;
	private isRunning = false;
	private cleanupHooks: Array<() => void> = [];
	private webOnlyMode = false;

	// Internal state for web-only mode (when PlayerProvider is not mounted)
	private internalState: PlayerState = {
		currentTrack: null,
		isPlaying: false,
		volume: 70,
		speed: 1,
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
		explicitQueueLength: 0,
		playbackMode: 'youtube',
		currentStation: null,
		streamNowPlaying: null,
		mediaSource: null,
	};

	constructor() {
		// Load config or use defaults
		const configService = getConfigService();
		const savedConfig = configService.get('webServer');

		this.config = savedConfig ?? {
			enabled: false,
			host: 'localhost',
			port: 8080,
			enableCors: true,
			allowedOrigins: defaultWebAllowedOrigins(8080),
			auth: {enabled: false},
		};

		// Save default config if not present
		if (!savedConfig) {
			configService.set('webServer', this.config);
		}

		// Initialize volume from config
		this.internalState.volume = configService.get('volume') ?? 70;
	}

	/**
	 * Start the web server
	 */
	async start(options?: WebServerOptions): Promise<void> {
		if (this.isRunning) {
			logger.warn('WebServerManager', 'Server already running');
			return;
		}

		// Apply CLI options (copy auth too so the stored config is not mutated)
		const finalConfig = {...this.config, auth: {...this.config.auth}};

		if (options) {
			if (options.host !== undefined) {
				finalConfig.host = options.host;
			}
			if (options.port !== undefined) {
				finalConfig.port = options.port;
			}
			if (options.auth !== undefined) {
				finalConfig.auth.enabled = true;
				finalConfig.auth.token = options.auth;
			}
			if (options.webOnly !== undefined) {
				this.webOnlyMode = options.webOnly;
			}
		}

		if (
			finalConfig.allowedOrigins.length === 0 ||
			(finalConfig.allowedOrigins.length === 1 &&
				finalConfig.allowedOrigins[0] === '*')
		) {
			finalConfig.allowedOrigins = defaultWebAllowedOrigins(finalConfig.port);
		}

		logger.info('WebServerManager', 'Starting web server', finalConfig);

		try {
			const wsServer = getWebSocketServer();

			// Set up import handler
			const cleanupImport = this.setupImportHandler();
			this.cleanupHooks.push(cleanupImport);

			// Start the server
			await wsServer.start({
				config: finalConfig,
				onCommand: this.webOnlyMode ? this.handleCommand.bind(this) : undefined,
				onImportRequest: this.handleImportRequest.bind(this),
				onSearchRequest: this.handleSearchRequest.bind(this),
				onConfigUpdate: this.handleConfigUpdate.bind(this),
				onLiveStreamsRequest: this.handleLiveStreamsRequest.bind(this),
				onRadioSearchRequest: this.handleRadioSearchRequest.bind(this),
				onFavoritesRequest: this.handleFavoritesRequest.bind(this),
				onFavoritesToggle: this.handleFavoritesToggle.bind(this),
			});

			this.isRunning = true;

			// Set up graceful shutdown
			this.setupShutdownHooks();
		} catch (error) {
			logger.error('WebServerManager', 'Failed to start server', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Stop the web server
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		logger.info('WebServerManager', 'Stopping web server');

		// Clean up hooks
		for (const cleanup of this.cleanupHooks) {
			cleanup();
		}
		this.cleanupHooks = [];

		// Stop the WebSocket server
		const wsServer = getWebSocketServer();
		await wsServer.stop();

		this.isRunning = false;
	}

	/**
	 * Set up import progress handler
	 */
	private setupImportHandler(): () => void {
		const importService = getImportService();
		const streamingService = getWebStreamingService();

		const unsubscribe = importService.onProgress(progress => {
			streamingService.onImportProgress(progress);
		});

		return unsubscribe;
	}

	/**
	 * Handle command from web client
	 */
	private playTrackMedia(track: Track): void {
		const config = getConfigService();
		const resolved = resolveTrackPlayUrl(track, {
			preferLocal: config.get('preferLocalPlayback') ?? true,
			downloadDirectory: config.get('downloadDirectory'),
			downloadFormat: config.get('downloadFormat') ?? 'mp3',
		});
		this.internalState.mediaSource = resolved.source;
		void getPlayerService().play(resolved.url, {
			volume: this.internalState.volume,
			volumeFadeDuration: config.get('volumeFadeDuration'),
			trackId: track.videoId,
		});
	}

	private handleCommand(action: PlayerAction): void {
		logger.debug('WebServerManager', 'Executing command from client', {action});

		const playerService = getPlayerService();

		// Execute command and update internal state
		switch (action.category) {
			case 'PLAY': {
				if (action.track) {
					this.internalState.currentTrack = action.track;
					this.internalState.isPlaying = true;
					this.internalState.progress = 0;
					this.internalState.error = null;

					this.playTrackMedia(action.track);
				}
				break;
			}
			case 'PAUSE':
				this.internalState.isPlaying = false;
				void playerService.pause();
				break;
			case 'RESUME':
				this.internalState.isPlaying = true;
				void playerService.resume();
				break;
			case 'STOP':
				this.internalState.isPlaying = false;
				this.internalState.progress = 0;
				this.internalState.currentTrack = null;
				this.internalState.playbackMode = 'youtube';
				this.internalState.currentStation = null;
				this.internalState.streamNowPlaying = null;
				playerService.stop();
				break;
			case 'PLAY_STREAM': {
				if (action.station) {
					const station = action.station;
					this.internalState.playbackMode = 'stream';
					this.internalState.currentStation = station;
					this.internalState.streamNowPlaying = null;
					this.internalState.mediaSource = null;
					this.internalState.currentTrack = null;
					this.internalState.queue = [];
					this.internalState.queuePosition = 0;
					this.internalState.explicitQueueLength = 0;
					this.internalState.radioIsActive = false;
					this.internalState.autoplay = false;
					this.internalState.isPlaying = true;
					this.internalState.progress = 0;
					this.internalState.error = null;

					const config = getConfigService();
					void playerService.play(station.streamUrl, {
						volume: this.internalState.volume,
						trackId: station.id,
						audioNormalization: config.get('audioNormalization') ?? false,
						proxy: config.get('proxy'),
						gaplessPlayback: config.get('gaplessPlayback') ?? true,
						crossfadeDuration: config.get('crossfadeDuration') ?? 0,
						equalizerPreset: config.get('equalizerPreset') ?? 'flat',
						volumeFadeDuration: config.get('volumeFadeDuration') ?? 0,
					});
				}
				break;
			}
			case 'NEXT': {
				if (this.internalState.queue.length === 0) break;

				if (this.internalState.shuffle && this.internalState.queue.length > 1) {
					let randomIndex: number;
					do {
						randomIndex = Math.floor(
							Math.random() * this.internalState.queue.length,
						);
					} while (randomIndex === this.internalState.queuePosition);

					this.internalState.queuePosition = randomIndex;
				} else {
					const nextPosition = this.internalState.queuePosition + 1;
					if (nextPosition >= this.internalState.queue.length) {
						if (this.internalState.repeat === 'all') {
							this.internalState.queuePosition = 0;
						} else {
							break;
						}
					} else {
						this.internalState.queuePosition = nextPosition;
					}
				}

				this.internalState.currentTrack =
					this.internalState.queue[this.internalState.queuePosition] ?? null;
				this.internalState.isPlaying = true;
				this.internalState.progress = 0;

				if (this.internalState.currentTrack) {
					this.playTrackMedia(this.internalState.currentTrack);
				}
				break;
			}
			case 'PREVIOUS': {
				const prevPosition = this.internalState.queuePosition - 1;
				if (prevPosition < 0) break;
				if (this.internalState.progress > 3) {
					this.internalState.progress = 0;
					break;
				}
				this.internalState.queuePosition = prevPosition;
				this.internalState.currentTrack =
					this.internalState.queue[prevPosition] ?? null;
				this.internalState.progress = 0;
				break;
			}
			case 'SEEK':
				if (action.position !== undefined) {
					const position = Math.max(
						0,
						Math.min(action.position, this.internalState.duration),
					);
					this.internalState.progress = position;
					playerService.seek(position);
				}
				break;
			case 'SET_VOLUME':
				if (action.volume !== undefined) {
					this.internalState.volume = Math.max(0, Math.min(100, action.volume));
					playerService.setVolume(this.internalState.volume);
				}
				break;
			case 'VOLUME_UP':
				this.internalState.volume = Math.min(
					100,
					this.internalState.volume + 10,
				);
				playerService.setVolume(this.internalState.volume);
				break;
			case 'VOLUME_DOWN':
				this.internalState.volume = Math.max(0, this.internalState.volume - 10);
				playerService.setVolume(this.internalState.volume);
				break;
			case 'VOLUME_FINE_UP':
				this.internalState.volume = Math.min(
					100,
					this.internalState.volume + 1,
				);
				playerService.setVolume(this.internalState.volume);
				break;
			case 'VOLUME_FINE_DOWN':
				this.internalState.volume = Math.max(0, this.internalState.volume - 1);
				playerService.setVolume(this.internalState.volume);
				break;
			case 'TOGGLE_SHUFFLE':
				this.internalState.shuffle = !this.internalState.shuffle;
				break;
			case 'TOGGLE_REPEAT': {
				const repeatModes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
				const currentIndex = repeatModes.indexOf(this.internalState.repeat);
				this.internalState.repeat =
					repeatModes[(currentIndex + 1) % 3] ?? 'off';
				break;
			}
			case 'SET_QUEUE':
				if (action.queue) {
					this.internalState.queue = action.queue;
					this.internalState.queuePosition = 0;
				}
				break;
			case 'ADD_TO_QUEUE':
				if (action.track) {
					this.internalState.queue = [
						...this.internalState.queue,
						action.track,
					];
				}
				break;
			case 'REMOVE_FROM_QUEUE':
				if (action.index !== undefined) {
					const newQueue = [...this.internalState.queue];
					newQueue.splice(action.index, 1);
					this.internalState.queue = newQueue;
				}
				break;
			case 'CLEAR_QUEUE':
				this.internalState.queue = [];
				this.internalState.queuePosition = 0;
				this.internalState.isPlaying = false;
				break;
			case 'SET_QUEUE_POSITION':
				if (
					action.position >= 0 &&
					action.position < this.internalState.queue.length
				) {
					this.internalState.queuePosition = action.position;
					this.internalState.currentTrack =
						this.internalState.queue[action.position] ?? null;
					this.internalState.progress = 0;
				}
				break;
			case 'SET_SPEED':
				if (action.speed !== undefined) {
					const clampedSpeed = Math.max(0.25, Math.min(4.0, action.speed));
					this.internalState.speed = clampedSpeed;
					playerService.setSpeed(clampedSpeed);
				}
				break;
			case 'UPDATE_PROGRESS':
				if (action.progress !== undefined) {
					this.internalState.progress = Math.max(
						0,
						Math.min(
							action.progress,
							this.internalState.duration || action.progress,
						),
					);
				}
				break;
			case 'SET_DURATION':
				if (action.duration !== undefined) {
					this.internalState.duration = action.duration;
				}
				break;
			case 'SET_LOADING':
				if (action.loading !== undefined) {
					this.internalState.isLoading = action.loading;
				}
				break;
			case 'SET_ERROR':
				if (action.error !== undefined) {
					this.internalState.error = action.error;
					this.internalState.isLoading = false;
				}
				break;
			default:
				logger.debug('WebServerManager', 'Unhandled command category', {
					category: (action as {category: string}).category,
				});
		}

		// Broadcast updated state after command
		this.broadcastState();
	}

	/**
	 * Handle import request from web client
	 */
	private async handleImportRequest(
		source: 'spotify' | 'youtube',
		url: string,
		name?: string,
	): Promise<void> {
		logger.info('WebServerManager', 'Import request from client', {
			source,
			url,
			name,
		});

		try {
			const importService = getImportService();
			await importService.importPlaylist(source, url, name);
		} catch (error) {
			logger.error('WebServerManager', 'Import failed', {
				source,
				url,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Handle search request from web client
	 */
	private async handleSearchRequest(
		query: string,
		searchType: 'all' | 'songs' | 'artists' | 'albums' | 'playlists',
	): Promise<void> {
		logger.info('WebServerManager', 'Search request from client', {
			query,
			searchType,
		});

		try {
			const searchService = getSearchService();
			const response = await searchService.search(query, {type: searchType});

			const streamingService = getWebStreamingService();
			streamingService.broadcast({
				type: 'search-results',
				results: response.results,
			});
		} catch (error) {
			logger.error('WebServerManager', 'Search failed', {
				query,
				searchType,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Handle live streams list request from web client
	 */
	private handleLiveStreamsRequest(): void {
		try {
			const stations: RadioStation[] = getLiveStreams().map(entry =>
				toRadioStation(entry),
			);

			const streamingService = getWebStreamingService();
			streamingService.broadcast({
				type: 'live-streams-list',
				stations,
			});
		} catch (error) {
			logger.error('WebServerManager', 'Live streams request failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Handle radio station search/browse request from web client
	 */
	private async handleRadioSearchRequest(
		query: string,
		countrycode?: string,
	): Promise<void> {
		logger.info('WebServerManager', 'Radio search request from client', {
			query,
			countrycode,
		});

		try {
			const list = query.trim()
				? await loadSearchStations(query)
				: await loadBrowseStations({countrycode});
			const stations = flattenRadioStations(list);

			const streamingService = getWebStreamingService();
			streamingService.broadcast({
				type: 'radio-search-results',
				stations,
			});
		} catch (error) {
			logger.error('WebServerManager', 'Radio search failed', {
				query,
				countrycode,
				error: error instanceof Error ? error.message : String(error),
			});

			const streamingService = getWebStreamingService();
			streamingService.sendError(
				'Radio station search failed. Please try again.',
				'RADIO_SEARCH_FAILED',
			);
		}
	}

	/**
	 * Broadcast the current favorites list to web clients
	 */
	private async broadcastFavoritesList(): Promise<void> {
		const favorites = getFavoritesManager();
		await favorites.ensureLoaded();
		const streamingService = getWebStreamingService();
		streamingService.broadcast({
			type: 'favorites-list',
			tracks: favorites.getAllTracks(),
		});
	}

	/**
	 * Handle favorites list request from web client
	 */
	private handleFavoritesRequest(): void {
		void this.broadcastFavoritesList().catch(error => {
			logger.error('WebServerManager', 'Favorites request failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/**
	 * Handle favorite toggle (add/remove) from web client
	 */
	private handleFavoritesToggle(track: Track): void {
		void (async () => {
			try {
				const favorites = getFavoritesManager();
				await favorites.toggle(track);
				await this.broadcastFavoritesList();
			} catch (error) {
				logger.error('WebServerManager', 'Favorites toggle failed', {
					videoId: track.videoId,
					error: error instanceof Error ? error.message : String(error),
				});
				getWebStreamingService().sendError(
					'Failed to update favorites. Please try again.',
					'FAVORITES_TOGGLE_FAILED',
				);
			}
		})();
	}

	/**
	 * Handle config update from web client
	 */
	private handleConfigUpdate(config: Record<string, unknown>): void {
		const safeUpdates = filterWebRemoteConfig(config);
		logger.info('WebServerManager', 'Config update from client', {
			keys: Object.keys(safeUpdates),
		});

		try {
			const configService = getConfigService();

			for (const [key, value] of Object.entries(safeUpdates)) {
				configService.set(
					key as keyof import('../../types/config.types.ts').Config,
					value as never,
				);
			}

			// Broadcast updated config to all clients
			const streamingService = getWebStreamingService();
			streamingService.broadcast({
				type: 'config-update',
				config: safeUpdates as Record<string, unknown>,
			});
		} catch (error) {
			logger.error('WebServerManager', 'Config update failed', {
				config,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Update player state (call this when player state changes)
	 * This is called by PlayerProvider in normal mode to sync state
	 */
	updateState(state: PlayerState): void {
		if (!this.isRunning) return;

		// Update internal state to stay in sync
		this.internalState = {...state};

		const streamingService = getWebStreamingService();
		streamingService.onStateChange(state);
	}

	/**
	 * Broadcast current state to all connected clients
	 */
	private broadcastState(): void {
		if (!this.isRunning) return;

		const streamingService = getWebStreamingService();
		streamingService.onStateChange(this.internalState);
	}

	/**
	 * Get current internal state
	 */
	getState(): PlayerState {
		return {...this.internalState};
	}

	/**
	 * Set internal state directly (for sync from external sources)
	 */
	setState(state: Partial<PlayerState>): void {
		this.internalState = {...this.internalState, ...state};
		this.broadcastState();
	}

	/**
	 * Set up graceful shutdown hooks
	 */
	private setupShutdownHooks(): void {
		const shutdown = async () => {
			await this.stop();
		};
		// A SIGINT/SIGTERM listener disables Node's default exit, so the
		// process must exit itself once the server has stopped.
		const shutdownOnSignal = (signal: NodeJS.Signals) => {
			void shutdown().finally(() => {
				// Stop mpv before exiting so it is not orphaned (sync for Windows)
				getPlayerService().stop({sync: true});
				process.exit(signal === 'SIGINT' ? 130 : 143);
			});
		};

		process.on('beforeExit', shutdown);
		process.on('SIGINT', shutdownOnSignal);
		process.on('SIGTERM', shutdownOnSignal);

		this.cleanupHooks.push(() => {
			process.off('beforeExit', shutdown);
			process.off('SIGINT', shutdownOnSignal);
			process.off('SIGTERM', shutdownOnSignal);
		});
	}

	/**
	 * Check if server is running
	 */
	isServerRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Get server URL
	 */
	getServerUrl(): string {
		const wsServer = getWebSocketServer();
		return wsServer.getServerUrl();
	}

	/**
	 * Get server statistics
	 */
	getStats(): {
		running: boolean;
		url?: string;
		clients?: number;
	} {
		if (!this.isRunning) {
			return {running: false};
		}

		const streamingService = getWebStreamingService();
		const stats = streamingService.getStats();

		return {
			running: true,
			url: this.getServerUrl(),
			clients: stats.clients,
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<WebServerConfig>): void {
		this.config = {...this.config, ...config};

		const configService = getConfigService();
		configService.set('webServer', this.config);
	}

	/**
	 * Get current configuration
	 */
	getConfig(): WebServerConfig {
		return {...this.config};
	}
}

// Singleton instance
let webServerManagerInstance: WebServerManager | null = null;

export function getWebServerManager(): WebServerManager {
	if (!webServerManagerInstance) {
		webServerManagerInstance = new WebServerManager();
	}
	return webServerManagerInstance;
}
