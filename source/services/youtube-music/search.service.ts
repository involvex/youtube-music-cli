// Search service for YouTube Music
import type {
	SearchOptions,
	Track,
	Album,
	Artist,
	Playlist,
} from '../../types/youtube-music.types.ts';
import {getMusicService} from './api.ts';

class SearchService {
	private musicService = getMusicService();

	async search(query: string, options: SearchOptions = {}): Promise {
		return this.musicService.search(query, options);
	}

	async searchSongs(query: string, limit = 20): Promise {
		const response = await this.search(query, {type: 'songs', limit});
		return response.results
			.filter(r => r.type === 'song')
			.map(r => r.data as Track);
	}

	async searchAlbums(query: string, limit = 10): Promise {
		const response = await this.search(query, {type: 'albums', limit});
		return response.results
			.filter(r => r.type === 'album')
			.map(r => r.data as Album);
	}

	async searchArtists(query: string, limit = 10): Promise {
		const response = await this.search(query, {type: 'artists', limit});
		return response.results
			.filter(r => r.type === 'artist')
			.map(r => r.data as Artist);
	}

	async searchPlaylists(query: string, limit = 10): Promise {
		const response = await this.search(query, {type: 'playlists', limit});
		return response.results
			.filter(r => r.type === 'playlist')
			.map(r => r.data as Playlist);
	}
}

let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
	if (!searchServiceInstance) {
		searchServiceInstance = new SearchService();
	}
	return searchServiceInstance;
}
