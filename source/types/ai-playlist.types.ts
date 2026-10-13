export interface AITrack {
	videoId: string;
	title: string;
	artists: string[];
	duration?: number;
	source?: 'search' | 'suggestions' | 'radio';
}

export interface AIPlaylist {
	id: string;
	name: string;
	prompt: string;
	tracks: AITrack[];
	createdAt: number;
	modifiedAt?: number;
}
