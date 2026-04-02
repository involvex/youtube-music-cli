// Tool definitions for Gemini function calling
import type {ToolDefinition} from '../../types/llm.types.ts';

export function getToolDefinitions(): ToolDefinition[] {
	return [
		{
			name: 'search_tracks',
			description: 'Search for tracks on YouTube Music',
			parameters: {
				type: 'object',
				properties: {
					query: {type: 'string', description: 'Search query for tracks'},
					limit: {
						type: 'number',
						description: 'Maximum number of results (default: 10)',
					},
				},
				required: ['query'],
			},
		},
		{
			name: 'get_track_info',
			description: 'Get detailed information about a track',
			parameters: {
				type: 'object',
				properties: {
					videoId: {type: 'string', description: 'YouTube video ID'},
				},
				required: ['videoId'],
			},
		},
		{
			name: 'get_playlist',
			description: 'Get details of a playlist',
			parameters: {
				type: 'object',
				properties: {
					playlistId: {type: 'string', description: 'YouTube playlist ID'},
				},
				required: ['playlistId'],
			},
		},
		{
			name: 'create_playlist',
			description: 'Create a new playlist',
			parameters: {
				type: 'object',
				properties: {
					name: {type: 'string', description: 'Playlist name'},
					trackIds: {
						type: 'array',
						items: {type: 'string'},
						description: 'Array of YouTube video IDs to add',
					},
				},
				required: ['name', 'trackIds'],
			},
		},
		{
			name: 'add_to_playlist',
			description: 'Add tracks to an existing playlist',
			parameters: {
				type: 'object',
				properties: {
					playlistId: {type: 'string', description: 'Playlist ID'},
					trackIds: {
						type: 'array',
						items: {type: 'string'},
						description: 'Array of YouTube video IDs to add',
					},
				},
				required: ['playlistId', 'trackIds'],
			},
		},
		{
			name: 'get_user_playlists',
			description: 'Get all user playlists',
			parameters: {
				type: 'object',
				properties: {},
				required: [],
			},
		},
		{
			name: 'get_queue',
			description: 'Get the current play queue',
			parameters: {
				type: 'object',
				properties: {},
				required: [],
			},
		},
		{
			name: 'add_to_queue',
			description: 'Add tracks to the play queue',
			parameters: {
				type: 'object',
				properties: {
					trackIds: {
						type: 'array',
						items: {type: 'string'},
						description: 'Array of YouTube video IDs to add to queue',
					},
				},
				required: ['trackIds'],
			},
		},
		{
			name: 'get_suggestions',
			description: 'Get track suggestions based on a track',
			parameters: {
				type: 'object',
				properties: {
					videoId: {type: 'string', description: 'YouTube video ID'},
				},
				required: ['videoId'],
			},
		},
		{
			name: 'get_user_favorites',
			description: 'Get user favorite tracks',
			parameters: {
				type: 'object',
				properties: {},
				required: [],
			},
		},
	];
}
