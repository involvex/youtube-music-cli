export interface HybridAudioInput {
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	volume: number;
}

export class HybridAudioSource {
	private lastTimePos = 0;
	private beatPhase = 0;
	private energy = 0;
	private bassEnergy = 0;
	private volumeEnvelope = 0;
	private readonly frequencyBins: number;

	constructor(frequencyBins = 128) {
		this.frequencyBins = frequencyBins;
	}

	update(input: HybridAudioInput, deltaTime: number): void {
		const timeDelta = Math.max(0, input.currentTime - this.lastTimePos);
		this.lastTimePos = input.currentTime;

		const targetVolume = input.volume / 100;
		this.volumeEnvelope = this.volumeEnvelope * 0.9 + targetVolume * 0.1;

		if (input.isPlaying) {
			this.beatPhase += deltaTime * 0.002;
			const beatPulse = Math.pow(
				(Math.sin(this.beatPhase * Math.PI * 2) + 1) / 2,
				2,
			);
			const motionBoost = Math.min(1, timeDelta * 4);
			this.energy = Math.min(
				1,
				this.energy * 0.85 + (0.35 + beatPulse * 0.45) * motionBoost,
			);
			this.bassEnergy = Math.min(
				1,
				this.bassEnergy * 0.8 + (0.4 + beatPulse * 0.5) * this.volumeEnvelope,
			);
		} else {
			this.beatPhase += deltaTime * 0.0008;
			this.energy = Math.max(0.14, this.energy * 0.94);
			this.bassEnergy = Math.max(0.1, this.bassEnergy * 0.92);
		}
	}

	generateSamples(): Float32Array {
		const data = new Float32Array(this.frequencyBins);
		const t = this.beatPhase;

		for (let i = 0; i < this.frequencyBins; i++) {
			const freq = i / this.frequencyBins;
			let value = 0;

			if (freq < 0.15) {
				value = this.bassEnergy * (0.7 + Math.sin(t * 4 + freq * 8) * 0.3);
			} else if (freq < 0.45) {
				value =
					this.energy *
					(0.5 + Math.sin(t * 6 + freq * 16) * 0.25) *
					this.volumeEnvelope;
			} else {
				value =
					this.energy *
					0.45 *
					(0.4 + Math.sin(t * 8 + freq * 24) * 0.2) *
					this.volumeEnvelope;
			}

			value += Math.pow(1 - Math.abs(freq - 0.2), 2) * this.bassEnergy * 0.3;
			data[i] = Math.max(0, Math.min(1, value));
		}

		return data;
	}
}
