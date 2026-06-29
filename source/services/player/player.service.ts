// Audio playback service using mpv media player with IPC control
import {spawn, type ChildProcess} from 'node:child_process';
import {connect, type Socket} from 'node:net';
import {logger} from '../logger/logger.service.ts';
import {formatError, formatErrorData} from '../../utils/error.ts';
import type {EqualizerPreset} from '../../types/config.types.ts';
import {getConfigService} from '../config/config.service.ts';

export type PlayOptions = {
	volume?: number;
	audioNormalization?: boolean;
	proxy?: string;
	gaplessPlayback?: boolean;
	crossfadeDuration?: number;
	equalizerPreset?: EqualizerPreset;
	volumeFadeDuration?: number;
	duration?: number;
};

export type MpvArgsOptions = PlayOptions & {
	volume: number;
	subtitlesEnabled?: boolean;
};

export function buildMpvArgs(
	ipcPath: string,
	options: MpvArgsOptions,
): string[] {
	const gapless = options.gaplessPlayback ?? true;
	const crossfadeDuration = Math.max(0, options.crossfadeDuration ?? 0);
	const fadeDuration = Math.max(0, options.volumeFadeDuration ?? 0);
	const eqPreset = options.equalizerPreset ?? 'flat';
	const audioFilters: string[] = [];

	if (options.audioNormalization) {
		audioFilters.push('dynaudnorm');
	}

	if (fadeDuration > 0) {
		audioFilters.push(`afade=t=in:st=0:d=${fadeDuration}`);
		if (options.duration !== undefined && options.duration > 0) {
			const st = Math.max(0, options.duration - fadeDuration);
			audioFilters.push(`afade=t=out:st=${st}:d=${fadeDuration}`);
		}
	}

	if (crossfadeDuration > 0) {
		audioFilters.push(`acrossfade=d=${crossfadeDuration}`);
	}

	const presetFilters = EQUALIZER_PRESET_FILTERS[eqPreset] ?? [];
	if (presetFilters.length > 0) {
		audioFilters.push(...presetFilters);
	}

	// URL is NOT passed as a CLI arg — it's sent via IPC loadfile after
	// the socket connects. This avoids a race condition where the IPC
	// handshake interferes with mpv's yt-dlp URL resolution.
	const mpvArgs = [
		'--no-video',
		'--no-terminal',
		`--volume=${options.volume}`,
		'--no-audio-display',
		'--really-quiet',
		'--msg-level=all=error',
		`--input-ipc-server=${ipcPath}`,
		'--idle=yes',
		'--cache=yes',
		'--cache-secs=30',
		'--network-timeout=10',
		`--gapless-audio=${gapless ? 'yes' : 'no'}`,
	];

	if (audioFilters.length > 0) {
		mpvArgs.push(`--af=${audioFilters.join(',')}`);
	}

	if (options.proxy) {
		mpvArgs.push(`--http-proxy=${options.proxy}`);
	}

	if (options.subtitlesEnabled) {
		mpvArgs.push('--slang=en', '--sub-scale=1.3');
	}

	return mpvArgs;
}

const EQUALIZER_PRESET_FILTERS: Record<EqualizerPreset, string[]> = {
	flat: [],
	bass_boost: ['equalizer=f=60:width_type=o:width=2:g=5'],
	vocal: ['equalizer=f=2500:width_type=o:width=2:g=3'],
	bright: [
		'equalizer=f=4000:width_type=o:width=2:g=3',
		'equalizer=f=8000:width_type=o:width=2:g=2',
	],
	warm: [
		'equalizer=f=100:width_type=o:width=2:g=4',
		'equalizer=f=250:width_type=o:width=2:g=2',
	],
};

export type PlayerEventCallback = (event: {
	timePos?: number;
	duration?: number;
	paused?: boolean;
	eof?: boolean;
	subtitle?: string | null;
}) => void;

export function isValidIpcPipePath(
	pipePath: string | null | undefined,
): pipePath is string {
	if (!pipePath || typeof pipePath !== 'string') {
		return false;
	}

	const trimmed = pipePath.trim();
	if (!trimmed) {
		return false;
	}

	if (process.platform === 'win32') {
		return (
			trimmed.startsWith('\\\\.\\pipe\\') || trimmed.startsWith('//./pipe/')
		);
	}

	return trimmed.startsWith('/');
}

