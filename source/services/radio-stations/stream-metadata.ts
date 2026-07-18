import type {StreamNowPlaying} from '../../types/radio-station.types.ts';

type MetadataRecord = Record<string, unknown>;

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function pickRawTitle(metadata: MetadataRecord): string | null {
	return (
		asNonEmptyString(metadata['icy-title']) ??
		asNonEmptyString(metadata.StreamTitle) ??
		asNonEmptyString(metadata['streamtitle']) ??
		asNonEmptyString(metadata.title) ??
		asNonEmptyString(metadata['Title']) ??
		null
	);
}

/**
 * Parse mpv stream metadata into artist/title.
 * Common ICY form: "Artist - Title".
 */
export function parseStreamMetadata(
	metadata: unknown,
): StreamNowPlaying | null {
	if (!metadata || typeof metadata !== 'object') {
		return null;
	}

	const record = metadata as MetadataRecord;
	const raw = pickRawTitle(record);
	if (!raw) {
		return null;
	}

	const separator = ' - ';
	const separatorIndex = raw.indexOf(separator);
	if (separatorIndex > 0 && separatorIndex < raw.length - separator.length) {
		const artist = raw.slice(0, separatorIndex).trim();
		const title = raw.slice(separatorIndex + separator.length).trim();
		if (artist && title) {
			return {artist, title, raw};
		}
	}

	return {artist: null, title: raw, raw};
}
