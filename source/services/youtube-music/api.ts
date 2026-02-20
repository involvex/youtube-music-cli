// YouTube Music API wrapper service
import type {
	Track,
	Album,
	Artist,
	Playlist,
	SearchOptions,
	SearchResponse,
	SearchResult,
} from '../../types/youtube-music.types.ts';
import type {
	VideoSearchResult,
	PlaylistSearchResult,
	ChannelSearchResult,
	SearchResponse as YoutubeiSearchResponse,
} from '../../types/youtubei.types.ts';
import {Innertube, Log} from 'youtubei.js';
import {logger} from '../logger/logger.service.ts';
import {getSearchCache} from '../cache/cache.service.ts';

// Initialize YouTube client
let ytClient: Innertube | null = null;

type MusicSearchItem = {
	id?: string;
	item_type?: string;
	title?: string;
	name?: string;
	duration?: {seconds?: number} | number;
	artists?: Array<{name?: string; channel_id?: string; id?: string}>;
	author?: {name?: string; channel_id?: string; id?: string};
};

type MusicSearchLike = {
	songs?: {contents?: unknown[]};
	videos?: {contents?: unknown[]};
	albums?: {contents?: unknown[]};
	artists?: {contents?: unknown[]};
	playlists?: {contents?: unknown[]};
};

function toMusicSearchType(
	searchType: SearchOptions['type'] | undefined,
): 'all' | 'song' | 'album' | 'artist' | 'playlist' {
	switch (searchType) {
		case 'songs': {
			return 'song';
		}

		case 'albums': {
			return 'album';
		}

		case 'artists': {
			return 'artist';
		}

		case 'playlists': {
			return 'playlist';
		}

		default: {
			return 'all';
		}
	}
}

function getMusicShelfItems(shelf: unknown): MusicSearchItem[] {
	if (!shelf || typeof shelf !== 'object') {
		return [];
	}

	const contents = (shelf as {contents?: unknown[]}).contents;
	if (!Array.isArray(contents)) {
		return [];
	}

	return contents.filter(
		(item): item is MusicSearchItem => !!item && typeof item === 'object',
	);
}

function parseVideoId(value: string): string | null {
	const trimmedValue = value.trim();
	if (!trimmedValue) {
		return null;
	}

	if (!trimmedValue.includes('://') && !trimmedValue.includes('/')) {
		return trimmedValue;
	}

	try {
		const parsedUrl = new URL(trimmedValue);
		const vParam = parsedUrl.searchParams.get('v');
		if (vParam) {
			return vParam;
		}

		const host = parsedUrl.hostname.toLowerCase();
		const isYouTubeHost =
			host === 'youtu.be' ||
			host === 'youtube.com' ||
			host.endsWith('.youtube.com') ||
			host === 'music.youtube.com';
		if (!isYouTubeHost) {
			return null;
		}

		if (host === 'youtu.be') {
			const pathId = parsedUrl.pathname.split('/').filter(Boolean)[0];
			if (pathId) {
				return pathId;
			}
		}

		const pathId = parsedUrl.pathname
			.split('/')
			.filter(Boolean)
			.find(part => part.length >= 8);
		return pathId ?? null;
	} catch {
		return null;
	}
}

function toTrack(item: MusicSearchItem): Track | null {
	const rawId = item.id?.trim() ?? '';
	const videoId = rawId ? parseVideoId(rawId) : null;
	if (!videoId) {
		return null;
	}

	const artists =
		item.artists && item.artists.length > 0
			? item.artists.map(artist => ({
					artistId: artist.channel_id || artist.id || '',
					name: artist.name ?? 'Unknown',
				}))
			: [
					{
						artistId: item.author?.channel_id || item.author?.id || '',
						name: item.author?.name ?? 'Unknown',
					},
				];

	return {
		videoId,
		title: item.title || item.name || 'Unknown',
		artists,
		duration:
			typeof item.duration === 'number'
				? item.duration
				: (item.duration?.seconds ?? 0),
	};
}

async function getClient() {
	if (!ytClient) {
		// Suppress noisy youtubei.js parser warnings in TUI output.
		Log.setLevel(Log.Level.ERROR);
		ytClient = await Innertube.create();
	}
	return ytClient;
}

class MusicService {
	private readonly searchCache = getSearchCache();

