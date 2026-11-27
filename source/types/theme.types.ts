// Theme type definitions
export type ColorName =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "purple"
  | "cyan"
  | "white"
  | "blackBright"
  | "redBright"
  | "greenBright"
  | "yellowBright"
  | "blueBright"
  | "magentaBright"
  | "cyanBright"
  | "whiteBright"
  | "gray";

export type ThemeColors = {
  primary: ColorName;
  secondary: ColorName;
  background: ColorName;
  text: ColorName;
  accent: ColorName;
  dim: ColorName;
  error: ColorName;
  success: ColorName;
  warning: ColorName;
};

export type KaraokeColors = {
  sung: string;
  peak: string;
  upcoming: string;
};

export type Theme = {
  name: string;
  colors: ThemeColors;
  karaoke?: KaraokeColors;
  inverse?: boolean;
};

export type ThemeName = "dark" | "light" | "midnight" | "matrix" | "custom";
