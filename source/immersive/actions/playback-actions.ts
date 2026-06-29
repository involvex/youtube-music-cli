import {getConfigService} from '../../services/config/config.service.ts';
import {logger} from '../../services/logger/logger.service.ts';
import type {
	Album,
	Artist,
	Playlist,
	SearchResponse,
	SearchResult,
	Track,
} from '../../types/youtube-music.types.ts';
import {formatTime, truncate} from '../../utils/format.ts';

export interface ImmersiveMusicService {
	search(
		query: string,
		options?: {type?: string; limit?: number},
	): Promise<SearchResponse>;
	getSuggestions(trackId: string): Promise<Track[]>;
	getReleaseTracks(browseId: string): Promise<Track[]>;
	getPlaylist(playlistId: string): Promise<Playlist>;
}

export type PlaySearchResult =
	{ok: true; tracks: Track[]} | {ok: false; message: string};

export type CreateMixResult =
	| {ok: true; tracks: Track[]; playlistName: string}
	| {ok: false; message: string};

export function loadPlaylists(): Playlist[] {
	return getConfigService().get('playlists');
}

export function savePlaylists(playlists: Playlist[]): void {
	getConfigService().set('playlists', playlists);
}

export function createSavedPlaylist(name: string, tracks: Track[]): Playlist {
	const playlist: Playlist = {
		playlistId: Date.now().toString(),
		name,
		tracks: tracks.map(track => ({...track})),
	};
	const playlists = [...loadPlaylists(), playlist];
	savePlaylists(playlists);
	return playlist;
}

export function dedupeTracks(tracks: Track[]): Track[] {
	const unique: Track[] = [];
	const seen = new Set<string>();
	for (const track of tracks) {
		if (!track?.videoId || seen.has(track.videoId)) continue;
		seen.add(track.videoId);
		unique.push(track);
	}
	return unique;
}

export async function playSearchResult(
	result: SearchResult,
	musicService: ImmersiveMusicService,
): Promise<PlaySearchResult> {
	if (result.type === 'song') {
		return {ok: true, tracks: [result.data as Track]};
	}

	if (result.type === 'artist') {
		const artistName =
			'name' in result.data ? (result.data as Artist).name : '';
		if (!artistName) {
			return {ok: false, message: 'Artist name missing'};
		}

		try {
			const response = await musicService.search(artistName, {
				type: 'songs',
				limit: 20,
			});
			const tracks = response.results
				.filter(item => item.type === 'song')
				.map(item => item.data as Track);
			if (tracks.length === 0) {
				return {ok: false, message: `No songs found for ${artistName}`};
			}
			return {ok: true, tracks};
		} catch (error) {
			logger.error('PlaybackActions', 'Failed to play artist', {error});
			return {ok: false, message: 'Failed to load artist songs'};
		}
	}

	if (result.type === 'album') {
		const album = result.data as Album;
		if (!album.albumId) {
			return {ok: false, message: 'Album ID missing'};
		}

		try {
			const tracks = await musicService.getReleaseTracks(album.albumId);
			if (tracks.length === 0) {
				return {ok: false, message: `No tracks found in ${album.name}`};
			}
			return {ok: true, tracks};
		} catch (error) {
			logger.error('PlaybackActions', 'Failed to play album', {error});
			return {ok: false, message: 'Failed to load album tracks'};
		}
	}

	if (result.type === 'playlist') {
		const playlist = result.data as Playlist;
		if (playlist.tracks.length > 0) {
			return {ok: true, tracks: playlist.tracks};
		}

		if (!playlist.playlistId) {
			return {ok: false, message: 'Playlist ID missing'};
		}

		try {
			const loaded = await musicService.getPlaylist(playlist.playlistId);
			if (loaded.tracks.length === 0) {
				return {ok: false, message: `No tracks in ${loaded.name}`};
			}
			return {ok: true, tracks: loaded.tracks};
		} catch (error) {
			logger.error('PlaybackActions', 'Failed to play playlist', {error});
			return {ok: false, message: 'Failed to load playlist'};
		}
	}

	return {ok: false, message: 'Unsupported result type'};
}

export async function createMixFromResult(
	result: SearchResult,
	musicService: ImmersiveMusicService,
): Promise<CreateMixResult> {
	let playlistName = 'Dynamic mix';
	const collectedTracks: Track[] = [];

	if (result.type === 'song') {
		const selectedTrack = result.data as Track;
		playlistName = `Mix for ${selectedTrack.title || 'selected track'}`;
		collectedTracks.push(selectedTrack);

		try {
			const suggestions = await musicService.getSuggestions(
				selectedTrack.videoId,
			);
			collectedTracks.push(...suggestions);
		} catch (error) {
			logger.error('PlaybackActions', 'Failed to fetch song suggestions', {
				error,
			});
		}
	} else if (result.type === 'artist') {
		const artistName =
			'name' in result.data ? (result.data as Artist).name : '';
		if (!artistName) {
			return {ok: false, message: 'Artist information is missing'};
		}

		playlistName = `${artistName} mix`;

		try {
			const response = await musicService.search(artistName, {
				type: 'songs',
				limit: 25,
			});
			const artistTracks = response.results
				.filter(item => item.type === 'song')
				.map(item => item.data as Track);
			collectedTracks.push(...artistTracks);
		} catch (error) {
			logger.error('PlaybackActions', 'Failed to fetch artist songs for mix', {
				error,
			});
		}
	} else {
		return {
			ok: false,
			message: 'Mix is only supported for songs and artists',
		};
	}

	const uniqueTracks = dedupeTracks(collectedTracks);
	if (uniqueTracks.length === 0) {
		return {ok: false, message: 'No similar tracks found for mix'};
	}

	createSavedPlaylist(playlistName, uniqueTracks);
	return {ok: true, tracks: uniqueTracks, playlistName};
}

export function getSearchResultLabel(result: SearchResult): string {
	const data = result.data;
	if (result.type === 'song' && 'title' in data) {
		return (data as Track).title;
	}
	if ('name' in data) {
		return (data as Album | Artist | Playlist).name;
	}
	return 'Unknown';
}

export function getSearchResultPrefix(type: SearchResult['type']): string {
	switch (type) {
		case 'song':
			return '♪';
		case 'album':
			return '◎';
		case 'artist':
			return '★';
		case 'playlist':
			return '≡';
		default:
			return '?';
	}
}

export function formatSearchResultLine(
	result: SearchResult,
	maxWidth: number,
): string {
	const prefix = getSearchResultPrefix(result.type);
	const typeTag = result.type.toUpperCase().padEnd(8);
	const title = getSearchResultLabel(result);
	let extra = '';

	if (result.type === 'song' && 'title' in result.data) {
		const track = result.data as Track;
		const artist = track.artists.map(entry => entry.name).join(', ');
		if (artist) {
			extra += ` · ${truncate(artist, 22)}`;
		}

		if (track.duration) {
			extra += ` · ${formatTime(track.duration)}`;
		}
	}

	return truncate(`${prefix} ${typeTag} ${title}${extra}`, maxWidth);
}