export function normalizeIpcPipePath(pipePath: string): string {
	const trimmed = pipePath.trim();
	if (!trimmed) {
		throw new Error('IPC pipe path is empty');
	}

	if (process.platform === 'win32') {
		if (trimmed.startsWith('//./pipe/')) {
			return `\\\\.\\pipe\\${trimmed.slice('//./pipe/'.length).replace(/\//g, '\\')}`;
		}

		if (!trimmed.startsWith('\\\\.\\pipe\\')) {
			throw new Error(`Invalid Windows IPC pipe path: ${trimmed}`);
		}

		return trimmed;
	}

	return trimmed;
}

export function connectToMpvIpc(pipePath: string): Socket {
	const normalized = normalizeIpcPipePath(pipePath);

	if (process.platform === 'win32') {
		return connect({path: normalized});
	}

	return connect(normalized);
}

class PlayerService {
	private static instance: PlayerService;
	private mpvProcess: ChildProcess | null = null;
	private ipcSocket: Socket | null = null;
	private ipcPath: string | null = null;
	private currentUrl: string | null = null;
	private currentVolume = 70;
	private isPlaying = false;
	private eventCallback: PlayerEventCallback | null = null;
	private ipcConnectRetries = 0;
	private readonly maxIpcRetries = 10;
	private ipcConnectGeneration = 0;
	private pendingIpcTimers: ReturnType<typeof setTimeout>[] = [];
	private currentTrackId: string | null = null; // Track currently playing
	private playSessionId = 0; // Incremented per play() call for unique IPC paths
	private playGeneration = 0; // Invalidates stale play() promises when stop() kills mpv
	private lastVolumeChangeTimestamp = 0; // For correlating volume changes with pause events

	private constructor() {}

	static getInstance(): PlayerService {
		if (!PlayerService.instance) {
			PlayerService.instance = new PlayerService();
		}
		return PlayerService.instance;
	}

	getCurrentTrackId(): string | null {
		return this.currentTrackId;
	}

	/**
	 * Register callback for player events (time position, duration updates)
	 */
	onEvent(callback: PlayerEventCallback): void {
		this.eventCallback = callback;
	}

	/**
	 * Generate IPC socket path based on platform, unique per play session
	 */
	private getIpcPath(): string {
		if (process.platform === 'win32') {
			// Windows named pipe
			return `\\\\.\\pipe\\mpvsocket-${process.pid}-${this.playSessionId}`;
		} else {
			// Unix domain socket
			return `/tmp/mpvsocket-${process.pid}-${this.playSessionId}`;
		}
	}

	private getMpvCommand(): string {
		const configuredPath = process.env['MPV_PATH']?.trim();
		if (configuredPath) {
			return configuredPath;
		}

		return process.platform === 'win32' ? 'mpv.exe' : 'mpv';
	}

	private invalidateIpcConnect(): void {
		this.ipcConnectGeneration++;
		for (const timer of this.pendingIpcTimers) {
			clearTimeout(timer);
		}

		this.pendingIpcTimers = [];
		this.ipcConnectRetries = 0;
	}

	private scheduleIpcTimer(
		delayMs: number,
		generation: number,
		fn: () => void,
	): void {
		const timer = setTimeout(() => {
			this.pendingIpcTimers = this.pendingIpcTimers.filter(
				pendingTimer => pendingTimer !== timer,
			);
			if (generation !== this.ipcConnectGeneration) {
				return;
			}

			fn();
		}, delayMs);
		this.pendingIpcTimers.push(timer);
	}

	private destroyIpcSocket(): void {
		if (!this.ipcSocket || this.ipcSocket.destroyed) {
			this.ipcSocket = null;
			return;
		}

		this.ipcSocket.removeAllListeners();
		this.ipcSocket.destroy();
		this.ipcSocket = null;
	}

