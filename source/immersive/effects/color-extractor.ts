import type { RGB } from "../renderer/ansi-codes.ts";

export class ColorExtractor {
  private lastColors: RGB[] = [[128, 128, 128]];
  private smoothingFactor = 0.3;

  extractFromImageData(
    _imageData: Uint8ClampedArray,
    width: number,
    height: number,
  ): RGB[] {
    const sampleSize = 10;
    const colors: RGB[] = [];

    const stepX = Math.max(1, Math.floor(width / sampleSize));
    const stepY = Math.max(1, Math.floor(height / sampleSize));

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const i = (y * width + x) * 4;
        const r = _imageData[i] ?? 0;
        const g = _imageData[i + 1] ?? 0;
        const b = _imageData[i + 2] ?? 0;

        if (this.isVividColor(r, g, b)) {
          colors.push([r, g, b]);
        }
      }
    }

    if (colors.length === 0) {
      return this.lastColors;
    }

    const dominantColors = this.getDominantColors(colors, 5);

    this.lastColors = dominantColors.map(color =>
      this.smoothColor(color, this.lastColors[0] ?? color),
    );

    return this.lastColors;
  }

  private isVividColor(r: number, g: number, b: number): boolean {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    return saturation > 0.3 && max > 50;
  }

  private getDominantColors(colors: RGB[], count: number): RGB[] {
    const colorCounts = new Map<string, number>();

    for (const color of colors) {
      const key = this.colorToKey(color);
      colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
    }

    const sorted = Array.from(colorCounts.entries())
      .sort((a, b) => b[1]! - a[1]!)
      .slice(0, count)
      .map(([key]) => this.keyToColor(key));

    return sorted.length > 0 ? sorted : [[128, 128, 128]];
  }

  private colorToKey(color: RGB): string {
    const r4 = Math.round((color[0] ?? 128) / 32);
    const g4 = Math.round((color[1] ?? 128) / 32);
    const b4 = Math.round((color[2] ?? 128) / 32);
    return `${r4},${g4},${b4}`;
  }

  private keyToColor(key: string): RGB {
    const [r, g, b] = key.split(",").map(Number);
    return [(r ?? 4) * 32, (g ?? 4) * 32, (b ?? 4) * 32];
  }

  private smoothColor(color: RGB, prevColor: RGB): RGB {
    return [
      Math.round(
        (color[0] ?? 128) * this.smoothingFactor +
          (prevColor[0] ?? 128) * (1 - this.smoothingFactor),
      ),
      Math.round(
        (color[1] ?? 128) * this.smoothingFactor +
          (prevColor[1] ?? 128) * (1 - this.smoothingFactor),
      ),
      Math.round(
        (color[2] ?? 128) * this.smoothingFactor +
          (prevColor[2] ?? 128) * (1 - this.smoothingFactor),
      ),
    ];
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  getLastColors(): RGB[] {
    return [...this.lastColors];
  }

  generatePalette(baseColor: RGB): RGB[] {
    const [h, s, l] = this.rgbToHsl(
      baseColor[0] ?? 128,
      baseColor[1] ?? 128,
      baseColor[2] ?? 128,
    );

    return [
      baseColor,
      this.hslToRgb(h, s, Math.max(0, l - 0.2)),
      this.hslToRgb(h, s, Math.min(1, l + 0.2)),
      this.hslToRgb(Math.min(1, h + 0.1), s, l),
      this.hslToRgb(Math.max(0, h - 0.1), s, l),
      this.hslToRgb(h, Math.max(0, s - 0.1), l),
      this.hslToRgb(h, Math.min(1, s + 0.1), l),
    ];
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return [h, s, l];
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
}
