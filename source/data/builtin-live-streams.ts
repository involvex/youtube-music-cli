import type { LiveStreamEntry } from "../types/live-stream.types.ts";

export const BUILTIN_LIVE_STREAMS: readonly LiveStreamEntry[] = [
  {
    id: "claude-live",
    name: "Claude — Live",
    url: "https://www.youtube.com/@claude/live",
    tags: ["coding", "youtube"],
    description: "Anthropic Claude live / vibe coding stream",
  },
  {
    id: "anomaly-fm",
    name: "Anomaly FM",
    url: "https://anomaly.fm/radio",
    tags: ["electronic", "radio"],
    description: "Anomaly FM web radio",
  },
  {
    id: "lofi-girl",
    name: "Lofi Girl — beats to relax/study to",
    url: "https://www.youtube.com/@LofiGirl/live",
    tags: ["lofi", "study"],
    description: "Classic Lofi Girl 24/7 live",
  },
  {
    id: "coding-synth",
    name: "Luxnova — Cyber Gothic / Synthwave (24/7)",
    url: "https://www.youtube.com/watch?v=Jq4bXit1Ees",
    tags: ["synthwave", "coding"],
    description: "Dark synthwave for focus and coding",
  },
  {
    id: "fcc-coderadio",
    name: "freeCodeCamp Code Radio",
    url: "https://coderadio-relay-ffm.freecodecamp.org/radio/8010/radio.mp3",
    tags: ["coding", "radio"],
    description: "freeCodeCamp 24/7 coding music",
  },
  {
    id: "soma-groove",
    name: "SomaFM — Groove Salad",
    url: "https://ice1.somafm.com/groovesalad-128-mp3",
    tags: ["chill", "focus"],
    description: "SomaFM ambient/downtempo for focus",
  },
  {
    id: "chillhop-live",
    name: "Chillhop Music",
    url: "https://www.youtube.com/@ChillhopMusic/live",
    tags: ["lofi", "chill"],
    description: "Chillhop Music live channel",
  },
] as const;
