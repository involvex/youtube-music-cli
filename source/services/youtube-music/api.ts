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
	VideoInfo,
	RelatedContent,
} from '../../types/youtubei.types.ts';
import {Innertube} from 'youtubei.js';

// Initialize YouTube client
let ytClient: Innertube | null = null;

async function getClient() {
	if (!ytClient) {
		ytClient = await Innertube.create();
	}
	return ytClient;
}

class MusicService {
	async search(
		query: string,
		options: SearchOptions = {},
	): Promise<SearchResponse> {
		const results: SearchResult[] = [];
		const searchType = options.type || 'all';

		try {
			const yt = await getClient();
			const search = (await yt.search(
				query,
			)) as unknown as YoutubeiSearchResponse;

			// Process search results based on type
			if (searchType === 'all' || searchType === 'songs') {
				const videos = search.videos as VideoSearchResult[] | undefined;
				if (videos) {
					for (const video of videos) {
						if (video.type === 'Video' || video.id) {
							results.push({
								type: 'song',
								data: {
									videoId: video.id || video.video_id || '',
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
		} catch (error) {
			console.error('Search failed:', error);
		}

		return {
			results,
			hasMore: false,
		};
	}

	async getTrack(videoId: string): Promise<Track | null> {
		return {
			videoId,
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
		return {
			playlistId,
			name: 'Unknown Playlist',
			tracks: [],
		};
	}

	async getSuggestions(trackId: string): Promise<Track[]> {
		try {
			const yt = await getClient();
			const video = (await yt.getInfo(trackId)) as unknown as VideoInfo;
			const suggestions = video.related?.contents || [];
			return suggestions.slice(0, 10).map((item: RelatedContent) => ({
				videoId: item.id || '',
				title:
					typeof item.title === 'string'
						? item.title
						: item.title?.text || 'Unknown',
				artists: [],
			}));
		} catch (error) {
			console.error('Failed to get suggestions:', error);
			return [];
		}
	}

	async getStreamUrl(videoId: string): Promise<string> {
		// Try Method 1: youtubei.js (may fail with ParsingError)
		try {
			const yt = await getClient();
			const video = (await yt.getInfo(videoId)) as unknown as VideoInfo;

			// Get the download URL for the video
			const streamData = video.chooseFormat?.({
				type: 'audio',
				quality: 'best',
			});

			if (streamData?.url) {
				console.log('[Stream] Using youtubei.js');
				return streamData.url;
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('ParsingError')) {
				console.warn('[Stream] YouTubei parser error, trying fallback methods');
			} else {
				console.error('[Stream] YouTubei.js failed:', error);
			}
		}

		// Try Method 2: youtube-ext (lightweight, no parsing needed)
		try {
			const {videoInfo, getFormats} = await import('youtube-ext');
			const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
			const info = await videoInfo(videoUrl);

			// Decode stream URLs first
			const decodedFormats = await getFormats(info.stream);

			// Get best audio format from decoded adaptive formats
			const audioFormats = decodedFormats.filter(
				f => f.mimeType?.includes('audio') && f.url,
			);

			if (audioFormats.length > 0) {
				// Sort by bitrate descending and get best quality
				const bestAudio = audioFormats.sort(
					(a, b) => (b.bitrate || 0) - (a.bitrate || 0),
				)[0];
				if (bestAudio?.url) {
					console.log('[Stream] Using youtube-ext');
					return bestAudio.url;
				}
			}
		} catch (error) {
			console.error('[Stream] youtube-ext failed:', error);
		}

		// Try Method 3: Invidious API (last resort)
		try {
			const url = await this.getInvidiousStreamUrl(videoId);
			console.log('[Stream] Using Invidious');
			return url;
		} catch (error) {
			console.error('[Stream] Invidious failed:', error);
			throw new Error('All stream extraction methods failed');
		}
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
				const response = await fetch(`${instance}/api/v1/videos/${videoId}`);
				if (!response.ok) continue;

				const videoData = (await response.json()) as {
					adaptiveFormats?: Array<{url?: string; type?: string}>;
					formatStreams?: Array<{url?: string; type?: string}>;
				};

				// Look for audio-only streams
				const audioFormats = [
					...(videoData.adaptiveFormats || []),
					...(videoData.formatStreams || []),
				].filter(f => f.type?.toLowerCase().includes('audio'));

				if (audioFormats.length > 0) {
					const firstAudio = audioFormats[0];
					if (firstAudio?.url) {
						return firstAudio.url;
					}
				}
			} catch {
				// Try next instance
				continue;
			}
		}

		return `https://www.youtube.com/watch?v=${videoId}`;
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
