// Tool executor for LLM function calls
import type {ToolResult} from '../../types/llm.types.ts';
import {getMusicService} from '../youtube-music/api.ts';
import {getConfigService} from '../config/config.service.ts';
import {logger} from '../logger/logger.service.ts';

type ToolArgs = Record<string, unknown>;

export async function executeTool(
	toolName: string,
	args: ToolArgs,
): Promise<ToolResult> {
	const musicService = getMusicService();
	const configService = getConfigService();

	try {
		switch (toolName) {
			case 'search_tracks': {
				const query = String(args['query'] || '');
				const limit = Number(args['limit']) || 10;
				const response = await musicService.search(query, {
					type: 'songs',
					limit,
				});
				const tracks = response.results
					.filter(r => r.type === 'song')
					.map(r => ({
						id: (r.data as {videoId: string}).videoId,
						title: (r.data as {title: string}).title,
						artist: (
							r.data as {
								artists: Array<{name: string}>;
							}
						).artists[0]?.name,
					}));
				return {success: true, data: tracks};
			}

			case 'get_track_info': {
				const videoId = String(args['videoId']);
				const track = await musicService.getTrack(videoId);
				if (!track) {
					return {success: false, error: 'Track not found'};
				}
				return {
					success: true,
					data: {
						videoId: track.videoId,
						title: track.title,
						artists: track.artists.map(a => a.name),
						duration: track.duration,
					},
				};
			}

			case 'get_playlist': {
				const playlistId = String(args['playlistId'] || '');
				const playlist = await musicService.getPlaylist(playlistId);
				return {
					success: true,
					data: {
						id: playlist.playlistId,
						name: playlist.name,
						trackCount: playlist.tracks.length,
						tracks: playlist.tracks.map(t => ({
							id: t.videoId,
							title: t.title,
							artist: t.artists[0]?.name,
						})),
					},
				};
			}

			case 'create_playlist': {
				const name = String(args['name'] || '');
				const trackIds = (args['trackIds'] as string[]) || [];
				const currentPlaylists = configService.get('playlists') || [];
				const newPlaylist = {
					playlistId: `local-${Date.now()}`,
					name,
					tracks: trackIds.map(id => ({
						videoId: id,
						title: 'Unknown',
						artists: [],
					})),
				};
				currentPlaylists.push(newPlaylist);
				configService.set('playlists', currentPlaylists);
				logger.info('LLMToolExecutor', 'Created playlist', {
					name,
					trackCount: trackIds.length,
				});
				return {
					success: true,
					data: {playlistId: newPlaylist.playlistId, name},
				};
			}

			case 'add_to_playlist': {
				const playlistId = String(args['playlistId'] || '');
				const trackIds = (args['trackIds'] as string[]) || [];
				const currentPlaylists = configService.get('playlists') || [];
				const playlistIndex = currentPlaylists.findIndex(
					(p: {playlistId: string}) => p.playlistId === playlistId,
				);
				if (playlistIndex === -1) {
					return {success: false, error: 'Playlist not found'};
				}
				const playlist = currentPlaylists[playlistIndex];
				if (!playlist) {
					return {success: false, error: 'Playlist not found'};
				}
				const existingTracks = playlist.tracks || [];
				const newTracks = trackIds.map(id => ({
					videoId: id,
					title: 'Unknown',
					artists: [],
				}));
				playlist.tracks = [...existingTracks, ...newTracks];
				configService.set('playlists', currentPlaylists);
				logger.info('LLMToolExecutor', 'Added to playlist', {
					playlistId,
					count: trackIds.length,
				});
				return {success: true, data: {added: trackIds.length}};
			}

			case 'get_user_playlists': {
				const playlists = configService.get('playlists') || [];
				return {
					success: true,
					data: playlists.map((p: {playlistId: string; name: string}) => ({
						id: p.playlistId,
						name: p.name,
					})),
				};
			}

			case 'get_queue': {
				return {
					success: true,
					data: {message: 'Use add_to_queue to add tracks'},
				};
			}

			case 'add_to_queue': {
				const trackIds = (args['trackIds'] as string[]) || [];
				return {
					success: true,
					data: {
						message: `Added ${trackIds.length} tracks to queue`,
						trackIds,
					},
				};
			}

			case 'get_suggestions': {
				const videoId = String(args['videoId'] || '');
				const suggestions = await musicService.getSuggestions(videoId);
				return {
					success: true,
					data: suggestions.map(t => ({
						id: t.videoId,
						title: t.title,
						artist: t.artists[0]?.name,
					})),
				};
			}

			case 'get_user_favorites': {
				const favorites = configService.get('favorites') || [];
				return {success: true, data: {favorites: favorites as string[]}};
			}

			default: {
				return {success: false, error: `Unknown tool: ${toolName}`};
			}
		}
	} catch (error) {
		logger.error('LLMToolExecutor', 'Tool execution failed', {
			toolName,
			error: error instanceof Error ? error.message : String(error),
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
