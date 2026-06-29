import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatError} from '../../utils/error.ts';
import type {PersistedFavorites} from '../../types/favorites.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';

const FAVORITES_FILE = join(CONFIG_DIR, 'favorites.json');
const SCHEMA_VERSION = 1;

const defaultFavorites: PersistedFavorites = {
	schemaVersion: SCHEMA_VERSION,
	tracks: [],
	lastUpdated: new Date().toISOString(),
};

function isPersistedTrack(value: unknown): value is Track {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const track = value as Track;
	return (
		typeof track.videoId === 'string' &&
		track.videoId.length > 0 &&
		typeof track.title === 'string' &&
		track.title.length > 0 &&
		Array.isArray(track.artists)
	);
}

export function parseFavoritesFileContent(data: unknown): Track[] {
	if (Array.isArray(data)) {
		return data.filter(isPersistedTrack);
	}

	if (!data || typeof data !== 'object') {
		return [];
	}

	const persisted = data as Partial<PersistedFavorites>;
	if (!Array.isArray(persisted.tracks)) {
		return [];
	}

	if (
		persisted.schemaVersion !== undefined &&
		persisted.schemaVersion !== SCHEMA_VERSION
	) {
		logger.warn(
			'FavoritesService',
			'Schema version mismatch, migrating tracks',
			{
				expected: SCHEMA_VERSION,
				found: persisted.schemaVersion,
			},
		);
	}

	return persisted.tracks.filter(isPersistedTrack);
}

function tracksFromLegacyIds(ids: string[]): Track[] {
	return ids.map(videoId => ({
		videoId,
		title: videoId,
		artists: [],
	}));
}

let saveLock = Promise.resolve();

export async function saveFavorites(tracks: Track[]): Promise<void> {
	const currentLock = saveLock;
	let releaseLock: () => void = () => {};
	const newLock = new Promise<void>(resolve => {
		releaseLock = resolve;
	});
	saveLock = newLock;

	await currentLock.catch(() => {});

	try {
		if (!existsSync(CONFIG_DIR)) {
			await mkdir(CONFIG_DIR, {recursive: true});
		}

		const stateToSave: PersistedFavorites = {
			...defaultFavorites,
			tracks,
			lastUpdated: new Date().toISOString(),
		};

		const tempFile = `${FAVORITES_FILE}.tmp.${Date.now()}`;
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
			error: formatError(error),
		});
	} finally {
		releaseLock();
	}
}

export async function loadFavorites(): Promise<Track[]> {
	try {
		if (!existsSync(FAVORITES_FILE)) {
			logger.debug('FavoritesService', 'No favorites file found');
			return [];
		}

		const data = await readFile(FAVORITES_FILE, 'utf8');
		const parsed = JSON.parse(data) as unknown;
		const tracks = parseFavoritesFileContent(parsed);

		if (tracks.length === 0 && data.trim() !== '' && data.trim() !== '[]') {
			logger.warn('FavoritesService', 'Favorites file had no valid tracks', {
				bytes: data.length,
			});
		}

		logger.info('FavoritesService', 'Loaded favorites', {
			count: tracks.length,
		});

		return tracks;
	} catch (error) {
		logger.error('FavoritesService', 'Failed to load favorites', {
			error: formatError(error),
		});
		return [];
	}
}

async function migrateLegacyConfigFavorites(): Promise<Track[]> {
	const legacyIds = getConfigService().consumeLegacyFavoriteIds();
	if (legacyIds.length === 0) {
		return [];
	}

	const tracks = tracksFromLegacyIds(legacyIds);
	logger.info('FavoritesService', 'Migrated legacy config favorites', {
		count: tracks.length,
	});
	await saveFavorites(tracks);
	return tracks;
}

export class FavoritesManager {
	private tracks: Track[] = [];
	private loaded = false;

	async ensureLoaded(): Promise<void> {
		if (this.loaded) {
			return;
		}

		this.tracks = await loadFavorites();
		if (this.tracks.length === 0) {
			this.tracks = await migrateLegacyConfigFavorites();
		} else {
			getConfigService().consumeLegacyFavoriteIds();
		}

		this.loaded = true;
	}

	getAllTracks(): Track[] {
		return [...this.tracks];
	}

	getRecentTracks(limit = 8): Track[] {
		return this.tracks.slice(0, limit);
	}

	isFavorite(videoId: string): boolean {
		return this.tracks.some(track => track.videoId === videoId);
	}

	async add(track: Track): Promise<void> {
		await this.ensureLoaded();
		if (this.isFavorite(track.videoId)) {
			return;
		}

		this.tracks = [track, ...this.tracks];
		await saveFavorites(this.tracks);
	}

	async remove(videoId: string): Promise<void> {
		await this.ensureLoaded();
		const next = this.tracks.filter(track => track.videoId !== videoId);
		if (next.length === this.tracks.length) {
			return;
		}

		this.tracks = next;
		await saveFavorites(this.tracks);
	}

	async toggle(track: Track): Promise<boolean> {
		await this.ensureLoaded();
		if (this.isFavorite(track.videoId)) {
			await this.remove(track.videoId);
			return false;
		}

		await this.add(track);
		return true;
	}

	randomOne(): Track | null {
		if (this.tracks.length === 0) {
			return null;
		}

		const index = Math.floor(Math.random() * this.tracks.length);
		return this.tracks[index] ?? null;
	}
}

let favoritesManagerInstance: FavoritesManager | null = null;

export function getFavoritesManager(): FavoritesManager {
	if (!favoritesManagerInstance) {
		favoritesManagerInstance = new FavoritesManager();
	}

	return favoritesManagerInstance;
}

export function resetFavoritesManagerForTests(): void {
	favoritesManagerInstance = null;
}
