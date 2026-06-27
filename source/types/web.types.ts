// Web UI and WebSocket type definitions

import type {PlayerAction, PlayerState} from './player.types.ts';
import type {ImportProgress, ImportResult} from './import.types.ts';
import type {Track, Album, Artist, Playlist} from './youtube-music.types.ts';

/** WebSocket server message types */
export type ServerMessage =
	| StateUpdateMessage
	| EventMessage
	| ErrorMessage
	| AuthMessage
	| ImportProgressMessage
	| ImportResultMessage
	| SearchResultsMessage
	| ConfigUpdateMessage;

/** Player state update message */
export interface StateUpdateMessage {
	type: 'state-update';
	state: Partial<PlayerState>;
}

/** Event message for one-time events */
export interface EventMessage {
	type: 'event';
	event:
		'connected' | 'disconnected' | 'client-connected' | 'client-disconnected';
	data?: unknown;
}

/** Error message from server */
export interface ErrorMessage {
	type: 'error';
	error: string;
	code?: string;
}

/** Authentication message */
export interface AuthMessage {
	type: 'auth';
	success: boolean;
	message?: string;
}

/** Import progress message */
export interface ImportProgressMessage {
	type: 'import-progress';
	data: ImportProgress;
}

/** Import result message */
export interface ImportResultMessage {
	type: 'import-result';
	data: ImportResult;
}

/** Search results message */
export interface SearchResultsMessage {
	type: 'search-results';
	results: SearchResult[];
}

/** Search result item */
export interface SearchResult {
	type: 'song' | 'album' | 'artist' | 'playlist';
	data: Track | Album | Artist | Playlist;
}

/** Configuration update message */
export interface ConfigUpdateMessage {
	type: 'config-update';
	config: Partial<Config>;
}

/** WebSocket client message types */
export type ClientMessage =
	| CommandMessage
	| AuthRequestMessage
	| ImportRequestMessage
	| SearchRequestMessage
	| ConfigUpdateRequestMessage;

/** Command message from client */
export interface CommandMessage {
	type: 'command';
	action: PlayerAction;
}

/** Authentication request from client */
export interface AuthRequestMessage {
	type: 'auth-request';
	token: string;
}

/** Import request from client */
export interface ImportRequestMessage {
	type: 'import-request';
	source: 'spotify' | 'youtube';
	url: string;
	name?: string;
}

/** Search request from client */
export interface SearchRequestMessage {
	type: 'search-request';
	query: string;
	searchType: 'all' | 'songs' | 'artists' | 'albums' | 'playlists';
}

/** Config update request from client */
export interface ConfigUpdateRequestMessage {
	type: 'config-update';
	config: Partial<Config>;
}

/** Configuration interface */
export interface Config {
	theme: string;
	volume: number;
	repeat: 'off' | 'all' | 'one';
	shuffle: boolean;
	streamQuality: 'low' | 'medium' | 'high';
	audioNormalization: boolean;
	notifications: boolean;
	discordRichPresence: boolean;
}

/** WebSocket client information */
export interface WebSocketClient {
	id: string;
	authenticated: boolean;
	connectedAt: number;
	lastHeartbeat: number;
}

/** Web server configuration */
export interface WebServerConfig {
	enabled: boolean;
	host: string;
	port: number;
	enableCors: boolean;
	allowedOrigins: string[];
	auth: {
		enabled: boolean;
		token?: string;
	};
}

/** Web server options for CLI flags */
export interface WebServerOptions {
	enabled: boolean;
	host?: string;
	port?: number;
	webOnly?: boolean;
	auth?: string;
}

/** Server statistics */
export interface ServerStats {
	uptime: number;
	clients: number;
	totalConnections: number;
}
