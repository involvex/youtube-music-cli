import {
	copyFile,
	mkdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {formatError} from '../../utils/error.ts';
import type {PersistedFavorites} from '../../types/favorites.types.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';

let favoritesFilePathOverride: string | null = null;

function getFavoritesFilePath(): string {
	return favoritesFilePathOverride ?? join(CONFIG_DIR, 'favorites.json');
}
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

export async function saveFavorites(
	tracks: Track[],
	options?: {allowEmptyOverwrite?: boolean},
): Promise<void> {
	const favoritesFile = getFavoritesFilePath();
	const currentLock = saveLock;
	let releaseLock: () => void = () => {};
	const newLock = new Promise<void>(resolve => {
		releaseLock = resolve;
	});
	saveLock = newLock;

	await currentLock.catch(() => {});

	try {
		const favoritesDir = join(favoritesFile, '..');
		if (!existsSync(favoritesDir)) {
			await mkdir(favoritesDir, {recursive: true});
		}

		if (
			tracks.length === 0 &&
			!options?.allowEmptyOverwrite &&
			existsSync(favoritesFile)
		) {
			try {
				const existingData = await readFile(favoritesFile, 'utf8');
				const existingTracks = parseFavoritesFileContent(
					JSON.parse(existingData) as unknown,
				);
				if (existingTracks.length > 0) {
					logger.warn(
						'FavoritesService',
						'Refusing to overwrite non-empty favorites file with empty list',
						{existingCount: existingTracks.length},
					);
					return;
				}
			} catch {
				/* allow empty overwrite when existing file is unreadable */
			}
		}

		const stateToSave: PersistedFavorites = {
			...defaultFavorites,
			tracks,
			lastUpdated: new Date().toISOString(),
		};

		const tempFile = `${favoritesFile}.tmp.${Date.now()}`;
		const backupFile = `${favoritesFile}.bak`;
		await writeFile(tempFile, JSON.stringify(stateToSave, null, 2), 'utf8');

		try {
			if (existsSync(favoritesFile)) {
				await copyFile(favoritesFile, backupFile);
			}

			try {
				await rename(tempFile, favoritesFile);
			} catch {
				if (process.platform === 'win32' && existsSync(favoritesFile)) {
					await unlink(favoritesFile);
				}

				await rename(tempFile, favoritesFile);
			}

			if (existsSync(backupFile)) {
				await unlink(backupFile);
			}
		} catch (error) {
			if (existsSync(backupFile)) {
				try {
					await copyFile(backupFile, favoritesFile);
				} catch {
					/* ignore restore failure */
				}

				await unlink(backupFile).catch(() => {});
			}

			throw error;
		}

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
	const favoritesFile = getFavoritesFilePath();

	try {
		if (!existsSync(favoritesFile)) {
			logger.debug('FavoritesService', 'No favorites file found');
			return [];
		}

		const data = await readFile(favoritesFile, 'utf8');
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
	private loadPromise: Promise<void> | null = null;

	async ensureLoaded(): Promise<void> {
		if (this.loaded) {
			return;
		}

		this.loadPromise ??= this.loadFromDisk();
		await this.loadPromise;
	}

	private async loadFromDisk(): Promise<void> {
		const favoritesFile = getFavoritesFilePath();
		const favoritesFileExisted = existsSync(favoritesFile);

		this.tracks = await loadFavorites();
		if (this.tracks.length === 0) {
			if (!favoritesFileExisted) {
				this.tracks = await migrateLegacyConfigFavorites();
			} else {
				getConfigService().consumeLegacyFavoriteIds();
				logger.warn(
					'FavoritesService',
					'Favorites file exists but contained no valid tracks; keeping file on disk',
				);
			}
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
		await saveFavorites(this.tracks, {allowEmptyOverwrite: true});
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

export function setFavoritesFilePathForTests(filePath: string | null): void {
	favoritesFilePathOverride = filePath;
	favoritesManagerInstance = null;
}
