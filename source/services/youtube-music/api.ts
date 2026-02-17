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
			const search = await yt.search(query);

			// Process search results based on type
			if (searchType === 'all' || searchType === 'songs') {
				const videos = search.videos as any[];
				if (videos) {
					for (const video of videos) {
						if (video.type === 'Video' || video.id) {
							results.push({
								type: 'song',
								data: {
									videoId: video.id || video.video_id || '',
									title: video.title?.text || video.title || 'Unknown',
									artists: [
										{
											artistId: video.channel_id || video.channel?.id || '',
											name: video.author?.name || video.author || 'Unknown',
										},
									],
									duration: video.duration?.seconds || video.duration || 0,
								},
							});
						}
					}
				}
			}

			if (searchType === 'all' || searchType === 'playlists') {
				const playlists = search.playlists as any[];
				if (playlists) {
					for (const playlist of playlists) {
						results.push({
							type: 'playlist',
							data: {
								playlistId: playlist.id || '',
								name:
									playlist.title?.text || playlist.title || 'Unknown Playlist',
								tracks: [],
							},
						});
					}
				}
			}

			if (searchType === 'all' || searchType === 'artists') {
				const channels = search.channels as any[];
				if (channels) {
					for (const channel of channels) {
						results.push({
							type: 'artist',
							data: {
								artistId: channel.id || channel.channelId || '',
								name: channel.author?.name || channel.name || 'Unknown Artist',
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
			const video = (await yt.getInfo(trackId)) as any;
			const suggestions = video.related?.contents || [];
			return suggestions.slice(0, 10).map((item: any) => ({
				videoId: item.id || '',
				title: item.title?.text || 'Unknown',
				artists: [],
			}));
		} catch (error) {
			console.error('Failed to get suggestions:', error);
			return [];
		}
	}

	async getStreamUrl(videoId: string): Promise<string> {
		try {
			const yt = await getClient();
			const video = (await yt.getInfo(videoId)) as any;

			// Get the download URL for the video
			const streamData = video.chooseFormat({
				type: 'audio',
				quality: 'best',
			});

			if (streamData?.url) {
				return streamData.url;
			}

			throw new Error('No stream URL found');
		} catch (error) {
			console.error('Failed to get stream URL:', error);

			// Fallback to Invidious API
			return await this.getInvidiousStreamUrl(videoId);
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
