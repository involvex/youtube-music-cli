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
	RadioFavoritesFile,
	RadioStation,
} from '../../types/radio-station.types.ts';
import {CONFIG_DIR} from '../../utils/constants.ts';
import {logger} from '../logger/logger.service.ts';

const FAVORITES_FILE = join(CONFIG_DIR, 'radio-favorites.json');
const SCHEMA_VERSION = 1;

let favoritesPathOverride: string | null = null;
let hydrated = false;
let favoriteStations: RadioStation[] = [];

export function setRadioFavoritesPathForTests(path: string | null): void {
	favoritesPathOverride = path;
}

export function resetRadioFavoritesForTests(): void {
	hydrated = false;
	favoriteStations = [];
}

function getFavoritesPath(): string {
	return favoritesPathOverride ?? FAVORITES_FILE;
}

function isRadioStation(value: unknown): value is RadioStation {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const station = value as RadioStation;
	return (
		typeof station.id === 'string' &&
		station.id.length > 0 &&
		typeof station.name === 'string' &&
		station.name.length > 0 &&
		typeof station.streamUrl === 'string' &&
		station.streamUrl.startsWith('http')
	);
}

function readFavoritesFile(): RadioStation[] {
	const path = getFavoritesPath();
	if (!existsSync(path)) {
		return [];
	}

	try {
		const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
		if (!raw || typeof raw !== 'object') {
			return [];
		}

		const file = raw as Partial<RadioFavoritesFile>;
		if (!Array.isArray(file.stations)) {
			return [];
		}

		return file.stations.filter(isRadioStation);
	} catch (error) {
		logger.warn('RadioFavorites', 'Failed to read favorites', {
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

function writeFavoritesFile(stations: RadioStation[]): void {
	const path = getFavoritesPath();
	const dir = join(path, '..');
	if (!existsSync(dir)) {
		mkdirSync(dir, {recursive: true});
	}

	const payload: RadioFavoritesFile = {
		schemaVersion: SCHEMA_VERSION,
		stations,
		lastUpdated: new Date().toISOString(),
	};
	const tmp = `${path}.${process.pid}.tmp`;
	try {
		writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
		renameSync(tmp, path);
	} catch (error) {
		try {
			if (existsSync(tmp)) {
				unlinkSync(tmp);
			}
		} catch {
			// ignore cleanup errors
		}
		logger.warn('RadioFavorites', 'Failed to write favorites', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function hydrateRadioFavorites(): readonly RadioStation[] {
	if (!hydrated) {
		favoriteStations = readFavoritesFile();
		hydrated = true;
	}

	return favoriteStations;
}

export function getRadioFavorites(): readonly RadioStation[] {
	return hydrateRadioFavorites();
}

export function isRadioFavorite(stationId: string): boolean {
	return hydrateRadioFavorites().some(station => station.id === stationId);
}

export function toggleRadioFavorite(station: RadioStation): boolean {
	hydrateRadioFavorites();
	const index = favoriteStations.findIndex(item => item.id === station.id);
	if (index >= 0) {
		favoriteStations = [
			...favoriteStations.slice(0, index),
			...favoriteStations.slice(index + 1),
		];
		writeFavoritesFile(favoriteStations);
		return false;
	}

	favoriteStations = [...favoriteStations, station];
	writeFavoritesFile(favoriteStations);
	return true;
}
