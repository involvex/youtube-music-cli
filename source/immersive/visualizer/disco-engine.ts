import type { RGB } from "../renderer/ansi-codes.ts";
import type { FrequencyBands } from "./audio-collector.ts";

export interface DiscoConfig {
  enabled: boolean;
  sensitivity: number;
  colorSpeed: number;
  brightness: number;
  pulseIntensity: number;
  strobeEnabled: boolean;
  strobeSpeed: number;
}

export class DiscoEngine {
  private config: DiscoConfig;
  private hue = 0;
  private lastBeat = 0;
  private beatIntensity = 0;
  private strobePhase = 0;
  private pulsePhase = 0;
  private colorTime = 0;

  constructor(config: Partial<DiscoConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      sensitivity: config.sensitivity ?? 0.5,
      colorSpeed: config.colorSpeed ?? 0.2,
      brightness: config.brightness ?? 0.7,
      pulseIntensity: config.pulseIntensity ?? 0.2,
      strobeEnabled: config.strobeEnabled ?? false,
      strobeSpeed: config.strobeSpeed ?? 5,
    };
  }

  update(deltaTime: number): void {
    this.colorTime += deltaTime * this.config.colorSpeed;
    this.hue = (this.hue + deltaTime * 0.02 * this.config.colorSpeed) % 360;
    this.pulsePhase = (this.pulsePhase + deltaTime * 0.001) % (Math.PI * 2);

    if (this.config.strobeEnabled) {
      this.strobePhase += deltaTime * 0.005 * this.config.strobeSpeed;
    }
  }

  processAudio(frequencyBands: FrequencyBands): {
    background: RGB;
    accent: RGB;
    intensity: number;
  } {
    if (!this.config.enabled) {
      return {
        background: [20, 20, 30] as RGB,
        accent: [100, 200, 255] as RGB,
        intensity: 0,
      };
    }

    const bassIntensity = frequencyBands.bass * this.config.sensitivity;
    const midIntensity = frequencyBands.mid * this.config.sensitivity;
    const trebleIntensity = frequencyBands.treble * this.config.sensitivity;

    this.beatIntensity = Math.max(0, this.beatIntensity - 0.02);
    if (bassIntensity > 0.85) {
      this.beatIntensity = Math.min(1, this.beatIntensity + 0.3);
    }

    const pulseMultiplier =
      1 + Math.sin(this.pulsePhase) * this.config.pulseIntensity;

    const hueShift = this.colorTime * 30;
    const accentHue = (this.hue + 180 + hueShift) % 360;

    const bgSaturation = 0.3 + bassIntensity * 0.5;
    const bgLightness = 0.1 + this.beatIntensity * 0.2;

    const background: RGB = this.hslToRgb(
      this.hue / 360,
      bgSaturation,
      bgLightness * pulseMultiplier,
    );

    const accentSaturation = 0.8 + midIntensity * 0.2;
    const accentLightness = 0.5 + trebleIntensity * 0.3;

    const accent: RGB = this.hslToRgb(
      accentHue / 360,
      accentSaturation,
      accentLightness * pulseMultiplier,
    );

    let strobeMod = 1.0;
    if (this.config.strobeEnabled && Math.sin(this.strobePhase) > 0.95) {
      strobeMod = 0.7;
    }

    const intensity = Math.min(
      1,
      ((bassIntensity + midIntensity + trebleIntensity) / 3) * strobeMod,
    );

    return {
      background: this.adjustBrightness(background, this.config.brightness),
      accent: this.adjustBrightness(accent, this.config.brightness),
      intensity,
    };
  }

  private hslToRgb(h: number, s: number, l: number): RGB {
    let r: number;
    let g: number;
    let b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private adjustBrightness(color: RGB, factor: number): RGB {
    return [
      Math.min(255, Math.round(color[0] * factor)),
      Math.min(255, Math.round(color[1] * factor)),
      Math.min(255, Math.round(color[2] * factor)),
    ];
  }

  generateSpectrumBars(
    frequencyBands: FrequencyBands,
    width: number,
  ): Array<{ x: number; height: number; color: RGB }> {
    if (!this.config.enabled) {
      return [];
    }

    const bars = [];
    const bands = [
      { freq: frequencyBands.bass, hue: this.hue },
      { freq: frequencyBands.lowMid, hue: (this.hue + 60) % 360 },
      { freq: frequencyBands.mid, hue: (this.hue + 120) % 360 },
      { freq: frequencyBands.highMid, hue: (this.hue + 180) % 360 },
      { freq: frequencyBands.treble, hue: (this.hue + 240) % 360 },
    ];

    const barWidth = width / bands.length - 1;

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i]!;
      const barHeight = Math.floor(band.freq * 100) + 5;

      bars.push({
        x: i * (barWidth + 1),
        height: barHeight,
        color: this.hslToRgb(band.hue / 360, 0.8, 0.5),
      });
    }

    return bars;
  }

  setConfig(config: Partial<DiscoConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): DiscoConfig {
    return { ...this.config };
  }

  toggle(): void {
    this.config.enabled = !this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