	/**
	 * Connect to mpv IPC socket and optionally load a URL via loadfile
	 */
	private async connectIpc(urlToLoad?: string): Promise<void> {
		if (!isValidIpcPipePath(this.ipcPath)) {
			throw new Error('IPC path not set');
		}

		const pipePath = normalizeIpcPipePath(this.ipcPath);
		const generation = this.ipcConnectGeneration;
		let settled = false;

		return new Promise<void>((resolve, reject) => {
			const isStale = () => generation !== this.ipcConnectGeneration;

			const abortIfStale = (): boolean => {
				if (!settled && isStale()) {
					settled = true;
					reject(new Error('IPC connection aborted'));
					return true;
				}

				return false;
			};

			const rejectOnce = (error: Error) => {
				if (settled) {
					return;
				}

				settled = true;
				reject(error);
			};

			const scheduleRetry = () => {
				if (abortIfStale()) {
					return;
				}

				const maxRetries =
					process.platform === 'win32'
						? this.maxIpcRetries * 2
						: this.maxIpcRetries;
				if (this.ipcConnectRetries < maxRetries) {
					this.ipcConnectRetries++;
					this.scheduleIpcTimer(
						process.platform === 'win32' ? 250 : 100,
						generation,
						attemptConnect,
					);
					return;
				}

				rejectOnce(
					new Error(
						`Failed to connect to IPC socket after ${maxRetries} attempts`,
					),
				);
			};

			const attemptConnect = () => {
				if (abortIfStale()) {
					return;
				}

				if (!isValidIpcPipePath(this.ipcPath)) {
					rejectOnce(new Error('IPC path not set'));
					return;
				}

				logger.debug('PlayerService', 'Attempting IPC connection', {
					path: pipePath,
					attempt: this.ipcConnectRetries + 1,
				});

				this.destroyIpcSocket();

				let socket: Socket;
				try {
					socket = connectToMpvIpc(pipePath);
				} catch (error) {
					logger.debug('PlayerService', 'IPC synchronous connect failure', {
						error: formatError(error),
						attempt: this.ipcConnectRetries + 1,
					});
					scheduleRetry();
					return;
				}

				this.ipcSocket = socket;

				socket.on('connect', () => {
					if (abortIfStale()) {
						socket.destroy();
						return;
					}

					logger.info('PlayerService', 'IPC socket connected');
					this.ipcConnectRetries = 0;

					// Request property observations
					this.sendIpcCommand(['observe_property', 1, 'time-pos']);
					this.sendIpcCommand(['observe_property', 2, 'duration']);
					this.sendIpcCommand(['observe_property', 3, 'pause']);
					this.sendIpcCommand(['observe_property', 4, 'eof-reached']);

					// Observe subtitles if enabled
					const config = getConfigService();
					if (config.get('subtitlesEnabled')) {
						this.sendIpcCommand(['observe_property', 5, 'sub-text']);
					}

					// Load the URL via IPC after socket is connected.
					// This ensures mpv is fully ready before we ask it to
					// resolve a YouTube URL through yt-dlp.
					if (urlToLoad) {
						try {
							const parsed = new URL(urlToLoad);
							logger.info('PlayerService', 'Loading URL via IPC loadfile', {
								url: `${parsed.origin}${parsed.pathname}`,
							});
						} catch {
							logger.info('PlayerService', 'Loading URL via IPC loadfile');
						}
						this.sendIpcCommand(['loadfile', urlToLoad]);
					}

					settled = true;
					resolve();
				});

				socket.on('data', (data: Buffer) => {
					this.handleIpcMessage(data.toString());
				});

				socket.on('error', (err: Error) => {
					logger.debug('PlayerService', 'IPC socket error', {
						error: formatError(err),
						attempt: this.ipcConnectRetries + 1,
					});

					if (this.ipcSocket === socket) {
						this.destroyIpcSocket();
					}

					scheduleRetry();
				});

				socket.on('close', () => {
					logger.debug('PlayerService', 'IPC socket closed');
					if (this.ipcSocket === socket) {
						this.ipcSocket = null;
					}
				});
			};

			attemptConnect();
		});
	}

	/**
	 * Send command to mpv via IPC
	 */
	private sendIpcCommand(command: unknown[]): void {
		if (!this.ipcSocket || this.ipcSocket.destroyed) {
			logger.warn(
				'PlayerService',
				'Cannot send IPC command: socket not connected',
			);
			return;
		}

		const message = JSON.stringify({command}) + '\n';
		this.ipcSocket.write(message);

		logger.debug('PlayerService', 'Sent IPC command', {
			command: command[0],
		});
	}

	/**
	 * Handle IPC message from mpv
	 */
	private handleIpcMessage(data: string): void {
		const lines = data.trim().split('\n');

		for (const line of lines) {
			try {
				const message = JSON.parse(line);

				if (message.event === 'property-change') {
					this.handlePropertyChange(message);
				} else if (message.error !== 'success' && message.error) {
					logger.warn('PlayerService', 'IPC error response', {
						error: message.error,
					});
				}
			} catch (err) {
				logger.debug('PlayerService', 'Failed to parse IPC message', {
					data: line,
					error: formatError(err),
				});
			}
		}
	}

