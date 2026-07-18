import type {RadioStation} from '../../types/radio-station.types.ts';
import {logger} from '../logger/logger.service.ts';
import {
	cacheKeyForBrowse,
	getCachedStations,
	setCachedStations,
} from './radio-browser-cache.ts';

const USER_AGENT = 'youtube-music-cli/radio-browser';
const DEFAULT_BROWSE_LIMIT = 50;
const DEFAULT_SEARCH_LIMIT = 40;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 12_000;

const API_MIRRORS = [
	'https://de1.api.radio-browser.info',
	'https://nl1.api.radio-browser.info',
	'https://at1.api.radio-browser.info',
] as const;

type ApiStation = {
	stationuuid?: string;
	name?: string;
	url?: string;
	url_resolved?: string;
	tags?: string;
	country?: string;
	countrycode?: string;
	lastcheckok?: number;
};

export type BrowseStationsResult = {
	stations: RadioStation[];
	fromCache: boolean;
	stale: boolean;
};

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

export function mapApiStationToRadioStation(
	station: ApiStation,
): RadioStation | null {
	const uuid = station.stationuuid?.trim();
	const name = station.name?.trim();
	const streamUrl = (station.url_resolved || station.url || '').trim();

	if (!uuid || !name || !streamUrl) {
		return null;
	}

	if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
		return null;
	}

	if (station.lastcheckok !== undefined && station.lastcheckok !== 1) {
		return null;
	}

	const firstTag = station.tags
		?.split(',')
		.map(tag => tag.trim())
		.find(tag => tag.length > 0);

	return {
		id: `rb-${uuid}`,
		name,
		streamUrl,
		region: station.country?.trim() || station.countrycode?.trim() || undefined,
		genre: firstTag,
		source: 'radio-browser',
		stationuuid: uuid,
	};
}

function mapStations(stations: ApiStation[]): RadioStation[] {
	const mapped: RadioStation[] = [];
	const seen = new Set<string>();

	for (const station of stations) {
		const result = mapApiStationToRadioStation(station);
		if (!result || seen.has(result.id)) {
			continue;
		}

		seen.add(result.id);
		mapped.push(result);
	}

	return mapped;
}

async function fetchJson(
	baseUrl: string,
	path: string,
	params: Record<string, string | number | boolean>,
): Promise<unknown> {
	const url = new URL(path, `${baseUrl}/`);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'User-Agent': USER_AGENT,
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return (await response.json()) as unknown;
	} finally {
		clearTimeout(timeout);
	}
}

async function requestWithFallback(
	path: string,
	params: Record<string, string | number | boolean>,
): Promise<unknown> {
	let lastError: unknown;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const mirror = API_MIRRORS[attempt % API_MIRRORS.length]!;
		try {
			return await fetchJson(mirror, path, params);
		} catch (error) {
			lastError = error;
			logger.debug('RadioBrowser', 'Request failed, retrying', {
				mirror,
				attempt: attempt + 1,
				error: error instanceof Error ? error.message : String(error),
			});
			if (attempt < MAX_RETRIES - 1) {
				await sleep(250 * (attempt + 1));
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error('Radio Browser request failed');
}

export async function browseStations(options?: {
	countrycode?: string;
	limit?: number;
}): Promise<BrowseStationsResult> {
	const countrycode = (options?.countrycode ?? 'DE').toUpperCase();
	const limit = options?.limit ?? DEFAULT_BROWSE_LIMIT;
	const cacheKey = cacheKeyForBrowse(countrycode, limit);

	const fresh = getCachedStations(cacheKey);
	if (fresh && !fresh.stale) {
		return {stations: fresh.stations, fromCache: true, stale: false};
	}

	const params: Record<string, string | number | boolean> = {
		order: 'votes',
		reverse: true,
		hidebroken: true,
		limit,
	};
	if (countrycode !== 'ALL') {
		params.countrycode = countrycode;
	}

	try {
		const payload = await requestWithFallback('json/stations/search', params);
		const stations = mapStations(
			Array.isArray(payload) ? (payload as ApiStation[]) : [],
		);
		setCachedStations(cacheKey, stations);
		return {stations, fromCache: false, stale: false};
	} catch (error) {
		const stale = getCachedStations(cacheKey, {allowStale: true});
		if (stale) {
			logger.warn('RadioBrowser', 'browseStations using stale cache', {
				error: error instanceof Error ? error.message : String(error),
				countrycode,
			});
			return {stations: stale.stations, fromCache: true, stale: true};
		}

		logger.warn('RadioBrowser', 'browseStations failed', {
			error: error instanceof Error ? error.message : String(error),
			countrycode,
		});
		throw error;
	}
}

export async function searchRadioStations(
	query: string,
	options?: {limit?: number},
): Promise<RadioStation[]> {
	const trimmed = query.trim();
	if (!trimmed) {
		return [];
	}

	const limit = options?.limit ?? DEFAULT_SEARCH_LIMIT;

	try {
		const payload = await requestWithFallback('json/stations/search', {
			name: trimmed,
			hidebroken: true,
			order: 'votes',
			reverse: true,
			limit,
		});
		return mapStations(Array.isArray(payload) ? (payload as ApiStation[]) : []);
	} catch (error) {
		logger.warn('RadioBrowser', 'searchRadioStations failed', {
			error: error instanceof Error ? error.message : String(error),
			query: trimmed,
		});
		throw error;
	}
}

export async function getRandomStation(options?: {
	countrycode?: string;
}): Promise<RadioStation | null> {
	const countrycode = (options?.countrycode ?? 'DE').toUpperCase();
	const params: Record<string, string | number | boolean> = {
		order: 'random',
		hidebroken: true,
		limit: 1,
	};
	if (countrycode !== 'ALL') {
		params.countrycode = countrycode;
	}

	try {
		const payload = await requestWithFallback('json/stations/search', params);
		const mapped = mapStations(
			Array.isArray(payload) ? (payload as ApiStation[]) : [],
		);
		return mapped[0] ?? null;
	} catch (error) {
		logger.warn('RadioBrowser', 'getRandomStation failed', {
			error: error instanceof Error ? error.message : String(error),
			countrycode,
		});
		throw error;
	}
}

export function notifyStationClick(stationuuid: string): void {
	const uuid = stationuuid.trim();
	if (!uuid) {
		return;
	}

	void (async () => {
		try {
			await requestWithFallback(`json/url/${encodeURIComponent(uuid)}`, {});
		} catch (error) {
			logger.debug('RadioBrowser', 'clickStation failed', {
				error: error instanceof Error ? error.message : String(error),
				stationuuid: uuid,
			});
		}
	})();
}
