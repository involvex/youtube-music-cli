import type { LyricLine } from "../services/lyrics/lyrics.service.ts";
// Pure helpers for karaoke-style lyric rendering: word timeline construction
// and per-character color interpolation. No React/Ink dependencies.
import type { ColorName, KaraokeColors } from "../types/theme.types.ts";

export const KARAOKE_TICK_MS = 60;
const CHARS_PER_SECOND = 15;
const MAX_LINE_DURATION_S = 6;
const MIN_LINE_DURATION_S = 0.4;
const WORD_MIN_DURATION_S = 0.05;
const GLOW_CHARS = 2.5;

export interface CharCell {
  char: string;
  color: string;
}

interface WordSpan {
  text: string;
  start: number;
  end: number;
}

// Pre-parsed RGB color for fast interpolation
interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Approximate hex values for named ANSI theme colors, used to interpolate a
// smooth per-character gradient when a theme has no explicit karaoke colors.
const HEX_BY_NAME: Record<ColorName, string> = {
  black: "#0b0b0d",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  purple: "#a855f7",
  cyan: "#56b6c2",
  white: "#dcdfe4",
  blackBright: "#5c6370",
  redBright: "#f87171",
  greenBright: "#4ade80",
  yellowBright: "#fbbf24",
  blueBright: "#60a5fa",
  magentaBright: "#e879f9",
  cyanBright: "#67e8f9",
  whiteBright: "#f9fafb",
  gray: "#6b7280",
};

// Parse hex to RGB once, cache for reuse
const HEX_TO_RGB_CACHE = new Map<string, RgbColor>();

function parseHexToRgb(hex: string): RgbColor {
  const cached = HEX_TO_RGB_CACHE.get(hex);
  if (cached) return cached;
  const parsed = Number.parseInt(hex.slice(1), 16);
  const rgb = {
    r: (parsed >> 16) & 0xff,
    g: (parsed >> 8) & 0xff,
    b: parsed & 0xff,
  };
  HEX_TO_RGB_CACHE.set(hex, rgb);
  return rgb;
}

// Fast RGB interpolation without string allocation
function lerpRgb(from: RgbColor, to: RgbColor, t: number): RgbColor {
  const clampedT = t < 0 ? 0 : t > 1 ? 1 : t;
  return {
    r: Math.round(from.r + (to.r - from.r) * clampedT),
    g: Math.round(from.g + (to.g - from.g) * clampedT),
    b: Math.round(from.b + (to.b - from.b) * clampedT),
  };
}

// Convert RGB to hex string (only when needed for output)
function rgbToHex(rgb: RgbColor): string {
  return `#${[rgb.r, rgb.g, rgb.b].map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

// Interpolate two hex colors by parameter t, clamped to [0, 1]
export function lerpHexColor(from: string, to: string, t: number): string {
  const rgb = lerpRgb(parseHexToRgb(from), parseHexToRgb(to), t);
  return rgbToHex(rgb);
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

// Type guard to ensure string is defined
function assertHexColor(value: string | undefined, fallback: string): string {
  if (value && HEX_COLOR_PATTERN.test(value)) {
    return value;
  }
  return fallback;
}

// Pre-resolved karaoke colors with RGB for fast interpolation
export interface ResolvedKaraokeColors {
  sung: string;
  peak: string;
  upcoming: string;
  sungRgb: RgbColor;
  peakRgb: RgbColor;
  upcomingRgb: RgbColor;
}

export function resolveKaraokeColors(theme: {
  karaoke?: KaraokeColors;
  colors: { primary: ColorName; accent: ColorName; text: ColorName };
}): ResolvedKaraokeColors {
  const derived = {
    sung: HEX_BY_NAME[theme.colors.primary],
    peak: HEX_BY_NAME[theme.colors.accent],
    upcoming: HEX_BY_NAME[theme.colors.text],
  };
  const hex = {
    sung: assertHexColor(theme.karaoke?.sung, derived.sung),
    peak: assertHexColor(theme.karaoke?.peak, derived.peak),
    upcoming: assertHexColor(theme.karaoke?.upcoming, derived.upcoming),
  };
  return {
    sung: hex.sung,
    peak: hex.peak,
    upcoming: hex.upcoming,
    sungRgb: parseHexToRgb(hex.sung),
    peakRgb: parseHexToRgb(hex.peak),
    upcomingRgb: parseHexToRgb(hex.upcoming),
  };
}

export function buildWordSpans(
  line: LyricLine,
  nextLineTime?: number,
): WordSpan[] {
  if (line.words && line.words.length > 0) {
    const words = line.words;
    const lineEnd =
      line.endTime ?? nextLineTime ?? line.time + MAX_LINE_DURATION_S;
    return words.map((word, index) => ({
      text: word.text,
      start: word.time,
      end: words[index + 1]?.time ?? lineEnd,
    }));
  }

  const text = line.text || "♪";
  const gapToNext =
    nextLineTime === undefined ? MAX_LINE_DURATION_S : nextLineTime - line.time;
  const naturalDuration = text.length / CHARS_PER_SECOND;
  const lineDuration = Math.max(
    MIN_LINE_DURATION_S,
    Math.min(
      naturalDuration,
      Math.max(gapToNext, MIN_LINE_DURATION_S),
      MAX_LINE_DURATION_S,
    ),
  );

  const tokens = text.split(/(\s+)/).filter(token => token.length > 0);
  const totalChars = tokens.reduce((sum, token) => sum + token.length, 0) || 1;
  let consumedChars = 0;
  return tokens.map(token => {
    const start = line.time + (consumedChars / totalChars) * lineDuration;
    consumedChars += token.length;
    const end = line.time + (consumedChars / totalChars) * lineDuration;
    return { text: token, start, end };
  });
}

// Pre-computed char timing for a line - avoids per-frame recalculation
export interface PrecomputedLine {
  chars: string[];
  charTimes: number[];
  charSteps: number[];
}

export function precomputeLineTiming(spans: WordSpan[]): PrecomputedLine {
  const chars: string[] = [];
  const charTimes: number[] = [];
  const charSteps: number[] = [];

  for (const span of spans) {
    const spanChars = [...span.text];
    const wordDuration = Math.max(WORD_MIN_DURATION_S, span.end - span.start);
    const charStep = wordDuration / spanChars.length || 1;

    for (let i = 0; i < spanChars.length; i++) {
      chars.push(spanChars[i]!);
      charTimes.push(span.start + i * charStep);
      charSteps.push(charStep);
    }
  }

  return { chars, charTimes, charSteps };
}

export function buildKaraokeCells(
  precomputed: PrecomputedLine,
  progress: number,
  colors: ResolvedKaraokeColors,
): CharCell[] {
  const { chars, charTimes, charSteps } = precomputed;
  const cells: CharCell[] = new Array(chars.length);

  for (let i = 0; i < chars.length; i++) {
    const delta = (progress - charTimes[i]!) / charSteps[i]!;

    let color: string;
    if (delta >= GLOW_CHARS) {
      color = colors.sung;
    } else if (delta <= -GLOW_CHARS) {
      color = colors.upcoming;
    } else if (delta >= 0) {
      const t = delta / GLOW_CHARS;
      const rgb = lerpRgb(colors.peakRgb, colors.sungRgb, t);
      color = rgbToHex(rgb);
    } else {
      const t = -delta / GLOW_CHARS;
      const rgb = lerpRgb(colors.peakRgb, colors.upcomingRgb, t);
      color = rgbToHex(rgb);
    }

    cells[i] = { char: chars[i] as string, color: color ?? colors.upcoming };
  }
  return cells;
}
