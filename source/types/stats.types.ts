import type {Track} from './youtube-music.types.ts';

export interface TopTrack {
	track: Track;
	playCount: number;
	totalDurationSeconds: number;
}

export interface TopArtist {
	name: string;
	playCount: number;
	uniqueTracks: number;
}

export interface ListeningTimeBucket {
	date: string;
	playCount: number;
	minutes: number;
}

export interface ListeningStats {
	totalPlays: number;
	totalListeningMinutes: number;
	uniqueTracks: number;
	uniqueArtists: number;
	topTracks: TopTrack[];
	topArtists: TopArtist[];
	listeningByDay: ListeningTimeBucket[];
	currentStreak: number;
	longestStreak: number;
	firstPlayDate: string | null;
	averageDailyMinutes: number;
}
