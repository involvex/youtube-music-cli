export interface AudioData {
  samples: Float32Array;
  timestamp: number;
}

export interface FrequencyBands {
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
}

export class AudioCollector {
  private fftSize = 256;
  private frequencyBins = 128;
  private smoothingTimeConstant = 0.8;
  private currentData = new Float32Array(128);
  private previousData = new Float32Array(128);

  constructor(fftSize?: number) {
    if (fftSize) {
      this.fftSize = fftSize;
      this.frequencyBins = fftSize / 2;
      this.currentData = new Float32Array(this.frequencyBins);
      this.previousData = new Float32Array(this.frequencyBins);
    }
  }

  processAudioData(samples: Float32Array): Float32Array {
    const newData = this.applyFft(samples);

    for (let i = 0; i < newData.length; i++) {
      this.currentData[i] =
        this.currentData[i]! * this.smoothingTimeConstant +
        newData[i]! * (1 - this.smoothingTimeConstant);
    }

    const result = new Float32Array(this.currentData.length);
    for (let i = 0; i < result.length; i++) {
      result[i] = Math.max(
        0,
        Math.min(1, this.currentData[i]! - this.previousData[i]!),
      );
    }

    this.previousData.set(this.currentData);

    return result;
  }

  private applyFft(samples: Float32Array): Float32Array {
    const result = new Float32Array(this.frequencyBins);

    const binSize = Math.floor(samples.length / this.frequencyBins);

    for (let i = 0; i < this.frequencyBins; i++) {
      let sum = 0;
      const start = i * binSize;
      const end = Math.min(start + binSize, samples.length);

      for (let j = start; j < end; j++) {
        sum += Math.abs(samples[j] ?? 0);
      }

      result[i] = sum / binSize;
    }

    return result;
  }

  getFrequencyBands(data: Float32Array): FrequencyBands {
    const bands: FrequencyBands = {
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
    };

    const binCount = data.length;
    const bassEnd = Math.floor(binCount * 0.1);
    const lowMidEnd = Math.floor(binCount * 0.25);
    const midEnd = Math.floor(binCount * 0.5);
    const highMidEnd = Math.floor(binCount * 0.75);

    for (let i = 0; i < bassEnd; i++) {
      bands.bass += data[i] ?? 0;
    }
    bands.bass /= bassEnd;

    for (let i = bassEnd; i < lowMidEnd; i++) {
      bands.lowMid += data[i] ?? 0;
    }
    bands.lowMid /= lowMidEnd - bassEnd;

    for (let i = lowMidEnd; i < midEnd; i++) {
      bands.mid += data[i] ?? 0;
    }
    bands.mid /= midEnd - lowMidEnd;

    for (let i = midEnd; i < highMidEnd; i++) {
      bands.highMid += data[i] ?? 0;
    }
    bands.highMid /= highMidEnd - midEnd;

    for (let i = highMidEnd; i < binCount; i++) {
      bands.treble += data[i] ?? 0;
    }
    bands.treble /= binCount - highMidEnd;

    return bands;
  }

  generateSimulatedData(time: number): Float32Array {
    const data = new Float32Array(this.frequencyBins);
    const t = time * 0.001;

    for (let i = 0; i < this.frequencyBins; i++) {
      const freq = i / this.frequencyBins;

      let value = 0;

      value += Math.sin(t * 2 + freq * 10) * 0.3;
      value += Math.sin(t * 3 + freq * 20) * 0.2;
      value += Math.sin(t * 5 + freq * 30) * 0.1;

      value += Math.pow(1 - Math.abs(freq - 0.2), 2) * 0.5;
      value += Math.pow(1 - Math.abs(freq - 0.5), 2) * 0.3;
      value += Math.pow(1 - Math.abs(freq - 0.8), 2) * 0.2;

      value = (value + 1) / 2;
      value = Math.pow(value, 0.8);

      data[i] = Math.max(0, Math.min(1, value));
    }

    return data;
  }

  getFftSize(): number {
    return this.fftSize;
  }

  getFrequencyBinCount(): number {
    return this.frequencyBins;
  }
}

export interface Peak {
  x: number;
  y: number;
  velocity: number;
  life: number;
  maxLife: number;
  color: [number, number, number];
}

export class AudioCollectorWithPeaks extends AudioCollector {
  private peaks: Peak[] = [];
  private maxPeaks = 50;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_time: number): void {
    for (let i = this.peaks.length - 1; i >= 0; i--) {
      const peak = this.peaks[i]!;
      peak.life -= 16;
      peak.y -= peak.velocity * 0.5;

      if (peak.life <= 0) {
        this.peaks.splice(i, 1);
      }
    }
  }

  addPeak(x: number, y: number, color: [number, number, number]): void {
    if (this.peaks.length >= this.maxPeaks) {
      this.peaks.shift();
    }

    this.peaks.push({
      x,
      y,
      velocity: 2 + Math.random() * 3,
      life: 1000,
      maxLife: 1000,
      color,
    });
  }

  getPeaks(): Peak[] {
    return this.peaks;
  }
}
