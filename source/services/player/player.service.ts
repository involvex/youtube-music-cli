// Audio playback service using play-sound
import playSound from 'play-sound';

export type PlayOptions = {
	volume?: number;
};

class PlayerService {
	private static instance: PlayerService;
	private currentSound: unknown = null;

	private constructor() {}

	static getInstance(): PlayerService {
		if (!PlayerService.instance) {
			PlayerService.instance = new PlayerService();
		}
		return PlayerService.instance;
	}

	async play(_url: string): Promise<void> {
		this.stop();

		return new Promise((resolve, reject) => {
			this.currentSound = playSound.play(_url, (err: Error) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	pause(): void {
		if (this.currentSound) {
			// play-sound doesn't support pause, so we stop
			this.stop();
		}
	}

	resume(url: string): void {
		if (!this.currentSound) {
			this.play(url);
		}
	}

	stop(): void {
		if (this.currentSound) {
			this.currentSound.kill();
			this.currentSound = null;
		}
	}

	setVolume(): void {
		// play-sound doesn't support runtime volume adjustment
		// Volume would need to be handled at the system level
	}
}

export const getPlayerService = (): PlayerService =>
	PlayerService.getInstance();
