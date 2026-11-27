import type { RadioSeed } from "./radio.types.ts";

export interface MoodPreset {
  id: string;
  name: string;
  description: string;
  seeds: RadioSeed[];
}
