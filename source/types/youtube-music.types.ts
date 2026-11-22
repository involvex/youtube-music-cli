// YouTube Music API type definitions
export interface Artist {
	artistId: string;
	name: string;
}

export interface Album {
	albumId: string;
	name: string;
	artists: Artist[];
	tracks?: Track[];
}

export interface Track {
	videoId: string;
	title: string;
	artists: Artist[];
	album?: Album;
	duration?: number;
}

export interface Playlist {
	playlistId: string;
	name: string;
	tracks: Track[];
}

export interface Genre {
	title: string;
	browseId: string;
	params?: string;
}

export interface Release {
	title: string;
	browseId: string;
	artist: string;
	subtitle?: string;
}

export interface SearchResult {
	type: 'song' | 'album' | 'artist' | 'playlist';
	data: Track | Album | Artist | Playlist;
}

export interface SearchResponse {
	results: SearchResult[];
	hasMore: boolean;
	continuation?: string;
}

export interface SearchOptions {
	type?: 'all' | 'songs' | 'albums' | 'artists' | 'playlists';
	limit?: number;
	continuation?: string;
}

export type SearchDurationFilter = 'all' | 'short' | 'medium' | 'long';

export interface SearchFilters {
	artist?: string;
	album?: string;
	year?: string;
	duration?: SearchDurationFilter;
}
