// Radio service - manages radio mode playback
// Generates endless queues of related tracks from a seed
import {getMusicService} from '../youtube-music/api.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';
import {formatError} from '../../utils/error.ts';
import type {Track} from '../../types/youtube-music.types.ts';
import type {RadioSeed, RadioSeedType} from '../../types/radio.types.ts';
import {BUILTIN_MOODS} from '../../data/builtin-moods.ts';
import {findLocalPlaylistTracks} from './local-playlist-seed.ts';
import {buildDiscoveryTracks} from './discovery-queue.service.ts';

class RadioService {
	private playedVideoIds: Set<string> = new Set();
	private refillAnchors: Track[] = [];
	private refillAnchorIndex = 0;
	private genrePlaylistIds: string[] = [];
	private genrePlaylistIndex = 0;

	reset(): void {
		this.playedVideoIds.clear();
		this.refillAnchors = [];
		this.refillAnchorIndex = 0;
		this.genrePlaylistIds = [];
		this.genrePlaylistIndex = 0;
	}

	async fetchTracksForSeed(seed: RadioSeed): Promise<Track[]> {
		logger.debug('RadioService', 'fetchTracksForSeed called', {
			type: seed.type,
			id: seed.id,
			name: seed.name,
		});
		this.reset();
		const tracks = await this.fetchBySeedType(seed.type, seed.id);
		// Discovery sets history-based anchors inside fetchBySeedType; keep them.
		if (seed.type !== 'discovery' || this.refillAnchors.length === 0) {
			this.setRefillAnchors(tracks);
		}
		logger.debug('RadioService', 'fetchTracksForSeed result', {
			type: seed.type,
			id: seed.id,
			trackCount: tracks.length,
			anchorCount: this.refillAnchors.length,
		});
		return this.deduplicate(tracks);
	}

	async fetchMoreTracks(seed: RadioSeed): Promise<Track[]> {
		let tracks: Track[];

		if (seed.type === 'track') {
			tracks = await getMusicService().getSuggestions(seed.id);
		} else if (seed.type === 'local-playlist') {
			const stored = findLocalPlaylistTracks(
				getConfigService().get('playlists'),
				seed.id,
			);
			const anchor = stored?.find(track => track.videoId);
			tracks = anchor?.videoId
				? await getMusicService().getSuggestions(anchor.videoId)
				: [];
		} else if (seed.type === 'genre') {
			tracks = await this.fetchMoreGenreTracks();
		} else if (
			seed.type === 'artist' ||
			seed.type === 'mood' ||
			seed.type === 'album' ||
			seed.type === 'playlist' ||
			seed.type === 'discovery'
		) {
			tracks = await this.fetchSuggestionsFromNextAnchor();
		} else {
			tracks = await this.fetchBySeedType(seed.type, seed.id);
		}

		return this.deduplicate(tracks);
	}

	private setRefillAnchors(tracks: Track[]): void {
		this.refillAnchors = tracks.filter(track => Boolean(track.videoId));
		this.refillAnchorIndex = 0;
	}

	private async fetchSuggestionsFromNextAnchor(): Promise<Track[]> {
		if (this.refillAnchors.length === 0) {
			return [];
		}

		const anchor =
			this.refillAnchors[this.refillAnchorIndex % this.refillAnchors.length];
		this.refillAnchorIndex =
			(this.refillAnchorIndex + 1) % this.refillAnchors.length;

		if (!anchor?.videoId) {
			return [];
		}

		return getMusicService().getSuggestions(anchor.videoId);
	}

	private async fetchMoreGenreTracks(): Promise<Track[]> {
		const nextIndex = this.genrePlaylistIndex + 1;
		if (nextIndex < this.genrePlaylistIds.length) {
			this.genrePlaylistIndex = nextIndex;
			const browseId = this.genrePlaylistIds[nextIndex];
			if (browseId) {
				try {
					const playlist = await getMusicService().getPlaylist(browseId);
					const tracks = playlist.tracks ?? [];
					if (tracks.length > 0) {
						this.setRefillAnchors([...this.refillAnchors, ...tracks]);
						return tracks;
					}
				} catch (error) {
					logger.error('RadioService', 'Failed to load next genre playlist', {
						browseId,
						error: formatError(error),
					});
				}
			}
		}

		return this.fetchSuggestionsFromNextAnchor();
	}

	private async fetchBySeedType(
		type: RadioSeedType,
		id: string,
	): Promise<Track[]> {
		const musicService = getMusicService();

		try {
			switch (type) {
				case 'track': {
					const suggestions = await musicService.getSuggestions(id);
					return suggestions;
				}

				case 'artist': {
					logger.debug('RadioService', 'Searching for artist', {
						artistName: id,
					});
					const artistResults = await musicService.search(id, {type: 'songs'});
					const tracks = artistResults.results
						.filter(r => r.type === 'song')
						.map(r => r.data as Track);
					return tracks.slice(0, 30);
				}

				case 'album': {
					const tracks = await musicService.getReleaseTracks(id);
					return tracks;
				}

				case 'playlist': {
					const playlist = await musicService.getPlaylist(id);
					return playlist.tracks ?? [];
				}

				case 'local-playlist': {
					const tracks = findLocalPlaylistTracks(
						getConfigService().get('playlists'),
						id,
					);
					if (!tracks) {
						logger.warn('RadioService', 'Local playlist not found', {id});
						return [];
					}
					return tracks;
				}

				case 'genre': {
					const genrePlaylists = await musicService.getGenrePlaylists(id);
					this.genrePlaylistIds = genrePlaylists
						.map(playlist => playlist.browseId)
						.filter((browseId): browseId is string => Boolean(browseId));
					this.genrePlaylistIndex = 0;
					const firstId = this.genrePlaylistIds[0];
					if (firstId) {
						const playlist = await musicService.getPlaylist(firstId);
						return playlist.tracks ?? [];
					}
					return [];
				}

				case 'mood': {
					const mood = BUILTIN_MOODS.find(m => m.id === id);
					if (!mood) {
						logger.warn('RadioService', 'Mood not found', {id});
						return [];
					}
					const allTracks: Track[] = [];
					for (const seed of mood.seeds) {
						const seedTracks = await this.fetchBySeedType(seed.type, seed.id);
						allTracks.push(...seedTracks);
					}
					return allTracks.slice(0, 50);
				}

				case 'discovery': {
					const result = await buildDiscoveryTracks();
					if (result.anchors.length > 0) {
						this.refillAnchors = result.anchors.filter(track =>
							Boolean(track.videoId),
						);
					}
					return result.tracks;
				}

				default:
					return [];
			}
		} catch (error) {
			logger.error('RadioService', 'Failed to fetch tracks for seed', {
				type,
				id,
				error: formatError(error),
			});
			return [];
		}
	}

	private deduplicate(tracks: Track[]): Track[] {
		const result: Track[] = [];
		for (const track of tracks) {
			if (track.videoId && !this.playedVideoIds.has(track.videoId)) {
				this.playedVideoIds.add(track.videoId);
				result.push(track);
			}
		}

		return result;
	}
}

let instance: RadioService | null = null;

export function getRadioService(): RadioService {
	if (!instance) {
		instance = new RadioService();
	}

	return instance;
}

export function resetRadioService(): void {
	instance = null;
}
