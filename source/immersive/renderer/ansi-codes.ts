export const ANSI = {
  RESET: "\x1B[0m",
  BOLD: "\x1B[1m",
  DIM: "\x1B[2m",
  ITALIC: "\x1B[3m",
  UNDERLINE: "\x1B[4m",

  fg: (r: number, g: number, b: number): string => `\x1B[38;2;${r};${g};${b}m`,
  bg: (r: number, g: number, b: number): string => `\x1B[48;2;${r};${g};${b}m`,

  fgBlack: "\x1B[30m",
  fgRed: "\x1B[31m",
  fgGreen: "\x1B[32m",
  fgYellow: "\x1B[33m",
  fgBlue: "\x1B[34m",
  fgMagenta: "\x1B[35m",
  fgCyan: "\x1B[36m",
  fgWhite: "\x1B[37m",
  fgDefault: "\x1B[39m",

  fgBrightBlack: "\x1B[90m",
  fgBrightRed: "\x1B[91m",
  fgBrightGreen: "\x1B[92m",
  fgBrightYellow: "\x1B[93m",
  fgBrightBlue: "\x1B[94m",
  fgBrightMagenta: "\x1B[95m",
  fgBrightCyan: "\x1B[96m",
  fgBrightWhite: "\x1B[97m",

  bgBlack: "\x1B[40m",
  bgRed: "\x1B[41m",
  bgGreen: "\x1B[42m",
  bgYellow: "\x1B[43m",
  bgBlue: "\x1B[44m",
  bgMagenta: "\x1B[45m",
  bgCyan: "\x1B[46m",
  bgWhite: "\x1B[47m",
  bgDefault: "\x1B[49m",

  goto: (row: number, col: number): string => `\x1B[${row};${col}H`,
  clearScreen: "\x1B[2J",
  clearLine: "\x1B[2K",
  hideCursor: "\x1B[?25l",
  showCursor: "\x1B[?25h",
  enterAltBuffer: "\x1B[?1049h",
  exitAltBuffer: "\x1B[?1049l",
  saveCursor: "\x1B[s",
  restoreCursor: "\x1B[u",
};

export type RGB = [number, number, number];
export type AnsiColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "default";

export function rgb(r: number, g: number, b: number): RGB {
  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  ];
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [
    parseInt(result[1] ?? "FF", 16),
    parseInt(result[2] ?? "FF", 16),
    parseInt(result[3] ?? "FF", 16),
  ];
}

export const DEFAULT_COLORS = {
  primary: rgb(100, 200, 255) as RGB,
  secondary: rgb(150, 150, 200) as RGB,
  background: rgb(20, 20, 30) as RGB,
  text: rgb(255, 255, 255) as RGB,
  accent: rgb(255, 100, 200) as RGB,
  dim: rgb(100, 100, 100) as RGB,
  error: rgb(255, 50, 50) as RGB,
  success: rgb(50, 255, 100) as RGB,
  warning: rgb(255, 200, 50) as RGB,
};
