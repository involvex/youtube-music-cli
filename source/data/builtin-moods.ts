import type { MoodPreset } from "../types/mood.types.ts";

export const BUILTIN_MOODS: readonly MoodPreset[] = [
  {
    id: "relaxing",
    name: "Relaxing",
    description: "Calm, soothing tracks for unwinding",
    seeds: [
      { type: "artist", id: "Brian Eno", name: "Brian Eno" },
      { type: "artist", id: "Enya", name: "Enya" },
      { type: "artist", id: "Ludovico Einaudi", name: "Ludovico Einaudi" },
    ],
  },
  {
    id: "energetic",
    name: "Energetic",
    description: "High-energy tracks to keep you moving",
    seeds: [
      { type: "artist", id: "Daft Punk", name: "Daft Punk" },
      { type: "artist", id: "Justice", name: "Justice" },
      {
        type: "artist",
        id: "The Chemical Brothers",
        name: "The Chemical Brothers",
      },
    ],
  },
  {
    id: "focus",
    name: "Focus",
    description: "Concentration-friendly tracks for deep work",
    seeds: [
      { type: "artist", id: "Nujabes", name: "Nujabes" },
      { type: "artist", id: "Tycho", name: "Tycho" },
      { type: "artist", id: "Bonobo", name: "Bonobo" },
    ],
  },
  {
    id: "chill",
    name: "Chill",
    description: "Laid-back vibes for casual listening",
    seeds: [
      { type: "artist", id: "Tycho", name: "Tycho" },
      { type: "artist", id: "Bonobo", name: "Bonobo" },
      { type: "artist", id: "Khruangbin", name: "Khruangbin" },
    ],
  },
  {
    id: "workout",
    name: "Workout",
    description: "Intense tracks to fuel your workout",
    seeds: [
      { type: "artist", id: "The Prodigy", name: "The Prodigy" },
      {
        type: "artist",
        id: "Rage Against the Machine",
        name: "Rage Against the Machine",
      },
      { type: "artist", id: "Run The Jewels", name: "Run The Jewels" },
    ],
  },
  {
    id: "sleep",
    name: "Sleep",
    description: "Gentle ambient tracks to help you sleep",
    seeds: [
      { type: "artist", id: "Enya", name: "Enya" },
      { type: "artist", id: "Brian Eno", name: "Brian Eno" },
      { type: "artist", id: "Sigur Rós", name: "Sigur Rós" },
    ],
  },
  {
    id: "party",
    name: "Party",
    description: "Upbeat tracks to keep the energy high",
    seeds: [
      { type: "artist", id: "Daft Punk", name: "Daft Punk" },
      {
        type: "artist",
        id: "The Chemical Brothers",
        name: "The Chemical Brothers",
      },
      { type: "artist", id: "Justice", name: "Justice" },
    ],
  },
  {
    id: "sad",
    name: "Melancholy",
    description: "Emotional tracks for reflective moments",
    seeds: [
      { type: "artist", id: "Radiohead", name: "Radiohead" },
      { type: "artist", id: "Bon Iver", name: "Bon Iver" },
      { type: "artist", id: "Elliott Smith", name: "Elliott Smith" },
    ],
  },
] as const;

export function getMoodById(id: string): MoodPreset | undefined {
  return BUILTIN_MOODS.find(m => m.id === id);
}
