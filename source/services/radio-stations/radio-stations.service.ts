import {BUILTIN_RADIO_STATIONS} from '../../data/builtin-radio-stations.ts';
import type {RadioStation} from '../../types/radio-station.types.ts';
import {getConfigService} from '../config/config.service.ts';
import {getPlayerService} from '../player/player.service.ts';

export function getBuiltinStations(): readonly RadioStation[] {
	return BUILTIN_RADIO_STATIONS;
}

export function getStationById(id: string): RadioStation | undefined {
	return BUILTIN_RADIO_STATIONS.find(station => station.id === id);
}

export async function playStationStream(
	station: RadioStation,
	volume?: number,
): Promise<void> {
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
