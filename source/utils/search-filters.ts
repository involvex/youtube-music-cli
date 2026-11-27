import type {
  Album,
  Artist,
  Playlist,
  SearchDurationFilter,
  SearchFilters,
  SearchResult,
  Track,
} from "../types/youtube-music.types.ts";

const DURATION_BUCKETS: Record<
  Exclude<SearchDurationFilter, "all">,
  { min: number; max: number }
> = {
  short: { min: 0, max: 180 },
  medium: { min: 181, max: 300 },
  long: { min: 301, max: Number.POSITIVE_INFINITY },
};

function includesIgnoreCase(
  value: string | undefined,
  filter: string,
): boolean {
  return Boolean(value && value.toLowerCase().includes(filter));
}

function isSongResult(result: SearchResult): result is {
  type: "song";
  data: Track;
} {
  return result.type === "song";
}

function isAlbumResult(result: SearchResult): result is {
  type: "album";
  data: Album;
} {
  return result.type === "album";
}

function isArtistResult(result: SearchResult): result is {
  type: "artist";
  data: Artist;
} {
  return result.type === "artist";
}

function isPlaylistResult(result: SearchResult): result is {
  type: "playlist";
  data: Playlist;
} {
  return result.type === "playlist";
}

function matchesArtistFilter(result: SearchResult, filter: string): boolean {
  if (!filter) return true;

  if (isSongResult(result)) {
    const track = result.data;
    if (track.artists.some(artist => includesIgnoreCase(artist.name, filter))) {
      return true;
    }

    if (
      track.album?.artists?.some(artist =>
        includesIgnoreCase(artist.name, filter),
      )
    ) {
      return true;
    }

    return false;
  }

  if (isAlbumResult(result)) {
    return result.data.artists.some(artist =>
      includesIgnoreCase(artist.name, filter),
    );
  }

  if (isArtistResult(result)) {
    return includesIgnoreCase(result.data.name, filter);
  }

  if (isPlaylistResult(result)) {
    return includesIgnoreCase(result.data.name, filter);
  }

  return true;
}

function matchesAlbumFilter(result: SearchResult, filter: string): boolean {
  if (!filter) return true;

  if (isSongResult(result)) {
    return includesIgnoreCase(result.data.album?.name, filter);
  }

  if (isAlbumResult(result)) {
    return includesIgnoreCase(result.data.name, filter);
  }

  if (isPlaylistResult(result)) {
    return includesIgnoreCase(result.data.name, filter);
  }

  return true;
}

function matchesYearFilter(result: SearchResult, filter: string): boolean {
  if (!filter) return true;

  const normalizedFilter = filter.toLowerCase();
  const textSources: Array<string | undefined> = [];

  if (isSongResult(result)) {
    textSources.push(result.data.title, result.data.album?.name);
  }

  if (isAlbumResult(result)) {
    textSources.push(result.data.name);
    textSources.push(...result.data.artists.map(artist => artist.name));
  }

  if (isArtistResult(result)) {
    textSources.push(result.data.name);
  }

  if (isPlaylistResult(result)) {
    textSources.push(result.data.name);
  }

  return textSources.some(source =>
    includesIgnoreCase(source, normalizedFilter),
  );
}

function matchesDurationFilter(
  result: SearchResult,
  filter: SearchDurationFilter | undefined,
): boolean {
  if (!filter || filter === "all") {
    return true;
  }

  if (!isSongResult(result)) {
    return true;
  }

  const duration = result.data.duration ?? 0;
  const range = DURATION_BUCKETS[filter];
  return duration >= range.min && duration <= range.max;
}

export function applySearchFilters(
  results: SearchResult[],
  filters: SearchFilters,
): SearchResult[] {
  const artistFilter = filters.artist?.trim().toLowerCase() ?? "";
  const albumFilter = filters.album?.trim().toLowerCase() ?? "";
  const yearFilter = filters.year?.trim() ?? "";
  const durationFilter = filters.duration;

  return results.filter(result => {
    return (
      matchesArtistFilter(result, artistFilter) &&
      matchesAlbumFilter(result, albumFilter) &&
      matchesYearFilter(result, yearFilter) &&
      matchesDurationFilter(result, durationFilter)
    );
  });
}