	/**
	 * Handle property change events from mpv
	 */
	private handlePropertyChange(message: {name: string; data: unknown}): void {
		if (!this.eventCallback) return;

		const event: {
			timePos?: number;
			duration?: number;
			paused?: boolean;
			eof?: boolean;
			subtitle?: string | null;
		} = {};

		switch (message.name) {
			case 'time-pos':
				event.timePos = message.data as number;
				break;

			case 'duration':
				event.duration = message.data as number;
				break;

			case 'pause': {
				event.paused = message.data as boolean;
				// Check if this pause occurred shortly after a volume change
				const timeSinceVolumeChange =
					Date.now() - this.lastVolumeChangeTimestamp;
				const isRecentVolumeChange = timeSinceVolumeChange < 1000; // within 1 second
				logger.debug('PlayerService', 'Pause state changed', {
					paused: event.paused,
					currentVolume: this.currentVolume,
					isPlaying: this.isPlaying,
					ipcSocketConnected: Boolean(
						this.ipcSocket && !this.ipcSocket.destroyed,
					),
					timeSinceVolumeChangeMs: timeSinceVolumeChange,
					isRecentVolumeChange,
					stack: new Error().stack,
				});
				break;
			}

			case 'eof-reached':
				event.eof = message.data as boolean;
				if (event.eof) {
					this.isPlaying = false;
					logger.info('PlayerService', 'End of file reached');
				}
				break;

			case 'sub-text':
				if (typeof message.data === 'string' && message.data.trim()) {
					event.subtitle = message.data;
				} else {
					event.subtitle = null;
				}
				break;

			default:
				// Log any other property changes for investigation
				logger.debug('PlayerService', 'Other property change', {
					property: message.name,
					data: message.data,
					currentVolume: this.currentVolume,
					isPlaying: this.isPlaying,
				});
				break;
		}

		// Log property-change events that aren't explicitly handled above
		if (
			message.name !== 'time-pos' &&
			message.name !== 'duration' &&
			message.name !== 'pause' &&
			message.name !== 'eof-reached' &&
			message.name !== 'sub-text'
		) {
			logger.debug('PlayerService', 'Unhandled property change', {
				property: message.name,
				data: message.data,
			});
		}

		this.eventCallback(event);
	}

