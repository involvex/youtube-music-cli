// Playlist type definitions
export interface Playlist {
	playlistId: string;
	name: string;
	tracks: Track[];
}

export interface PlaylistEntry {
	playlistId: string;
}

export interface Playlist extends Playlist {
	entries: PlaylistEntry[];
}
