import {BUILTIN_RADIO_STATIONS} from '../../data/builtin-radio-stations.ts';
import type {RadioStation} from '../../types/radio-station.types.ts';
import {getConfigService} from '../config/config.service.ts';
import {getPlayerService} from '../player/player.service.ts';
import {
	browseStations,
	getRandomStation,
	notifyStationClick,
	searchRadioStations,
	type BrowseStationsResult,
} from './radio-browser.service.ts';
import {getRadioFavorites} from './radio-favorites.service.ts';

export type RadioStationList = {
	favorites: readonly RadioStation[];
	builtins: readonly RadioStation[];
	remote: RadioStation[];
	fromCache?: boolean;
	stale?: boolean;
};

export function getBuiltinStations(): readonly RadioStation[] {
	return BUILTIN_RADIO_STATIONS;
}

export function getStationById(id: string): RadioStation | undefined {
	return BUILTIN_RADIO_STATIONS.find(station => station.id === id);
}

export function flattenRadioStations(list: RadioStationList): RadioStation[] {
	const seen = new Set<string>();
	const flat: RadioStation[] = [];

	for (const station of [...list.favorites, ...list.builtins, ...list.remote]) {
		if (seen.has(station.id)) {
			continue;
		}
		seen.add(station.id);
		flat.push(station);
	}

	return flat;
}

function withFavorites(
	remote: RadioStation[],
	meta?: Pick<BrowseStationsResult, 'fromCache' | 'stale'>,
): RadioStationList {
	return {
		favorites: getRadioFavorites(),
		builtins: getBuiltinStations(),
		remote,
		fromCache: meta?.fromCache,
		stale: meta?.stale,
	};
}

export async function loadBrowseStations(options?: {
	countrycode?: string;
	limit?: number;
}): Promise<RadioStationList> {
	const result = await browseStations(options);
	return withFavorites(result.stations, result);
}

export async function loadSearchStations(
	query: string,
	options?: {limit?: number},
): Promise<RadioStationList> {
	const remote = await searchRadioStations(query, options);
	return withFavorites(remote);
}

export async function loadRandomStation(options?: {
	countrycode?: string;
}): Promise<RadioStation | null> {
	return getRandomStation(options);
}

export async function playStationStream(
	station: RadioStation,
	volume?: number,
): Promise<void> {
	if (station.stationuuid) {
		notifyStationClick(station.stationuuid);
	}

	const playerService = getPlayerService();
	const config = getConfigService();
	const effectiveVolume = volume ?? config.get('volume');

	await playerService.play(station.streamUrl, {
		volume: effectiveVolume,
		trackId: station.id,
		audioNormalization: config.get('audioNormalization') ?? false,
		proxy: config.get('proxy'),
		gaplessPlayback: config.get('gaplessPlayback') ?? true,
		crossfadeDuration: config.get('crossfadeDuration') ?? 0,
		equalizerPreset: config.get('equalizerPreset') ?? 'flat',
		volumeFadeDuration: config.get('volumeFadeDuration') ?? 0,
	});
}
