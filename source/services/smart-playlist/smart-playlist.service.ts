import type {HistoryEntry} from '../../types/history.types.ts';
import type {Playlist, Track} from '../../types/youtube-music.types.ts';
import type {SmartPlaylistDefinition} from '../../types/smart-playlist.types.ts';
import {loadHistory} from '../history/history.service.ts';
import {getConfigService} from '../config/config.service.ts';
import {getMusicService} from '../youtube-music/api.ts';
import {logger} from '../logger/logger.service.ts';
import {formatError} from '../../utils/error.ts';
import {
	defaultLimitForRule,
	materializeTracks,
} from './smart-playlist-rules.ts';
import {
	loadSmartPlaylistsFile,
	saveSmartPlaylistsFile,
} from './smart-playlist-storage.ts';

export type RefreshOptions = {
	entries?: HistoryEntry[];
};

/**
 * Append unplayed artist search hits so deep dive goes beyond history-only tracks.
 */
export async function enrichTopArtistDeepDive(
	historyTracks: Track[],
	definition: SmartPlaylistDefinition,
	historyEntries?: HistoryEntry[],
): Promise<Track[]> {
	const limit =
		definition.params?.limit ?? defaultLimitForRule('top_artist_deep_dive');
	let artistName = historyTracks[0]?.artists?.[0]?.name?.trim() ?? '';
	if (!artistName && historyEntries && historyEntries.length > 0) {
		const seeded = materializeTracks('top_artist_deep_dive', historyEntries, {
			limit: 1,
		});
		artistName = seeded[0]?.artists?.[0]?.name?.trim() ?? '';
	}
	if (!artistName || historyTracks.length >= limit) {
		return historyTracks.slice(0, limit);
	}

	try {
		const response = await getMusicService().search(artistName, {
			type: 'songs',
			limit: 25,
		});
		const knownIds = new Set(
			historyTracks.map(track => track.videoId).filter(Boolean),
		);
		const combined = [...historyTracks];
		for (const result of response.results) {
			if (combined.length >= limit) {
				break;
			}
			if (result.type !== 'song') {
				continue;
			}
			const track = result.data as Track;
			if (!track.videoId || knownIds.has(track.videoId)) {
				continue;
			}
			knownIds.add(track.videoId);
			combined.push(track);
		}
		return combined.slice(0, limit);
	} catch (error) {
		logger.warn('SmartPlaylistService', 'Deep dive artist search failed', {
			artistName,
			error: formatError(error),
		});
		return historyTracks.slice(0, limit);
	}
}

export function getMaterializedPlaylistId(definitionId: string): string {
	return `smart-${definitionId}`;
}

export interface SmartPlaylistRefreshResult {
	definition: SmartPlaylistDefinition;
	playlistId: string;
	trackCount: number;
	created: boolean;
}

function upsertMaterializedPlaylist(
	definition: SmartPlaylistDefinition,
	tracks: Track[],
): {playlist: Playlist; created: boolean} {
	const config = getConfigService();
	const playlists = [...config.get('playlists')];
	const playlistId = getMaterializedPlaylistId(definition.id);
	const existingIndex = playlists.findIndex(p => p.playlistId === playlistId);
	const trackCopies = tracks.map(track => ({...track}));

	if (existingIndex >= 0) {
		const existing = playlists[existingIndex]!;
		playlists[existingIndex] = {
			...existing,
			tracks: trackCopies,
		};
		config.set('playlists', playlists);
		return {playlist: playlists[existingIndex]!, created: false};
	}

	const playlist: Playlist = {
		playlistId,
		name: definition.name,
		tracks: trackCopies,
	};
	playlists.push(playlist);
	config.set('playlists', playlists);
	return {playlist, created: true};
}

export async function listDefinitions(): Promise<SmartPlaylistDefinition[]> {
	const file = await loadSmartPlaylistsFile();
	await saveSmartPlaylistsFile(file);
	return file.definitions;
}

export async function refreshOne(
	definitionId: string,
	options?: RefreshOptions,
): Promise<SmartPlaylistRefreshResult> {
	const file = await loadSmartPlaylistsFile();
	const definition = file.definitions.find(d => d.id === definitionId);
	if (!definition) {
		throw new Error(`Unknown smart playlist: ${definitionId}`);
	}

	const history = options?.entries ?? (await loadHistory());
	let tracks = materializeTracks(definition.rule, history, definition.params);
	if (definition.rule === 'top_artist_deep_dive') {
		tracks = await enrichTopArtistDeepDive(tracks, definition, history);
	}
	const {playlist, created} = upsertMaterializedPlaylist(definition, tracks);

	const lastGeneratedAt = new Date().toISOString();
	const updatedDefinitions = file.definitions.map(d =>
		d.id === definition.id ? {...d, lastGeneratedAt} : d,
	);
	await saveSmartPlaylistsFile({
		...file,
		definitions: updatedDefinitions,
		lastUpdated: lastGeneratedAt,
	});

	const updatedDefinition =
		updatedDefinitions.find(d => d.id === definition.id) ?? definition;

	logger.info('SmartPlaylistService', 'Refreshed smart playlist', {
		id: definition.id,
		trackCount: tracks.length,
		created,
	});

	return {
		definition: updatedDefinition,
		playlistId: playlist.playlistId,
		trackCount: tracks.length,
		created,
	};
}

export async function refreshAll(
	options?: RefreshOptions,
): Promise<SmartPlaylistRefreshResult[]> {
	const definitions = await listDefinitions();
	const results: SmartPlaylistRefreshResult[] = [];
	for (const definition of definitions) {
		results.push(await refreshOne(definition.id, options));
	}
	return results;
}

export function findMaterializedPlaylist(
	definitionId: string,
): Playlist | undefined {
	const playlistId = getMaterializedPlaylistId(definitionId);
	return getConfigService()
		.get('playlists')
		.find(p => p.playlistId === playlistId);
}
