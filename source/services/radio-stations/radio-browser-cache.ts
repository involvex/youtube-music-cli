import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import {join} from 'node:path';
import type {
	RadioBrowserCacheFile,
	RadioStation,
} from '../../types/radio-station.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';

const CACHE_FILE = join(CONFIG_DIR, 'radio-browser-cache.json');
const SCHEMA_VERSION = 1;
export const RADIO_BROWSER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachePathOverride: string | null = null;

export function setRadioBrowserCachePathForTests(path: string | null): void {
	cachePathOverride = path;
}

function getCachePath(): string {
	return cachePathOverride ?? CACHE_FILE;
}

function emptyCache(): RadioBrowserCacheFile {
	return {
		schemaVersion: SCHEMA_VERSION,
		updatedAt: new Date().toISOString(),
		entries: {},
	};
}

function readCacheFile(): RadioBrowserCacheFile {
	const path = getCachePath();
	if (!existsSync(path)) {
		return emptyCache();
	}

	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
		if (!raw || typeof raw !== 'object') {
			return emptyCache();
		}

		const file = raw as Partial<RadioBrowserCacheFile>;
		if (!file.entries || typeof file.entries !== 'object') {
			return emptyCache();
		}

		return {
			schemaVersion: SCHEMA_VERSION,
			updatedAt:
				typeof file.updatedAt === 'string'
					? file.updatedAt
					: new Date().toISOString(),
			entries: file.entries,
		};
	} catch (error) {
		logger.warn('RadioBrowserCache', 'Failed to read cache', {
			error: error instanceof Error ? error.message : String(error),
		});
		return emptyCache();
	}
}

function writeCacheFile(cache: RadioBrowserCacheFile): void {
	const path = getCachePath();
	const dir = join(path, '..');
	if (!existsSync(dir)) {
		mkdirSync(dir, {recursive: true});
	}

	const tmp = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
		renameSync(tmp, path);
	} catch (error) {
		try {
			if (existsSync(tmp)) {
				unlinkSync(tmp);
			}
		} catch {
			// ignore cleanup errors
		}
		logger.warn('RadioBrowserCache', 'Failed to write cache', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function cacheKeyForBrowse(countrycode: string, limit: number): string {
	return `browse:${countrycode.toUpperCase()}:${limit}`;
}

export function getCachedStations(
	key: string,
	options?: {allowStale?: boolean; ttlMs?: number},
): {stations: RadioStation[]; stale: boolean} | null {
	const cache = readCacheFile();
	const entry = cache.entries[key];
	if (!entry || !Array.isArray(entry.stations)) {
		return null;
	}

	const fetchedAt = Date.parse(entry.fetchedAt);
	const ttl = options?.ttlMs ?? RADIO_BROWSER_CACHE_TTL_MS;
	const age = Number.isFinite(fetchedAt) ? Date.now() - fetchedAt : Infinity;
	const stale = age > ttl;

	if (stale && !options?.allowStale) {
		return null;
	}

	return {stations: entry.stations, stale};
}

export function setCachedStations(key: string, stations: RadioStation[]): void {
	const cache = readCacheFile();
	cache.entries[key] = {
		fetchedAt: new Date().toISOString(),
		stations,
	};
	cache.updatedAt = new Date().toISOString();
	writeCacheFile(cache);
}
