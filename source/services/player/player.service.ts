// Audio playback service using mpv media player with IPC control
import {spawn, type ChildProcess} from 'node:child_process';
import {connect, type Socket} from 'node:net';
import {logger} from '../logger/logger.service.ts';
import type {EqualizerPreset} from '../../types/config.types.ts';

export type PlayOptions = {
	volume?: number;
	audioNormalization?: boolean;
	proxy?: string;
	gaplessPlayback?: boolean;
	crossfadeDuration?: number;
	equalizerPreset?: EqualizerPreset;
};

export type MpvArgsOptions = PlayOptions & {
	volume: number;
};

export function buildMpvArgs(
	url: string,
	ipcPath: string,
	options: MpvArgsOptions,
): string[] {
	const gapless = options.gaplessPlayback ?? true;
	const crossfadeDuration = Math.max(0, options.crossfadeDuration ?? 0);
	const eqPreset = options.equalizerPreset ?? 'flat';
	const audioFilters: string[] = [];

	if (options.audioNormalization) {
		audioFilters.push('dynaudnorm');
	}

	if (crossfadeDuration > 0) {
		audioFilters.push(`acrossfade=d=${crossfadeDuration}`);
	}

	const presetFilters = EQUALIZER_PRESET_FILTERS[eqPreset] ?? [];
	if (presetFilters.length > 0) {
		audioFilters.push(...presetFilters);
	}

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

	mpvArgs.push(url);

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
}) => void;

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
	private currentTrackId: string | null = null; // Track currently playing
	private playSessionId = 0; // Incremented per play() call for unique IPC paths

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

	/**
	 * Connect to mpv IPC socket
	 */
	private async connectIpc(): Promise<void> {
		if (!this.ipcPath) {
			throw new Error('IPC path not set');
		}

		return new Promise<void>((resolve, reject) => {
			const attemptConnect = () => {
				logger.debug('PlayerService', 'Attempting IPC connection', {
					path: this.ipcPath,
					attempt: this.ipcConnectRetries + 1,
				});

				this.ipcSocket = connect(this.ipcPath!);

				this.ipcSocket.on('connect', () => {
					logger.info('PlayerService', 'IPC socket connected');
					this.ipcConnectRetries = 0;

					// Request property observations
					this.sendIpcCommand(['observe_property', 1, 'time-pos']);
					this.sendIpcCommand(['observe_property', 2, 'duration']);
					this.sendIpcCommand(['observe_property', 3, 'pause']);
					this.sendIpcCommand(['observe_property', 4, 'eof-reached']);

					resolve();
				});

				this.ipcSocket.on('data', (data: Buffer) => {
					this.handleIpcMessage(data.toString());
				});

				this.ipcSocket.on('error', (err: Error) => {
					logger.debug('PlayerService', 'IPC socket error', {
						error: err.message,
						attempt: this.ipcConnectRetries + 1,
					});

					if (this.ipcConnectRetries < this.maxIpcRetries) {
						this.ipcConnectRetries++;
						setTimeout(attemptConnect, 100); // Retry after 100ms
					} else {
						reject(
							new Error(
								`Failed to connect to IPC socket after ${this.maxIpcRetries} attempts`,
							),
						);
					}
				});

				this.ipcSocket.on('close', () => {
					logger.debug('PlayerService', 'IPC socket closed');
					this.ipcSocket = null;
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
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
	}

	/**
	 * Handle property change events from mpv
	 */
	private handlePropertyChange(message: {
		name: string;
		data: number | boolean;
	}): void {
		if (!this.eventCallback) return;

		const event: {
			timePos?: number;
			duration?: number;
			paused?: boolean;
			eof?: boolean;
		} = {};

		switch (message.name) {
			case 'time-pos':
				event.timePos = message.data as number;
				logger.debug('PlayerService', 'Time position updated', {
					timePos: event.timePos,
				});
				break;

			case 'duration':
				event.duration = message.data as number;
				logger.debug('PlayerService', 'Duration updated', {
					duration: event.duration,
				});
				break;

			case 'pause':
				event.paused = message.data as boolean;
				logger.debug('PlayerService', 'Pause state changed', {
					paused: event.paused,
				});
				break;

			case 'eof-reached':
				event.eof = message.data as boolean;
				if (event.eof) {
					logger.info('PlayerService', 'End of file reached');
				}
				break;
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

		// Generate IPC socket path
		this.ipcPath = this.getIpcPath();

		return new Promise<void>((resolve, reject) => {
			try {
				logger.debug('PlayerService', 'Spawning mpv process with IPC', {
					url: playUrl,
					volume: this.currentVolume,
					ipcPath: this.ipcPath,
				});

				const mpvArgs = buildMpvArgs(playUrl, this.ipcPath!, {
					volume: this.currentVolume,
					audioNormalization: options?.audioNormalization,
					proxy: options?.proxy,
					gaplessPlayback: options?.gaplessPlayback,
					crossfadeDuration: options?.crossfadeDuration,
					equalizerPreset: options?.equalizerPreset,
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

				// Connect to IPC socket after a short delay (let mpv start)
				setTimeout(() => {
					void this.connectIpc().catch(error => {
						logger.warn('PlayerService', 'Failed to connect IPC', {
							error: error.message,
						});
						// Continue without IPC - basic playback will still work
					});
				}, 200);

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
						logger.error('PlayerService', 'mpv stderr', {error});
					}
				});

				// Handle process exit — guard against stale handlers from killed processes
				spawnedProcess.on('exit', (code, signal) => {
					logger.info('PlayerService', 'mpv process exited', {
						code,
						signal,
						wasPlaying: this.isPlaying,
					});

					// Only update shared state if this is still the active process
					if (this.mpvProcess === spawnedProcess) {
						this.isPlaying = false;
						this.mpvProcess = null;
					}

					if (code === 0) {
						// Normal exit (track finished)
						resolve();
					} else if (code !== null && code > 0) {
						// Error exit
						reject(new Error(`mpv exited with code ${code}`));
					}
					// If killed by signal, don't reject (user stopped it)
				});

				// Handle errors — same guard
				spawnedProcess.on('error', (error: Error) => {
					logger.error('PlayerService', 'mpv process error', {
						error: error.message,
						stack: error.stack,
					});
					if (this.mpvProcess === spawnedProcess) {
						this.isPlaying = false;
						this.mpvProcess = null;
					}

					if ('code' in error && error.code === 'ENOENT') {
						reject(
							new Error(
								"mpv executable not found. Install mpv and ensure it's in PATH (or set MPV_PATH).",
							),
						);
						return;
					}

					reject(error);
				});

				logger.info('PlayerService', 'mpv process started successfully');
			} catch (error) {
				logger.error('PlayerService', 'Exception in play()', {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
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
		logger.debug('PlayerService', 'resume() called');
		this.isPlaying = true;
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.sendIpcCommand(['set_property', 'pause', false]);
			// Reapply volume after resume to ensure audio isn't muted
			if (this.currentVolume !== undefined) {
				setTimeout(() => {
					this.sendIpcCommand(['set_property', 'volume', this.currentVolume]);
				}, 100);
			}
		} else if (!this.isPlaying && this.currentUrl) {
			void this.play(this.currentUrl, {volume: this.currentVolume});
		}
	}

	stop(): void {
		logger.debug('PlayerService', 'stop() called');

		// Close IPC socket
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.ipcSocket.destroy();
			this.ipcSocket = null;
		}

		if (this.mpvProcess) {
			try {
				this.mpvProcess.kill('SIGTERM');
				this.mpvProcess = null;
				this.isPlaying = false;
				this.currentTrackId = null; // Clear track ID on stop
				logger.info('PlayerService', 'mpv process killed');
			} catch (error) {
				logger.error('PlayerService', 'Error killing mpv process', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.ipcPath = null;
		this.ipcConnectRetries = 0;
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
		this.ipcSocket = null;
		this.ipcPath = null;
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
		logger.info('PlayerService', 'Reattaching to player', {ipcPath});

		this.ipcPath = ipcPath;
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
		});
		this.currentVolume = Math.max(0, Math.min(100, volume));

		// Update mpv volume via IPC if connected
		if (this.ipcSocket && !this.ipcSocket.destroyed) {
			this.sendIpcCommand(['set_property', 'volume', this.currentVolume]);
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

	isCurrentlyPlaying(): boolean {
		return this.isPlaying;
	}
}

export const getPlayerService = (): PlayerService =>
	PlayerService.getInstance();
