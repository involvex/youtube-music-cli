// Type definitions for youtubei.js API responses
// These interfaces provide proper typing for the dynamic responses from the YouTube API

export interface VideoSearchResult {
	id: string;
	video_id?: string;
	title:
		| {
				text: string;
		  }
		| string;
	author?:
		| {
				name: string;
		  }
		| string;
	channel_id?: string;
	channel?: {
		id: string;
	};
	duration?:
		| {
				seconds: number;
		  }
		| number;
	type?: string;
}

export interface PlaylistSearchResult {
	id: string;
	title:
		| {
				text: string;
		  }
		| string;
	author?:
		| {
				name: string;
		  }
		| string;
}

export interface ChannelSearchResult {
	id: string;
	channelId?: string;
	author?:
		| {
				name: string;
		  }
		| string;
	name?: string;
}

export interface SearchResponse {
	videos?: VideoSearchResult[];
	playlists?: PlaylistSearchResult[];
	channels?: ChannelSearchResult[];
	[key: string]: unknown;
}

export interface RelatedContent {
	id: string;
	title?:
		| {
				text: string;
		  }
		| string;
	[key: string]: unknown;
}

export interface VideoInfo {
	related?: {
		contents: RelatedContent[];
	};
	chooseFormat?: (options: {type: string; quality: string}) => {
		url?: string;
		decipher?: (player: unknown) => string;
	} | null;
	[key: string]: unknown;
}
