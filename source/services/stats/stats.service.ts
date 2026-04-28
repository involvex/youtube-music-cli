import type {HistoryEntry} from '../../types/history.types.ts';
import type {
	ListeningStats,
	TopTrack,
	TopArtist,
	ListeningTimeBucket,
} from '../../types/stats.types.ts';

const DEFAULT_TRACK_DURATION_SECONDS = 240;
const DAYS_TO_SHOW = 14;

function getDateKey(iso: string): string {
	return new Date(iso).toISOString().slice(0, 10);
}

function getTrackDuration(entry: HistoryEntry): number {
	return entry.track.duration ?? DEFAULT_TRACK_DURATION_SECONDS;
}

function computeTopTracks(entries: HistoryEntry[], limit: number): TopTrack[] {
	const map = new Map<
		string,
		{track: HistoryEntry['track']; count: number; totalDuration: number}
	>();

	for (const entry of entries) {
		const existing = map.get(entry.track.videoId);
		if (existing) {
			existing.count++;
			existing.totalDuration += getTrackDuration(entry);
		} else {
			map.set(entry.track.videoId, {
				track: entry.track,
				count: 1,
				totalDuration: getTrackDuration(entry),
			});
		}
	}

	return [...map.values()]
		.sort((a, b) => b.count - a.count)
		.slice(0, limit)
		.map(item => ({
			track: item.track,
			playCount: item.count,
			totalDurationSeconds: item.totalDuration,
		}));
}

function computeTopArtists(
	entries: HistoryEntry[],
	limit: number,
): TopArtist[] {
	const map = new Map<string, {count: number; trackIds: Set<string>}>();

	for (const entry of entries) {
		const artists = entry.track.artists ?? [];
		if (artists.length === 0) {
			const existing = map.get('Unknown') ?? {
				count: 0,
				trackIds: new Set<string>(),
			};
			existing.count++;
			existing.trackIds.add(entry.track.videoId);
			map.set('Unknown', existing);
			continue;
		}

		for (const artist of artists) {
			const name = artist.name || 'Unknown';
			const existing = map.get(name) ?? {count: 0, trackIds: new Set<string>()};
			existing.count++;
			existing.trackIds.add(entry.track.videoId);
			map.set(name, existing);
		}
	}

	return [...map.entries()]
		.map(([name, data]) => ({
			name,
			playCount: data.count,
			uniqueTracks: data.trackIds.size,
		}))
		.sort((a, b) => b.playCount - a.playCount)
		.slice(0, limit);
}

function computeListeningByDay(entries: HistoryEntry[]): ListeningTimeBucket[] {
	const now = new Date();
	const buckets = new Map<string, {playCount: number; minutes: number}>();

	for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
		const date = new Date(now);
		date.setDate(date.getDate() - i);
		const key = date.toISOString().slice(0, 10);
		buckets.set(key, {playCount: 0, minutes: 0});
	}

	for (const entry of entries) {
		const key = getDateKey(entry.playedAt);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.playCount++;
			bucket.minutes += getTrackDuration(entry) / 60;
		}
	}

	return [...buckets.entries()].map(([date, data]) => ({
		date,
		playCount: data.playCount,
		minutes: Math.round(data.minutes),
	}));
}

function computeStreaks(entries: HistoryEntry[]): {
	current: number;
	longest: number;
} {
	if (entries.length === 0) {
		return {current: 0, longest: 0};
	}

	const uniqueDays = new Set<string>();
	for (const entry of entries) {
		uniqueDays.add(getDateKey(entry.playedAt));
	}

	const sortedDays = [...uniqueDays].sort();
	const today = new Date().toISOString().slice(0, 10);

	let currentStreak = 0;
	const checkDate = new Date(today);
	for (let i = 0; i < 365; i++) {
		const key = checkDate.toISOString().slice(0, 10);
		if (uniqueDays.has(key)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (i === 0) {
			checkDate.setDate(checkDate.getDate() - 1);
			continue;
		} else {
			break;
		}
	}

	let longestStreak = 0;
	let runLength = 1;
	for (let i = 1; i < sortedDays.length; i++) {
		const prev = new Date(sortedDays[i - 1]!);
		const curr = new Date(sortedDays[i]!);
		const diffDays = Math.round(
			(curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
		);
		if (diffDays === 1) {
			runLength++;
		} else {
			longestStreak = Math.max(longestStreak, runLength);
			runLength = 1;
		}
	}

	longestStreak = Math.max(longestStreak, runLength);

	return {current: currentStreak, longest: longestStreak};
}

export function computeStats(entries: HistoryEntry[]): ListeningStats {
	if (entries.length === 0) {
		return {
			totalPlays: 0,
			totalListeningMinutes: 0,
			uniqueTracks: 0,
			uniqueArtists: 0,
			topTracks: [],
			topArtists: [],
			listeningByDay: computeListeningByDay([]),
			currentStreak: 0,
			longestStreak: 0,
			firstPlayDate: null,
			averageDailyMinutes: 0,
		};
	}

	const totalListeningSeconds = entries.reduce(
		(sum, entry) => sum + getTrackDuration(entry),
		0,
	);
	const totalListeningMinutes = Math.round(totalListeningSeconds / 60);

	const uniqueTrackIds = new Set(entries.map(e => e.track.videoId));
	const uniqueArtistNames = new Set<string>();
	for (const entry of entries) {
		for (const artist of entry.track.artists ?? []) {
			uniqueArtistNames.add(artist.name || 'Unknown');
		}
		if ((entry.track.artists ?? []).length === 0) {
			uniqueArtistNames.add('Unknown');
		}
	}

	const {current: currentStreak, longest: longestStreak} =
		computeStreaks(entries);

	const sortedDates = entries
		.map(e => getDateKey(e.playedAt))
		.filter(d => !Number.isNaN(new Date(d).getTime()))
		.sort();

	const firstPlayDate = sortedDates[0] ?? null;

	const {playCount: totalPlays} = {playCount: entries.length};

	const daysActive = new Set(sortedDates).size;
	const averageDailyMinutes =
		daysActive > 0 ? Math.round(totalListeningMinutes / daysActive) : 0;

	return {
		totalPlays,
		totalListeningMinutes,
		uniqueTracks: uniqueTrackIds.size,
		uniqueArtists: uniqueArtistNames.size,
		topTracks: computeTopTracks(entries, 10),
		topArtists: computeTopArtists(entries, 10),
		listeningByDay: computeListeningByDay(entries),
		currentStreak,
		longestStreak,
		firstPlayDate,
		averageDailyMinutes,
	};
}
