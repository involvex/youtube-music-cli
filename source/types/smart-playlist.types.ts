export type SmartPlaylistRuleId =
	'top_tracks_7d' | 'top_tracks_all' | 'rediscover' | 'top_artist_deep_dive';

export interface SmartPlaylistParams {
	limit?: number;
	days?: number;
	minPlays?: number;
}

export interface SmartPlaylistDefinition {
	id: string;
	name: string;
	rule: SmartPlaylistRuleId;
	params?: SmartPlaylistParams;
	autoRefresh?: 'manual' | 'on_play' | 'daily';
	lastGeneratedAt?: string;
}

export interface SmartPlaylistsFile {
	schemaVersion: number;
	definitions: SmartPlaylistDefinition[];
	lastUpdated: string;
}
