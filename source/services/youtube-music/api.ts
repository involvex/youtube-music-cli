// YouTube Music API wrapper service
import type {
	Track,
	Album,
	Artist,
	Playlist,
	Genre,
	Release,
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
import {getSearchCache, getSuggestionsCache} from '../cache/cache.service.ts';
import {getConfigService} from '../config/config.service.ts';
import {getInvidiousHealthService} from '../invidious/invidious-health.service.ts';

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
		const proxy = getConfigService().getProxy();
		if (proxy) {
			// Set proxy environment variables for fetch/HTTP clients
			process.env.HTTPS_PROXY = proxy;
			process.env.HTTP_PROXY = proxy;
		}

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
						PlaylistSearchResult[] | undefined;
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

		try {
			// Validate the video exists by fetching basic info from YouTube
			const yt = await getClient();
			const info = await yt.getBasicInfo(normalizedVideoId);

			// Check if the video is actually playable
			const status = info.playability_status?.status;
			if (status && status !== 'OK') {
				logger.warn('MusicService', 'Track not playable', {
					videoId: normalizedVideoId,
					status,
					reason: info.playability_status?.reason,
				});
				return null;
			}

			const basicInfo = info.basic_info;
			return {
				videoId: normalizedVideoId,
				title: basicInfo.title ?? 'Unknown Track',
				artists: basicInfo.channel
					? [
							{
								artistId: basicInfo.channel.id ?? '',
								name: basicInfo.channel.name ?? 'Unknown',
							},
						]
					: [],
				duration: basicInfo.duration ?? 0,
			};
		} catch (error) {
			logger.warn('MusicService', 'Failed to fetch track info', {
				videoId: normalizedVideoId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
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
				header?: {
					title?: string | {text?: string};
				};
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

			// Extract playlist name: try header.title first (youtubei.js Playlist class),
			// then top-level title/name, fallback to 'Unknown Playlist'
			const headerTitle = playlistData.header?.title;
			const resolvedName =
				(typeof headerTitle === 'string' ? headerTitle : headerTitle?.text) ||
				playlistData.title ||
				playlistData.name ||
				'Unknown Playlist';

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
				name: resolvedName,
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
			const explore = (await yt.music.getExplore()) as unknown as {
				sections?: Array<{
					header?: {title?: {toString(): string} | string};
					contents?: Array<{
						type?: string;
						id?: string;
						video_id?: string;
						title?: string | {text?: string} | {toString(): string};
						subtitle?: {toString(): string};
						author?: string | {name?: string};
						duration?: number | {seconds?: number};
						artists?: Array<{name?: string; channel_id?: string; id?: string}>;
						authors?: Array<{name?: string; channel_id?: string; id?: string}>;
					}>;
				}>;
			};

			const trendingSection = explore.sections?.find(section => {
				const title = section.header?.title?.toString() || '';
				return title.toLowerCase().includes('trending');
			});

			if (!trendingSection || !trendingSection.contents) {
				return [];
			}

			const tracks: Track[] = [];
			for (const item of trendingSection.contents) {
				const videoId = item.id || item.video_id;
				if (!videoId) continue;

				// Parse artists/authors
				const artistsData = item.artists || item.authors || [];
				const artists =
					artistsData.length > 0
						? artistsData.map(a => ({
								artistId: a.channel_id || a.id || '',
								name: a.name || 'Unknown',
							}))
						: [
								{
									artistId: '',
									name: 'Unknown Artist',
								},
							];

				// Try to extract artist from subtitle/author if artists array is empty
				if (artists[0]?.name === 'Unknown Artist') {
					const subtitle = item.subtitle?.toString();
					if (subtitle) {
						// Subtitle format often "Artist • Album • Views • Duration"
						const parts = subtitle.split(' • ');
						if (parts.length > 0) {
							artists[0]!.name = parts[0]!;
						}
					} else if (item.author) {
						artists[0]!.name =
							(typeof item.author === 'string'
								? item.author
								: item.author?.name) || 'Unknown Artist';
					}
				}

				tracks.push({
					videoId,
					title: item.title?.toString() ?? 'Unknown',
					artists,
					duration:
						typeof item.duration === 'number'
							? item.duration
							: (item.duration?.seconds ?? 0),
				});
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
		const cache = getSuggestionsCache();
		const cacheKey = `suggestions:${trackId}`;

		const cached = cache.get(cacheKey) as Track[] | null;
		if (cached) {
			logger.debug('MusicService', 'Returning cached suggestions', {
				trackId,
				resultCount: cached.length,
			});
			return cached;
		}

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

			const result = tracks.slice(0, 15);
			cache.set(cacheKey, result as unknown);

			logger.debug('MusicService', 'getSuggestions success', {
				trackId,
				count: result.length,
			});

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn('MusicService', 'getSuggestions failed', {error: message});
			return [];
		}
	}

	async getGenres(): Promise<Array<{title: string; genres: Genre[]}>> {
		try {
			const yt = await getClient();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response: any = await yt.actions.execute('/browse', {
				browseId: 'FEmusic_moods_and_genres',
				client: 'YTMUSIC',
			});

			const result: Array<{title: string; genres: Genre[]}> = [];

			const tabs =
				response.data?.contents?.singleColumnBrowseResultsRenderer?.tabs;
			if (!tabs) return result;

			const contents =
				tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];

			for (const section of contents) {
				const header =
					section.gridRenderer?.header?.gridHeaderRenderer?.title?.runs?.[0]
						?.text || 'Genres';
				const items = section.gridRenderer?.items || [];

				const genres: Genre[] = [];
				for (const item of items) {
					const btn = item.musicNavigationButtonRenderer;
					if (!btn) continue;

					const title = btn.buttonText?.runs?.[0]?.text;
					const browseId = btn.clickCommand?.browseEndpoint?.browseId;
					const params = btn.clickCommand?.browseEndpoint?.params;

					if (title && browseId) {
						genres.push({title, browseId, params});
					}
				}

				if (genres.length > 0) {
					result.push({title: header, genres});
				}
			}

			return result;
		} catch (error) {
			logger.error('MusicService', 'getGenres failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getNewReleases(): Promise<Array<{title: string; releases: Release[]}>> {
		try {
			const yt = await getClient();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response: any = await yt.actions.execute('/browse', {
				browseId: 'FEmusic_new_releases',
				client: 'YTMUSIC',
			});

			const result: Array<{title: string; releases: Release[]}> = [];

			const tabs =
				response.data?.contents?.singleColumnBrowseResultsRenderer?.tabs;
			if (!tabs) return result;

			const contents =
				tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];

			for (const section of contents) {
				const header =
					section.musicCarouselShelfRenderer?.header
						?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ||
					'New Releases';
				const items =
					section.musicCarouselShelfRenderer?.contents ||
					section.musicShelfRenderer?.contents ||
					section.gridRenderer?.items ||
					[];

				const releases: Release[] = [];
				for (const item of items) {
					const renderer = item.musicTwoRowItemRenderer;
					if (!renderer) continue;

					const titleRuns = renderer.title?.runs || [];
					const subtitleRuns = renderer.subtitle?.runs || [];

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const title = titleRuns.map((r: any) => r.text).join('');
					const browseId =
						renderer.navigationEndpoint?.browseEndpoint?.browseId;

					const artist =
						subtitleRuns
							.filter(
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								(r: any) => r.navigationEndpoint?.browseEndpoint?.browseId,
							)
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							.map((r: any) => r.text)
							.join(', ') ||
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						subtitleRuns.map((r: any) => r.text).join('') ||
						'Unknown Artist';
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const subtitleText = subtitleRuns.map((r: any) => r.text).join('');

					if (title && browseId) {
						releases.push({title, browseId, artist, subtitle: subtitleText});
					}
				}

				if (releases.length > 0) {
					result.push({title: header, releases});
				}
			}

			return result;
		} catch (error) {
			logger.error('MusicService', 'getNewReleases failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getGenrePlaylists(
		browseId: string,
		params?: string,
	): Promise<Release[]> {
		try {
			const yt = await getClient();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const payload: any = {browseId, client: 'YTMUSIC'};
			if (params) payload.params = params;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const response = (await yt.actions.execute('/browse', payload)) as any;
			const releases: Release[] = [];

			const contents =
				response.data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
					?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];

			for (const section of contents) {
				const items =
					section.musicCarouselShelfRenderer?.contents ||
					section.musicShelfRenderer?.contents ||
					section.gridRenderer?.items ||
					[];

				for (const item of items) {
					const renderer = item.musicTwoRowItemRenderer;
					if (!renderer) continue;

					const titleRuns = renderer.title?.runs || [];
					const subtitleRuns = renderer.subtitle?.runs || [];

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const title = titleRuns.map((r: any) => r.text).join('');
					const itemBrowseId =
						renderer.navigationEndpoint?.browseEndpoint?.browseId;

					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const subtitleText = subtitleRuns.map((r: any) => r.text).join('');

					if (title && itemBrowseId) {
						releases.push({
							title,
							browseId: itemBrowseId,
							artist: subtitleText,
							subtitle: subtitleText,
						});
					}
				}
			}

			return releases;
		} catch (error) {
			logger.error('MusicService', 'getGenrePlaylists failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getReleaseTracks(browseId: string): Promise<Track[]> {
		try {
			const yt = await getClient();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let items: any[] = [];

			if (browseId.startsWith('MPREb')) {
				const album = await yt.music.getAlbum(browseId);
				items = album.contents || [];
			} else {
				const playlistId = browseId.replace(/^VL/, '');
				const playlist = await yt.music.getPlaylist(playlistId);
				items = playlist.items || [];
			}

			return (
				items
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.map((item: any) => ({
						videoId: item.video_id || item.id,
						title: item.title || 'Unknown Title',
						artists:
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							item.artists?.map((a: any) => ({
								name: a.name,
								artistId: a.channel_id,
							})) || [],
					}))
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.filter((t: any) => t.videoId)
			);
		} catch (error) {
			logger.error('MusicService', 'getReleaseTracks failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getStreamUrl(videoId: string): Promise<string> {
		logger.info('MusicService', 'Starting stream extraction', {videoId});

		// Method 1: youtubei.js (already used for search/metadata)
		try {
			logger.debug('MusicService', 'Attempting youtubei.js extraction', {
				videoId,
			});
			const yt = await getClient();
			const info = await yt.getBasicInfo(videoId);
			const format = info.chooseFormat({
				type: 'audio',
				quality: 'best',
			});
			const streamUrl =
				typeof format?.decipher === 'function'
					? format.decipher(yt.session.player)
					: format?.url;

			if (streamUrl && typeof streamUrl === 'string') {
				logger.info('MusicService', 'Using youtubei.js stream', {
					urlLength: streamUrl.length,
				});
				return streamUrl;
			}

			logger.warn('MusicService', 'youtubei.js: No audio format URL found');
		} catch (error) {
			logger.error('MusicService', 'youtubei.js extraction failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
		}

		// Method 2: Invidious API (last resort)
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

		logger.error('MusicService', 'All stream extraction methods failed', {
			videoId,
		});
		throw new Error('All stream extraction methods failed');
	}

	private async getInvidiousStreamUrl(videoId: string): Promise<string> {
		const health = getInvidiousHealthService();
		const instances = await health.ensureFreshInstances();

		for (const instance of instances) {
			const startedAt = Date.now();
			try {
				logger.debug('MusicService', 'Trying Invidious instance', {instance});
				const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
					signal: AbortSignal.timeout(12_000),
				});

				if (!response.ok) {
					health.recordFailure(instance);
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
						health.recordSuccess(instance, Date.now() - startedAt);
						logger.debug('MusicService', 'Invidious stream URL obtained', {
							instance,
							urlLength: firstAudio.url.length,
							type: firstAudio.type,
						});
						return firstAudio.url;
					}
				}

				health.recordFailure(instance);
			} catch (error) {
				health.recordFailure(instance);
				logger.debug('MusicService', 'Invidious instance error', {
					instance,
					error: error instanceof Error ? error.message : String(error),
				});
				continue;
			}
		}

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