	async play(url: string, options?: PlayOptions): Promise<void> {
		logger.info('PlayerService', 'play() called with mpv', {
			urlLength: url.length,
			urlPreview: url.substring(0, 100),
			volume: options?.volume || this.currentVolume,
		});

		// Extract videoId from URL
		const videoIdMatch = url.match(/[?&]v=([^&]+)/);
		const videoId = videoIdMatch ? videoIdMatch[1] : null;

		// Guard: Don't spawn if same track already playing
		if (this.currentTrackId === videoId && this.mpvProcess && this.isPlaying) {
			logger.info(
				'PlayerService',
				'Same track already playing, skipping spawn',
				{
					videoId,
				},
			);
			return;
		}

		this.currentTrackId = videoId || null;

		// Stop any existing playback
		this.stop();

		this.currentUrl = url;
		if (options?.volume !== undefined) {
			this.currentVolume = options.volume;
		}

		// Build YouTube URL from videoId if needed
		let playUrl = url;
		if (!url.startsWith('http')) {
			playUrl = `https://www.youtube.com/watch?v=${url}`;
		}

		// Increment session ID for a unique IPC socket path per play call
		this.playSessionId++;
		const playGeneration = ++this.playGeneration;

		// Generate IPC socket path
		this.ipcPath = this.getIpcPath();

		return new Promise<void>((resolve, reject) => {
			try {
				logger.debug('PlayerService', 'Spawning mpv process with IPC', {
					url: playUrl,
					volume: this.currentVolume,
					ipcPath: this.ipcPath,
				});

				const mpvArgs = buildMpvArgs(this.ipcPath!, {
					volume: this.currentVolume,
					audioNormalization: options?.audioNormalization,
					proxy: options?.proxy,
					gaplessPlayback: options?.gaplessPlayback,
					crossfadeDuration: options?.crossfadeDuration,
					equalizerPreset: options?.equalizerPreset,
					subtitlesEnabled: getConfigService().get('subtitlesEnabled'),
				});

				// Capture process in local var so stale exit handlers from a killed
				// process don't overwrite state belonging to a newly-spawned process.
				const spawnedProcess = spawn(this.getMpvCommand(), mpvArgs, {
					detached: true,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
				});
				this.mpvProcess = spawnedProcess;

				if (!spawnedProcess.stdout || !spawnedProcess.stderr) {
					throw new Error('Failed to create mpv process streams');
				}

				this.isPlaying = true;
				let isResolved = false;
				let mpvStderr = '';

				const isStalePlay = () => playGeneration !== this.playGeneration;

				const handleSuccess = () => {
					if (!isResolved && !isStalePlay()) {
						isResolved = true;
						resolve();
					}
				};

				const handleError = (err: Error) => {
					if (!isResolved && !isStalePlay()) {
						isResolved = true;
						reject(err);
					}
				};

				// Connect to IPC socket after a delay (longer on Windows)
				const ipcDelay = process.platform === 'win32' ? 500 : 200;
				const connectGeneration = this.ipcConnectGeneration;
				this.scheduleIpcTimer(ipcDelay, connectGeneration, () => {
					this.connectIpc(playUrl)
						.then(() => {
							// IPC connected and loadfile sent - playback starting
							handleSuccess();
						})
						.catch(error => {
							logger.warn('PlayerService', 'Failed to connect IPC', {
								error: formatError(error),
							});
							// IPC failed - mpv is idle with no URL loaded, clean it up
							this.stop();
							handleError(new Error(`IPC connection failed: ${error.message}`));
						});
				});

				// Handle stdout (should be minimal with --really-quiet)
				spawnedProcess.stdout.on('data', (data: Buffer) => {
					logger.debug('PlayerService', 'mpv stdout', {
						output: data.toString().trim(),
					});
				});

				// Handle stderr (errors)
				spawnedProcess.stderr.on('data', (data: Buffer) => {
					const error = data.toString().trim();
					if (error) {
						mpvStderr = mpvStderr ? `${mpvStderr}\n${error}` : error;
						logger.error('PlayerService', 'mpv stderr', {error});
					}
				});

				// Handle process exit — guard against stale handlers from killed processes
				spawnedProcess.on('exit', (code, signal) => {
					logger.info('PlayerService', 'mpv process exited', {
						code,
						signal,
						wasPlaying: this.isPlaying,
						stale: isStalePlay(),
					});

					if (isStalePlay()) {
						return;
					}

					// Only update shared state if this is still the active process
					if (this.mpvProcess === spawnedProcess) {
						this.isPlaying = false;
						this.mpvProcess = null;
					}

					if (code === 0) {
						// Normal exit (track finished)
						handleSuccess();
					} else if (code !== null && code > 0) {
						const stderrHint = mpvStderr ? `: ${mpvStderr}` : '';
						handleError(new Error(`mpv exited with code ${code}${stderrHint}`));
					}
					// If killed by signal, don't reject (user stopped it)
				});

				// Handle errors — same guard
				spawnedProcess.on('error', (error: Error) => {
					logger.error('PlayerService', 'mpv process error', {
						...formatErrorData(error),
					});
					if (isStalePlay()) {
						return;
					}

					if (this.mpvProcess === spawnedProcess) {
						this.isPlaying = false;
						this.mpvProcess = null;
					}

					if ('code' in error && error.code === 'ENOENT') {
						handleError(
							new Error(
								"mpv executable not found. Install mpv and ensure it's in PATH (or set MPV_PATH).",
							),
						);
						return;
					}

					handleError(error);
				});

				logger.info('PlayerService', 'mpv process started successfully');
			} catch (error) {
				logger.error('PlayerService', 'Exception in play()', {
					...formatErrorData(error),
				});
				this.isPlaying = false;
				reject(error);
			}
		});
	}

