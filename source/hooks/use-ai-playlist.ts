import {useCallback} from 'react';
import {getLLMService} from '../services/llm/llm.service.ts';
import {getMusicService} from '../services/youtube-music/api.ts';
import {
	loadAIPlaylists,
	saveAIPlaylist,
	deleteAIPlaylist,
} from '../utils/ai-playlist-storage.ts';
import type {AIPlaylist, AITrack} from '../types/ai-playlist.types.ts';
import {logger} from '../services/logger/logger.service.ts';

export interface AIPlaylistResult {
	playlist: AIPlaylist;
	tracks: AITrack[];
}

interface ParsedTrack {
	videoId: string;
	title: string;
	artists: string[];
	duration?: number;
}

function isValidTrack(t: unknown): t is ParsedTrack {
	return (
		t !== null &&
		typeof t === 'object' &&
		'title' in t &&
		typeof (t as Record<string, unknown>).title === 'string'
	);
}

interface ToolTrackEntry {
	id?: unknown;
	videoId?: unknown;
	title?: unknown;
	artist?: unknown;
	artists?: unknown;
}

function normalizeToolTracks(data: unknown): ParsedTrack[] {
	const list = Array.isArray(data)
		? data
		: (data as {tracks?: unknown})?.tracks;
	if (!Array.isArray(list)) {
		return [];
	}
	const tracks: ParsedTrack[] = [];
	for (const entry of list as ToolTrackEntry[]) {
		if (!entry || typeof entry !== 'object') {
			continue;
		}
		const title = typeof entry.title === 'string' ? entry.title : '';
		if (!title) {
			continue;
		}
		const videoId =
			typeof entry.id === 'string'
				? entry.id
				: typeof entry.videoId === 'string'
					? entry.videoId
					: '';
		const artists =
			typeof entry.artist === 'string'
				? [entry.artist]
				: Array.isArray(entry.artists)
					? entry.artists.filter((a): a is string => typeof a === 'string')
					: [];
		tracks.push({videoId, title, artists});
	}
	return tracks;
}