	async search(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResponse> {
		const searchType = options.type || 'all';
		const resultLimit = options.limit ?? 20;
		const cacheKey = `search:${searchType}:${resultLimit}:${query}`;

		// Return cached result if available
		const cached = this.searchCache.get(cacheKey) as SearchResponse | null;
		if (cached) {
			logger.debug('MusicService', 'Returning cached search results', {
				query,
				resultCount: cached.results.length,
			});
			return cached;
		}

		const results: SearchResult[] = [];

		try {
			const yt = await getClient();
			const musicSearch = (await yt.music.search(query, {
				type: toMusicSearchType(searchType),
			})) as unknown as MusicSearchLike;

			if (searchType === 'all' || searchType === 'songs') {
				const songItems = [
					...getMusicShelfItems(musicSearch.songs),
					...getMusicShelfItems(musicSearch.videos),
				];
				for (const item of songItems) {
					const track = toTrack(item);
					if (!track) {
						continue;
					}

					results.push({
						type: 'song',
						data: track,
					});
				}
			}

			if (searchType === 'all' || searchType === 'playlists') {
				for (const playlist of getMusicShelfItems(musicSearch.playlists)) {
					const playlistId = playlist.id?.trim();
					if (!playlistId) {
						continue;
					}

					results.push({
						type: 'playlist',
						data: {
							playlistId,
							name: playlist.title || playlist.name || 'Unknown Playlist',
							tracks: [],
						},
					});
				}
			}

			if (searchType === 'all' || searchType === 'artists') {
				for (const artist of getMusicShelfItems(musicSearch.artists)) {
					const artistId =
						artist.id?.trim() ||
						artist.author?.channel_id ||
						artist.author?.id ||
						'';
					if (!artistId) {
						continue;
					}

					results.push({
						type: 'artist',
						data: {
							artistId,
							name:
								artist.name ||
								artist.title ||
								artist.author?.name ||
								'Unknown Artist',
						},
					});
				}
			}

			if (searchType === 'all' || searchType === 'albums') {
				for (const album of getMusicShelfItems(musicSearch.albums)) {
					const albumId = album.id?.trim();
					if (!albumId) {
						continue;
					}

					results.push({
						type: 'album',
						data: {
							albumId,
							name: album.title || album.name || 'Unknown Album',
							artists: (album.artists ?? []).map(artist => ({
								artistId: artist.channel_id || artist.id || '',
								name: artist.name ?? 'Unknown',
							})),
							tracks: [],
						},
					});
				}
			}

			if (results.length === 0) {
				const search = (await yt.search(
					query,
				)) as unknown as YoutubeiSearchResponse;

				if (searchType === 'all' || searchType === 'songs') {
					const videos = search.videos as VideoSearchResult[] | undefined;
					if (videos) {
						for (const video of videos) {
							const rawVideoId = video.id || video.video_id || '';
							const videoId = parseVideoId(rawVideoId);
							if ((!video.type && !rawVideoId) || !videoId) {
								continue;
							}

							results.push({
								type: 'song',
								data: {
									videoId,
									title:
										(typeof video.title === 'string'
											? video.title
											: video.title?.text) || 'Unknown',
									artists: [
										{
											artistId: video.channel_id || video.channel?.id || '',
											name:
												(typeof video.author === 'string'
													? video.author
													: video.author?.name) || 'Unknown',
										},
									],
									duration:
										(typeof video.duration === 'number'
											? video.duration
											: video.duration?.seconds) || 0,
								},
							});
						}
					}
				}

				if (searchType === 'all' || searchType === 'playlists') {
					const playlists = search.playlists as
						| PlaylistSearchResult[]
						| undefined;
					if (playlists) {
						for (const playlist of playlists) {
							results.push({
								type: 'playlist',
								data: {
									playlistId: playlist.id || '',
									name:
										(typeof playlist.title === 'string'
											? playlist.title
											: playlist.title?.text) || 'Unknown Playlist',
									tracks: [],
								},
							});
						}
					}
				}

				if (searchType === 'all' || searchType === 'artists') {
					const channels = search.channels as ChannelSearchResult[] | undefined;
					if (channels) {
						for (const channel of channels) {
							results.push({
								type: 'artist',
								data: {
									artistId: channel.id || channel.channelId || '',
									name:
										(typeof channel.author === 'string'
											? channel.author
											: channel.author?.name) || 'Unknown Artist',
								},
							});
						}
					}
				}
			}
		} catch (error) {
			logger.error('MusicService', 'Search failed', {
				query,
				searchType,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		const response: SearchResponse = {
			results: results.slice(0, resultLimit),
			hasMore: false,
		};

		// Cache the result
		this.searchCache.set(cacheKey, response as unknown);

		return response;
	}

	async getTrack(videoId: string): Promise<Track | null> {
		const normalizedVideoId = parseVideoId(videoId);
		if (!normalizedVideoId) {
			logger.warn('MusicService', 'Invalid track id/url provided', {videoId});
			return null;
		}

		return {
			videoId: normalizedVideoId,
			title: 'Unknown Track',
			artists: [],
		};
	}

	async getAlbum(albumId: string): Promise<Album> {
		return {
			albumId,
			name: 'Unknown Album',
			artists: [],
			tracks: [],
		} as unknown as Album;
	}

	async getArtist(artistId: string): Promise<Artist> {
		return {
			artistId,
			name: 'Unknown Artist',
		};
	}

	async getPlaylist(playlistId: string): Promise<Playlist> {
		try {
			const yt = await getClient();
			const playlistData = (await yt.music.getPlaylist(playlistId)) as {
				title?: string;
				name?: string;
				contents?: Array<{
					id?: string;
					video_id?: string;
					title?: string | {text?: string};
					artists?: Array<{name?: string; channel_id?: string; id?: string}>;
					duration?: number | {seconds?: number};
				}>;
				tracks?: Array<{
					id?: string;
					video_id?: string;
					title?: string | {text?: string};
					artists?: Array<{name?: string; channel_id?: string; id?: string}>;
					duration?: number | {seconds?: number};
				}>;
			};

			const rows = [
				...(playlistData.contents ?? []),
				...(playlistData.tracks ?? []),
			];
			const seen = new Set<string>();
			const tracks: Track[] = [];

			for (const row of rows) {
				const videoId = row.id || row.video_id;
				if (!videoId || seen.has(videoId)) continue;
				seen.add(videoId);
				tracks.push({
					videoId,
					title:
						(typeof row.title === 'string' ? row.title : row.title?.text) ??
						'Unknown',
					artists: (row.artists ?? []).map(artist => ({
						artistId: artist.channel_id || artist.id || '',
						name: artist.name ?? 'Unknown',
					})),
					duration:
						typeof row.duration === 'number'
							? row.duration
							: (row.duration?.seconds ?? 0),
				});
			}

			return {
				playlistId,
				name: playlistData.title || playlistData.name || 'Unknown Playlist',
				tracks,
			};
		} catch (error) {
			logger.error('MusicService', 'getPlaylist failed', {
				playlistId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				playlistId,
				name: 'Unknown Playlist',
				tracks: [],
			};
		}
	}

	async getTrending(): Promise<Track[]> {
		try {
			const yt = await getClient();
			const trending = (await yt.getTrending()) as unknown as {
				sections?: Array<{
					items?: Array<{
						id?: string;
						video_id?: string;
						title?: string | {text?: string};
						author?: string | {name?: string};
						duration?: number | {seconds?: number};
					}>;
				}>;
			};

			const tracks: Track[] = [];
			const sections = trending.sections ?? [];
			for (const section of sections) {
				for (const item of section.items ?? []) {
					const videoId = item.id || item.video_id;
					if (!videoId) continue;
					tracks.push({
						videoId,
						title:
							(typeof item.title === 'string'
								? item.title
								: item.title?.text) ?? 'Unknown',
						artists: [
							{
								artistId: '',
								name:
									(typeof item.author === 'string'
										? item.author
										: item.author?.name) ?? 'Unknown',
							},
						],
						duration:
							(typeof item.duration === 'number'
								? item.duration
								: item.duration?.seconds) ?? 0,
					});
				}
			}

			return tracks.slice(0, 25);
		} catch (error) {
			logger.error('MusicService', 'getTrending failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getExploreSections(): Promise<Array<{title: string; tracks: Track[]}>> {
		try {
			const yt = await getClient();
			const music = yt.music;
			const explore = (await music.getExplore()) as unknown as {
				sections?: Array<{
					header?: {title?: string | {text?: string}};
					contents?: Array<{
						id?: string;
						video_id?: string;
						title?: string | {text?: string};
						author?: string | {name?: string};
						duration?: number | {seconds?: number};
					}>;
				}>;
			};

			const result: Array<{title: string; tracks: Track[]}> = [];
			for (const section of explore.sections ?? []) {
				const title =
					(typeof section.header?.title === 'string'
						? section.header.title
						: section.header?.title?.text) ?? 'Featured';
				const tracks: Track[] = [];

				for (const item of section.contents ?? []) {
					const videoId = item.id || item.video_id;
					if (!videoId) continue;
					tracks.push({
						videoId,
						title:
							(typeof item.title === 'string'
								? item.title
								: item.title?.text) ?? 'Unknown',
						artists: [
							{
								artistId: '',
								name:
									(typeof item.author === 'string'
										? item.author
										: item.author?.name) ?? 'Unknown',
							},
						],
						duration:
							(typeof item.duration === 'number'
								? item.duration
								: item.duration?.seconds) ?? 0,
					});
				}

				if (tracks.length > 0) {
					result.push({title, tracks: tracks.slice(0, 10)});
				}
			}

			return result;
		} catch (error) {
			logger.error('MusicService', 'getExploreSections failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getSuggestions(trackId: string): Promise<Track[]> {
		try {
			const yt = await getClient();

			// Use music.getUpNext with automix — avoids the yt.getInfo() ParsingError
			// caused by YouTube "Remove ads" menu items that youtubei.js can't parse.
			const panel = await yt.music.getUpNext(trackId, true);

			const tracks: Track[] = [];

			for (const item of panel.contents) {
				const video = item as unknown as {
					video_id?: string;
					title?: string | {text?: string};
					artists?: Array<{name?: string; channel_id?: string}>;
					duration?: {seconds?: number};
				};

				const videoId = video.video_id;
				if (!videoId || videoId === trackId) continue;

				const title =
					typeof video.title === 'string'
						? video.title
						: (video.title?.text ?? '');
				if (!title) continue;

				tracks.push({
					videoId,
					title,
					artists: (video.artists ?? []).map(a => ({
						artistId: a.channel_id ?? '',
						name: a.name ?? 'Unknown',
					})),
					duration: video.duration?.seconds ?? 0,
				});
			}

			logger.debug('MusicService', 'getSuggestions success', {
				trackId,
				count: tracks.length,
			});

			return tracks.slice(0, 15);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn('MusicService', 'getSuggestions failed', {error: message});
			return [];
		}
	}

	async getStreamUrl(videoId: string): Promise<string> {
		logger.info('MusicService', 'Starting stream extraction', {videoId});
		const isBunRuntime =
			typeof (globalThis as {Bun?: unknown}).Bun !== 'undefined';

		// Try Method 1: @distube/ytdl-core (skip under Bun due undici incompatibility)
		if (isBunRuntime) {
			logger.warn(
				'MusicService',
				'Skipping ytdl-core extraction on Bun runtime',
				{videoId},
			);
		} else {
			try {
				logger.debug('MusicService', 'Attempting ytdl-core extraction', {
					videoId,
				});
				const ytdl = await import('@distube/ytdl-core');
				const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

				const info = await ytdl.default.getInfo(videoUrl);
				logger.debug('MusicService', 'ytdl-core getInfo succeeded', {
					formatCount: info.formats.length,
				});

				const audioFormats = ytdl.default.filterFormats(
					info.formats,
					'audioonly',
				);
				logger.debug('MusicService', 'ytdl-core audio formats filtered', {
					audioFormatCount: audioFormats.length,
				});

				if (audioFormats.length > 0) {
					// Get highest quality audio
					const bestAudio = audioFormats.sort((a, b) => {
						const aBitrate = Number.parseInt(String(a.audioBitrate || 0));
						const bBitrate = Number.parseInt(String(b.audioBitrate || 0));
						return bBitrate - aBitrate;
					})[0];

					if (bestAudio?.url) {
						logger.info('MusicService', 'Using ytdl-core stream', {
							bitrate: bestAudio.audioBitrate,
							urlLength: bestAudio.url.length,
							mimeType: bestAudio.mimeType,
						});
						return bestAudio.url;
					}
				}

				logger.warn(
					'MusicService',
					'ytdl-core: No audio formats with URL found',
				);
			} catch (error) {
				logger.error('MusicService', 'ytdl-core extraction failed', {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
			}
		}

		// Try Method 2: youtube-ext (lightweight, no parser path)
		try {
			logger.debug('MusicService', 'Attempting youtube-ext extraction', {
				videoId,
			});
			const {videoInfo, getFormats} = await import('youtube-ext');
			const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
			const info = await videoInfo(videoUrl);
			logger.debug('MusicService', 'youtube-ext videoInfo succeeded');

			// Decode stream URLs first
			const decodedFormats = await getFormats(info.stream);
			logger.debug('MusicService', 'youtube-ext formats decoded', {
				formatCount: decodedFormats.length,
			});

			// Get best audio format from decoded adaptive formats
			const audioFormats = decodedFormats.filter(
				f => f.mimeType?.includes('audio') && f.url,
			);
			logger.debug('MusicService', 'youtube-ext audio formats filtered', {
				audioFormatCount: audioFormats.length,
			});

			if (audioFormats.length > 0) {
				// Sort by bitrate descending and get best quality
				const bestAudio = audioFormats.sort(
					(a, b) => (b.bitrate || 0) - (a.bitrate || 0),
				)[0];
				if (bestAudio?.url) {
					logger.info('MusicService', 'Using youtube-ext stream', {
						bitrate: bestAudio.bitrate,
						urlLength: bestAudio.url.length,
					});
					return bestAudio.url;
				}
			}

			logger.warn(
				'MusicService',
				'youtube-ext: No audio formats with URL found',
			);
		} catch (error) {
			logger.error('MusicService', 'youtube-ext extraction failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}

		// Try Method 3: Invidious API (last resort)
		try {
			logger.debug('MusicService', 'Attempting Invidious extraction', {
				videoId,
			});
			const url = await this.getInvidiousStreamUrl(videoId);
			logger.info('MusicService', 'Using Invidious stream', {
				urlLength: url.length,
			});
			return url;
		} catch (error) {
			logger.error('MusicService', 'Invidious extraction failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}

		// All methods failed
		logger.error('MusicService', 'All stream extraction methods failed', {
			videoId,
		});
		throw new Error('All stream extraction methods failed');
	}

	private async getInvidiousStreamUrl(videoId: string): Promise<string> {
		// Try multiple Invidious instances as fallback
		const instances = [
			'https://vid.puffyan.us',
			'https://invidious.perennialte.ch',
			'https://yewtu.be',
		];

		for (const instance of instances) {
			try {
				logger.debug('MusicService', 'Trying Invidious instance', {instance});
				const response = await fetch(`${instance}/api/v1/videos/${videoId}`);

				if (!response.ok) {
					logger.debug('MusicService', 'Invidious instance returned non-OK', {
						instance,
						status: response.status,
					});
					continue;
				}

				const videoData = (await response.json()) as {
					adaptiveFormats?: Array<{url?: string; type?: string}>;
					formatStreams?: Array<{url?: string; type?: string}>;
				};

				// Look for audio-only streams
				const audioFormats = [
					...(videoData.adaptiveFormats || []),
					...(videoData.formatStreams || []),
				].filter(f => f.type?.toLowerCase().includes('audio'));

				logger.debug('MusicService', 'Invidious audio formats found', {
					instance,
					count: audioFormats.length,
				});

				if (audioFormats.length > 0) {
					const firstAudio = audioFormats[0];
					if (firstAudio?.url) {
						logger.debug('MusicService', 'Invidious stream URL obtained', {
							instance,
							urlLength: firstAudio.url.length,
							type: firstAudio.type,
						});
						return firstAudio.url;
					}
				}
			} catch (error) {
				logger.debug('MusicService', 'Invidious instance error', {
					instance,
					error: error instanceof Error ? error.message : String(error),
				});
				// Try next instance
				continue;
			}
		}

		// If all Invidious instances fail, throw error instead of returning watch URL
		throw new Error('No Invidious instance returned a valid stream URL');
	}
}

// Singleton instance
let musicServiceInstance: MusicService | null = null;

export function getMusicService(): MusicService {
	if (!musicServiceInstance) {
		musicServiceInstance = new MusicService();
	}

	return musicServiceInstance;
}
