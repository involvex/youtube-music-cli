// Audio playback service using mpv media player
import {spawn, type ChildProcess} from 'node:child_process';
import {logger} from '../logger/logger.service.ts';

export type PlayOptions = {
	volume?: number;
};

class PlayerService {
	private static instance: PlayerService;
	private mpvProcess: ChildProcess | null = null;
	private currentUrl: string | null = null;
	private currentVolume = 70;
	private isPlaying = false;

	private constructor() {}

	static getInstance(): PlayerService {
		if (!PlayerService.instance) {
			PlayerService.instance = new PlayerService();
		}
		return PlayerService.instance;
	}

	async play(url: string, options?: PlayOptions): Promise<void> {
		logger.info('PlayerService', 'play() called with mpv', {
			urlLength: url.length,
			urlPreview: url.substring(0, 100),
			volume: options?.volume || this.currentVolume,
		});

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

		return new Promise<void>((resolve, reject) => {
			try {
				logger.debug('PlayerService', 'Spawning mpv process', {
					url: playUrl,
					volume: this.currentVolume,
				});

				// Spawn mpv with JSON IPC for better control
				this.mpvProcess = spawn('mpv', [
					'--no-video', // Audio only
					'--no-terminal', // Don't read from stdin
					`--volume=${this.currentVolume}`,
					'--no-audio-display', // Don't show album art in terminal
					'--really-quiet', // Minimal output
					'--msg-level=all=error', // Only show errors
					playUrl,
				]);

				if (!this.mpvProcess.stdout || !this.mpvProcess.stderr) {
					throw new Error('Failed to create mpv process streams');
				}

				this.isPlaying = true;

				// Handle stdout (should be minimal with --really-quiet)
				this.mpvProcess.stdout.on('data', (data: Buffer) => {
					logger.debug('PlayerService', 'mpv stdout', {
						output: data.toString().trim(),
					});
				});

				// Handle stderr (errors)
				this.mpvProcess.stderr.on('data', (data: Buffer) => {
					const error = data.toString().trim();
					if (error) {
						logger.error('PlayerService', 'mpv stderr', {error});
					}
				});

				// Handle process exit
				this.mpvProcess.on('exit', (code, signal) => {
					logger.info('PlayerService', 'mpv process exited', {
						code,
						signal,
						wasPlaying: this.isPlaying,
					});

					this.isPlaying = false;
					this.mpvProcess = null;

					if (code === 0) {
						// Normal exit (track finished)
						resolve();
					} else if (code !== null && code > 0) {
						// Error exit
						reject(new Error(`mpv exited with code ${code}`));
					}
					// If killed by signal, don't reject (user stopped it)
				});

				// Handle errors
				this.mpvProcess.on('error', (error: Error) => {
					logger.error('PlayerService', 'mpv process error', {
						error: error.message,
						stack: error.stack,
					});
					this.isPlaying = false;
					this.mpvProcess = null;
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
		if (this.mpvProcess && this.isPlaying) {
			// For now, just stop (we can add pause/resume via IPC later)
			this.stop();
		}
	}

	resume(url: string): void {
		logger.debug('PlayerService', 'resume() called', {url});
		if (!this.isPlaying && this.currentUrl) {
			void this.play(this.currentUrl);
		}
	}

	stop(): void {
		logger.debug('PlayerService', 'stop() called');
		if (this.mpvProcess) {
			try {
				this.mpvProcess.kill('SIGTERM');
				this.mpvProcess = null;
				this.isPlaying = false;
				logger.info('PlayerService', 'mpv process killed');
			} catch (error) {
				logger.error('PlayerService', 'Error killing mpv process', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	setVolume(volume: number): void {
		logger.debug('PlayerService', 'setVolume() called', {
			oldVolume: this.currentVolume,
			newVolume: volume,
		});
		this.currentVolume = Math.max(0, Math.min(100, volume));

		// If mpv is running, we'd need IPC to change volume dynamically
		// For now, volume only applies to next track
		// TODO: Implement IPC for runtime volume control
	}

	getVolume(): number {
		return this.currentVolume;
	}

	isCurrentlyPlaying(): boolean {
		return this.isPlaying;
	}
}

export const getPlayerService = (): PlayerService =>
	PlayerService.getInstance();