async function resolveVideoId(
	track: ParsedTrack,
	index: number,
): Promise<string> {
	if (track.videoId && !track.videoId.startsWith('search:')) {
		return track.videoId;
	}
	try {
		const musicService = getMusicService();
		const query = `${track.title} ${track.artists.join(' ')}`.trim();
		const response = await musicService.search(query, {
			type: 'songs',
			limit: 3,
		});
		const first = response.results.find(r => r.type === 'song');
		if (first) {
			const data = first.data as {videoId?: string};
			if (data.videoId) {
				return data.videoId;
			}
		}
	} catch (error) {
		logger.debug('useAIPlaylist', `Search resolve failed for track ${index}`, {
			title: track.title,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return track.videoId || `search:${track.title}`;
}

export function useAIPlaylist() {
	const llm = getLLMService();

	const loadPlaylists = useCallback(() => loadAIPlaylists(), []);

	const savePlaylist = useCallback((playlist: AIPlaylist) => {
		saveAIPlaylist(playlist);
	}, []);

	const deletePlaylist = useCallback((id: string) => {
		deleteAIPlaylist(id);
	}, []);

	const generatePlaylist = useCallback(
		async (prompt: string, trackCount = 20): Promise<AIPlaylistResult> => {
			if (!llm.isConfigured()) {
				throw new Error(
					'AI not configured. Please set up your API key in Settings.',
				);
			}

			const systemPrompt = `You are a music curator for YouTube Music CLI. Generate a playlist based on user input.

Input types:
- Song title: "Bohemian Rhapsody" → create playlist of similar tracks/era
- Track URL: "https://music.youtube.com/watch?v=..." → use as seed
- Topic/mood: "relaxing evening jazz" → curate themed playlist

Return ONLY a JSON object with this structure:
{
  "name": "playlist name",
  "description": "curation rationale",
  "tracks": [
    {"title": "Track Title", "artists": ["Artist Name"], "videoId": "optional if known"},
    ...
  ]
}

Generate exactly ${trackCount} tracks. If you don't know the videoId, omit it and we'll search for it.`;

			const context = {
				currentTrack: undefined,
				queueLength: 0,
				playlists: [],
			};

			logger.info(
				'useAIPlaylist',
				`Generating AI playlist for prompt: "${prompt}"`,
			);

			const response = await llm.chat(
				systemPrompt + '\n\nUser prompt: ' + prompt,
				context,
				[],
			);

			// Prefer real tool results (generate_playlist / search_tracks carry
			// resolved YouTube video IDs) over parsing free text.
			let parsedTracks: ParsedTrack[] = [];
			let playlistName = `AI: ${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}`;

			if (response.toolCalls && response.toolCalls.length > 0) {
				for (const toolCall of response.toolCalls) {
					if (!toolCall.result?.success) {
						continue;
					}
					if (
						toolCall.name === 'generate_playlist' ||
						toolCall.name === 'search_tracks'
					) {
						const fromTool = normalizeToolTracks(toolCall.result.data);
						if (fromTool.length > 0) {
							parsedTracks = [...parsedTracks, ...fromTool];
							if (
								toolCall.name === 'generate_playlist' &&
								toolCall.result.data !== null &&
								typeof toolCall.result.data === 'object' &&
								typeof (toolCall.result.data as {playlistName?: unknown})
									.playlistName === 'string'
							) {
								playlistName = (toolCall.result.data as {playlistName: string})
									.playlistName;
							}
						}
					}
				}
				const toolCallsText = response.toolCalls.map(tc => tc.name).join(', ');
				logger.debug('useAIPlaylist', 'LLM tool calls made', {
					toolCalls: toolCallsText,
				});
			}

			// Fall back to parsing the JSON response from the LLM text
			if (parsedTracks.length === 0) {
				try {
					// Try to find JSON in the response text
					const jsonMatch = response.text.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						const parsed = JSON.parse(jsonMatch[0]);
						if (parsed.tracks && Array.isArray(parsed.tracks)) {
							parsedTracks = parsed.tracks
								.filter(isValidTrack)
								.map((t: ParsedTrack) => ({
									videoId: typeof t.videoId === 'string' ? t.videoId : '',
									title: t.title,
									artists: Array.isArray(t.artists) ? t.artists : [],
									duration:
										typeof t.duration === 'number' ? t.duration : undefined,
								}))
								.slice(0, trackCount);
						}
						if (parsed.name && typeof parsed.name === 'string') {
							playlistName = parsed.name;
						}
					}
				} catch (e) {
					logger.error(
						'useAIPlaylist',
						'Failed to parse AI playlist response',
						e,
					);
				}
			}

			parsedTracks = parsedTracks.slice(0, trackCount);

			// Resolve real YouTube video IDs so every track is playable.
			const resolvedIds = await Promise.all(
				parsedTracks.map(async (track, index) => {
					const videoId = await resolveVideoId(track, index);
					return {...track, videoId};
				}),
			);

			const seen = new Set<string>();
			const finalTracks: AITrack[] = [];
			for (const t of resolvedIds) {
				if (seen.has(t.videoId)) {
					continue;
				}
				seen.add(t.videoId);
				finalTracks.push({
					videoId: t.videoId,
					title: t.title,
					artists: t.artists,
					duration: t.duration,
					source: t.videoId.startsWith('search:') ? 'search' : 'suggestions',
				});
			}

			const playlist: AIPlaylist = {
				id: Date.now().toString(),
				name: playlistName,
				prompt,
				tracks: finalTracks,
				createdAt: Date.now(),
			};

			logger.info(
				'useAIPlaylist',
				`Generated playlist "${playlist.name}" with ${finalTracks.length} tracks`,
			);

			return {playlist, tracks: finalTracks};
		},
		[llm],
	);

	return {
		generatePlaylist,
		savePlaylist,
		loadPlaylists,
		deletePlaylist,
	};
}
