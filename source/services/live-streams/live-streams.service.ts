import { BUILTIN_LIVE_STREAMS } from "../../data/builtin-live-streams.ts";
import type { LiveStreamEntry } from "../../types/live-stream.types.ts";
import type { RadioStation } from "../../types/radio-station.types.ts";

export function getLiveStreams(): readonly LiveStreamEntry[] {
  return [...BUILTIN_LIVE_STREAMS].toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function getLiveStreamById(id: string): LiveStreamEntry | undefined {
  return BUILTIN_LIVE_STREAMS.find(entry => entry.id === id);
}

export function toRadioStation(entry: LiveStreamEntry): RadioStation {
  return {
    id: entry.id,
    name: entry.name,
    streamUrl: entry.url,
    genre: entry.tags[0],
    source: "live-catalog",
  };
}
