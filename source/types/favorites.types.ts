import type {Track} from './youtube-music.types.ts';

export interface PersistedFavorites {
	schemaVersion: number;
	tracks: Track[];
	lastUpdated: string;
}
