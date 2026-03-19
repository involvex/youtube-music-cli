import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';
import type {Track} from '../../types/youtube-music.types.ts';

const FAVORITES_FILE = join(CONFIG_DIR, 'favorites.json');
const SCHEMA_VERSION = 1;

export interface PersistedFavorites {
	schemaVersion: number;
	tracks: Track[];
	lastUpdated: string;
}

const defaultFavorites: PersistedFavorites = {
	schemaVersion: SCHEMA_VERSION,
	tracks: [],
	lastUpdated: new Date().toISOString(),
};

export async function saveFavorites(tracks: Track[]): Promise<void> {
	try {
		if (!existsSync(CONFIG_DIR)) {
			await mkdir(CONFIG_DIR, {recursive: true});
		}

		const stateToSave: PersistedFavorites = {
			...defaultFavorites,
			tracks,
			lastUpdated: new Date().toISOString(),
		};

		const tempFile = `${FAVORITES_FILE}.tmp`;
		await writeFile(tempFile, JSON.stringify(stateToSave, null, 2), 'utf8');

		if (process.platform === 'win32' && existsSync(FAVORITES_FILE)) {
			await import('node:fs/promises').then(fs => fs.unlink(FAVORITES_FILE));
		}

		await import('node:fs/promises').then(fs =>
			fs.rename(tempFile, FAVORITES_FILE),
		);

		logger.debug('FavoritesService', 'Saved favorites', {
			count: tracks.length,
		});
	} catch (error) {
		logger.error('FavoritesService', 'Failed to save favorites', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function loadFavorites(): Promise<Track[]> {
	try {
		if (!existsSync(FAVORITES_FILE)) {
			logger.debug('FavoritesService', 'No favorites file found');
			return [];
		}

		const data = await readFile(FAVORITES_FILE, 'utf8');
		const persisted = JSON.parse(data) as PersistedFavorites;

		if (persisted.schemaVersion !== SCHEMA_VERSION) {
			logger.warn('FavoritesService', 'Schema version mismatch', {
				expected: SCHEMA_VERSION,
				found: persisted.schemaVersion,
			});
			return [];
		}

		if (!Array.isArray(persisted.tracks)) {
			logger.warn('FavoritesService', 'Invalid favorites format, resetting');
			return [];
		}

		logger.info('FavoritesService', 'Loaded favorites', {
			count: persisted.tracks.length,
			lastUpdated: persisted.lastUpdated,
		});

		return persisted.tracks;
	} catch (error) {
		logger.error('FavoritesService', 'Failed to load favorites', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}