	pause(): void {
		logger.debug('PlayerService', 'pause() called');
		this.isPlaying = false;
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.sendIpcCommand(['set_property', 'pause', true]);
		}
	}

	resume(): void {
		logger.debug('PlayerService', 'resume() called', {
			isPlaying: this.isPlaying,
			hasIpcSocket: Boolean(this.ipcSocket),
			ipcDestroyed: this.ipcSocket?.destroyed ?? true,
			hasMpvProcess: Boolean(this.mpvProcess),
			currentTrackId: this.currentTrackId,
		});

		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.isPlaying = true;
			this.sendIpcCommand(['set_property', 'pause', false]);
			if (this.currentVolume !== undefined) {
				setTimeout(() => {
					this.sendIpcCommand(['set_property', 'volume', this.currentVolume]);
				}, 100);
			}
			return;
		}

		if (this.currentUrl) {
			logger.info('PlayerService', 'Resume fallback: restarting track');
			this.isPlaying = true;
			void this.play(this.currentUrl, {volume: this.currentVolume});
			return;
		}

		logger.warn('PlayerService', 'resume() ignored: no IPC session or URL');
	}

	hasActivePlaybackSession(): boolean {
		return Boolean(this.ipcSocket && !this.ipcSocket.destroyed);
	}

	stop(): void {
		logger.debug('PlayerService', 'stop() called', {
			stack: new Error().stack,
		});

		this.invalidateIpcConnect();
		this.playGeneration++;
		this.destroyIpcSocket();

		if (this.mpvProcess) {
			try {
				this.mpvProcess.kill('SIGTERM');
				this.mpvProcess = null;
				this.isPlaying = false;
				this.currentTrackId = null; // Clear track ID on stop
				logger.info('PlayerService', 'mpv process killed');
			} catch (error) {
				logger.error('PlayerService', 'Error killing mpv process', {
					error: formatError(error),
				});
			}
		}

		this.ipcPath = null;
	}

	/**
	 * Detach mode: Save state and clear references without killing mpv process
	 * Returns the IPC path and current URL for later reattachment
	 */
	detach(): {ipcPath: string | null; currentUrl: string | null} {
		logger.info('PlayerService', 'Detaching from player', {
			ipcPath: this.ipcPath,
			currentUrl: this.currentUrl,
		});

		const info = {
			ipcPath: this.ipcPath,
			currentUrl: this.currentUrl,
		};

		this.invalidateIpcConnect();
		this.destroyIpcSocket();

		if (this.mpvProcess) {
			// Close piped stdio handles so Node has no open references that could
			// prevent clean exit or send SIGHUP to the detached mpv process.
			this.mpvProcess.stdout?.destroy();
			this.mpvProcess.stderr?.destroy();
			// Allow detached mpv process to survive after CLI exits.
			this.mpvProcess.unref();
		}

		// Clear references but DON'T kill mpv process - it keeps playing
		this.mpvProcess = null;
		this.isPlaying = false;

		return info;
	}

	/**
	 * Reattach to an existing mpv process via IPC
	 */
	async reattach(
		ipcPath: string,
		options?: {trackId?: string; currentUrl?: string},
	): Promise<void> {
		if (!isValidIpcPipePath(ipcPath)) {
			throw new Error('Invalid IPC pipe path for reattach');
		}

		logger.info('PlayerService', 'Reattaching to player', {ipcPath});

		this.invalidateIpcConnect();
		this.destroyIpcSocket();
		this.ipcPath = normalizeIpcPipePath(ipcPath);
		await this.connectIpc();
		this.isPlaying = true;

		if (options?.trackId) this.currentTrackId = options.trackId;
		if (options?.currentUrl) this.currentUrl = options.currentUrl;

		logger.info('PlayerService', 'Successfully reattached to player');
	}

	setVolume(volume: number): void {
		logger.debug('PlayerService', 'setVolume() called', {
			oldVolume: this.currentVolume,
			newVolume: volume,
			isPlaying: this.isPlaying,
			ipcSocketConnected: Boolean(this.ipcSocket && !this.ipcSocket.destroyed),
			stack: new Error().stack,
		});
		this.currentVolume = Math.max(0, Math.min(100, volume));

		// Record timestamp for correlation with pause events
		this.lastVolumeChangeTimestamp = Date.now();

		// Update mpv volume via IPC if connected
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			const command = ['set_property', 'volume', this.currentVolume];
			logger.debug('PlayerService', 'Sending IPC volume command', {
				command: command[0],
				volume: this.currentVolume,
			});
			this.sendIpcCommand(command);
		}
	}

	getVolume(): number {
		return this.currentVolume;
	}

	setSpeed(speed: number): void {
		const clamped = Math.max(0.25, Math.min(4.0, speed));
		logger.debug('PlayerService', 'setSpeed() called', {speed: clamped});
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.sendIpcCommand(['set_property', 'speed', clamped]);
		}
	}

	setABLoop(a: number | null, b: number | null): void {
		logger.debug('PlayerService', 'setABLoop() called', {a, b});
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.sendIpcCommand(['set_property', 'ab-loop-a', a !== null ? a : 'no']);
			this.sendIpcCommand(['set_property', 'ab-loop-b', b !== null ? b : 'no']);
		}
	}

	isCurrentlyPlaying(): boolean {
		return this.isPlaying;
	}
}

export const getPlayerService = (): PlayerService =>
	PlayerService.getInstance();
