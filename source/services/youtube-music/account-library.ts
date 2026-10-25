import type {Track} from '../../types/youtube-music.types.ts';
import {getAuthService} from '../auth/auth.service.ts';
import {logger} from '../logger/logger.service.ts';

export const LIKED_MUSIC_PLAYLIST_ID = 'LM';
export const LIKED_MUSIC_BROWSE_ID = 'FEmusic_liked_videos';

export const SIGNED_OUT_LIBRARY_MESSAGE =
	'Sign in to browse your YouTube Music library (Settings → Login or ymc login).';

export const MAX_ACCOUNT_PLAYLISTS = 200;
export const MAX_LIKED_SONGS = 500;

export class AccountLibraryAuthError extends Error {
	constructor(message = SIGNED_OUT_LIBRARY_MESSAGE) {
		super(message);
		this.name = 'AccountLibraryAuthError';
	}
}

export type AccountLibraryPlaylist = {
	playlistId: string;
	name: string;
	trackCount?: number;
};

export type AccountLibrary = {
	likedSongs: Track[];
	playlists: AccountLibraryPlaylist[];
};

export type AccountLibraryClient = {
	getLibrary: () => Promise<unknown>;
	getLikedSongs: () => Promise<Track[]>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	return value as Record<string, unknown>;
}

function textOf(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim();
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}

	const rec = asRecord(value);
	if (!rec) {
		return '';
	}

	if (typeof rec['text'] === 'string') {
		return rec['text'].trim();
	}

	const toStringFn = rec['toString'];
	if (typeof toStringFn === 'function') {
		const rendered = (toStringFn as () => unknown).call(rec);
		if (
			typeof rendered === 'string' &&
			rendered &&
			rendered !== '[object Object]'
		) {
			return rendered.trim();
		}
	}

	return '';
}

export function normalizeAccountPlaylistId(id: string): string {
	const trimmed = id.trim();
	if (trimmed.startsWith('VL')) {
		return trimmed.slice(2);
	}

	return trimmed;
}

export function isLikedMusicPlaylistId(id: string): boolean {
	return normalizeAccountPlaylistId(id) === LIKED_MUSIC_PLAYLIST_ID;
}

export function likedMusicBrowseId(id: string): string | null {
	const normalized = normalizeAccountPlaylistId(id);
	if (normalized === LIKED_MUSIC_PLAYLIST_ID) {
		return LIKED_MUSIC_BROWSE_ID;
	}

	if (normalized.startsWith('FEmusic_')) {
		return normalized;
	}

	return null;
}

export function assertAccountLibraryAuth(): void {
	if (!getAuthService().getStatus().loggedIn) {
		throw new AccountLibraryAuthError();
	}
}

export function pickLibraryFilter(
	filters: readonly string[] | undefined,
	matcher: (filter: string) => boolean,
): string | null {
	if (!filters) {
		return null;
	}

	return filters.find(filter => matcher(filter)) ?? null;
}

function playlistIdFromItem(item: Record<string, unknown>): string | null {
	const direct =
		(typeof item['id'] === 'string' && item['id']) ||
		(typeof item['playlistId'] === 'string' && item['playlistId']) ||
		(typeof item['playlist_id'] === 'string' && item['playlist_id']) ||
		'';
	if (direct) {
		return normalizeAccountPlaylistId(direct);
	}

	const endpoint = asRecord(item['endpoint']);
	const payload = endpoint ? asRecord(endpoint['payload']) : null;
	const browseId =
		(payload && typeof payload['browseId'] === 'string'
			? payload['browseId']
			: '') ||
		(endpoint && typeof endpoint['browseId'] === 'string'
			? endpoint['browseId']
			: '');
	if (!browseId) {
		return null;
	}

	return normalizeAccountPlaylistId(browseId);
}

function looksLikePlaylist(item: Record<string, unknown>, id: string): boolean {
	const itemType = textOf(item['item_type'] || item['type']).toLowerCase();
	if (
		itemType === 'song' ||
		itemType === 'video' ||
		itemType === 'artist' ||
		itemType === 'album'
	) {
		return false;
	}

	if (itemType === 'playlist' || itemType === 'library_playlist') {
		return true;
	}

	if (id === LIKED_MUSIC_PLAYLIST_ID) {
		return true;
	}

	if (id.startsWith('FEmusic_')) {
		return false;
	}

	return id.startsWith('PL') || id.startsWith('OL') || id.startsWith('RD');
}

function parseTrackCount(item: Record<string, unknown>): number | undefined {
	const raw =
		item['item_count'] ??
		item['song_count'] ??
		item['trackCount'] ??
		item['track_count'];
	if (typeof raw === 'number' && Number.isFinite(raw)) {
		return raw;
	}

	const text = textOf(raw);
	if (!text) {
		return undefined;
	}

	const match = text.replaceAll(',', '').match(/\d+/);
	if (!match) {
		return undefined;
	}

	return Number.parseInt(match[0]!, 10);
}

function collectItemArrays(node: unknown, sink: unknown[]): void {
	const rec = asRecord(node);
	if (!rec) {
		return;
	}

	const buckets = [rec['contents'], rec['items'], rec['tracks']];
	for (const bucket of buckets) {
		if (Array.isArray(bucket)) {
			sink.push(...bucket);
		} else if (bucket && typeof bucket === 'object') {
			const nested = asRecord(bucket);
			if (Array.isArray(nested?.['contents'])) {
				sink.push(...nested.contents);
			}

			if (Array.isArray(nested?.['items'])) {
				sink.push(...nested.items);
			}
		}
	}
}

export function parseAccountLibraryPlaylists(
	library: unknown,
): AccountLibraryPlaylist[] {
	const items: unknown[] = [];
	const rec = asRecord(library);
	if (rec) {
		collectItemArrays(rec, items);
		if (Array.isArray(rec['contents'])) {
			for (const section of rec['contents']) {
				collectItemArrays(section, items);
			}
		}
	}

	const seen = new Set<string>();
	const playlists: AccountLibraryPlaylist[] = [];
	for (const raw of items) {
		const item = asRecord(raw);
		if (!item) {
			continue;
		}

		const playlistId = playlistIdFromItem(item);
		if (!playlistId || seen.has(playlistId)) {
			continue;
		}

		if (!looksLikePlaylist(item, playlistId)) {
			continue;
		}

		seen.add(playlistId);
		playlists.push({
			playlistId,
			name:
				textOf(item['title']) || textOf(item['name']) || 'Untitled playlist',
			trackCount: parseTrackCount(item),
		});
		if (playlists.length >= MAX_ACCOUNT_PLAYLISTS) {
			break;
		}
	}

	return playlists;
}

export function parseAccountLibraryTracks(library: unknown): Track[] {
	const items: unknown[] = [];
	const rec = asRecord(library);
	if (rec) {
		collectItemArrays(rec, items);
		if (Array.isArray(rec['contents'])) {
			for (const section of rec['contents']) {
				collectItemArrays(section, items);
			}
		}
	}

	const seen = new Set<string>();
	const tracks: Track[] = [];
	for (const raw of items) {
		const item = asRecord(raw);
		if (!item) {
			continue;
		}

		const itemType = textOf(item['item_type'] || item['type']).toLowerCase();
		if (
			itemType === 'playlist' ||
			itemType === 'album' ||
			itemType === 'artist'
		) {
			continue;
		}

		const rawId =
			(typeof item['video_id'] === 'string' && item['video_id']) ||
			(typeof item['videoId'] === 'string' && item['videoId']) ||
			'';
		const fallbackId = typeof item['id'] === 'string' ? item['id'] : '';
		const videoId =
			rawId ||
			(fallbackId &&
			!looksLikePlaylist(item, fallbackId) &&
			(itemType === 'song' || itemType === 'video' || itemType === '')
				? fallbackId
				: '');
		if (!videoId || seen.has(videoId) || videoId.startsWith('PL')) {
			continue;
		}

		if (
			itemType &&
			itemType !== 'song' &&
			itemType !== 'video' &&
			itemType !== ''
		) {
			continue;
		}

		seen.add(videoId);
		const artistsRaw = Array.isArray(item['artists'])
			? item['artists']
			: Array.isArray(item['authors'])
				? item['authors']
				: [];
		const artists = artistsRaw
			.map(artist => asRecord(artist))
			.filter((artist): artist is Record<string, unknown> => artist !== null)
			.map(artist => ({
				artistId:
					(typeof artist['channel_id'] === 'string' && artist['channel_id']) ||
					(typeof artist['id'] === 'string' && artist['id']) ||
					'',
				name: textOf(artist['name']) || 'Unknown',
			}));
		const durationRaw = item['duration'];
		const duration =
			typeof durationRaw === 'number'
				? durationRaw
				: asRecord(durationRaw)?.['seconds'];
		tracks.push({
			videoId,
			title: textOf(item['title']) || textOf(item['name']) || 'Unknown',
			artists:
				artists.length > 0
					? artists
					: [
							{
								artistId: '',
								name: textOf(asRecord(item['author'])?.['name']) || 'Unknown',
							},
						],
			duration: typeof duration === 'number' ? duration : 0,
		});
		if (tracks.length >= MAX_LIKED_SONGS) {
			break;
		}
	}

	return tracks;
}

function titleFromFlexColumns(item: Record<string, unknown>): string {
	const columns = item['flexColumns'];
	if (!Array.isArray(columns) || columns.length === 0) {
		return '';
	}

	const first = asRecord(columns[0]);
	const renderer = first
		? asRecord(first['musicResponsiveListItemFlexColumnRenderer'])
		: first;
	const text = renderer ? asRecord(renderer['text']) : null;
	const runs = text && Array.isArray(text['runs']) ? text['runs'] : [];
	const firstRun = runs.length > 0 ? asRecord(runs[0]) : null;
	return firstRun ? textOf(firstRun['text']) : textOf(text);
}

function artistFromFlexColumns(item: Record<string, unknown>): string {
	const columns = item['flexColumns'];
	if (!Array.isArray(columns) || columns.length < 2) {
		return '';
	}

	const second = asRecord(columns[1]);
	const renderer = second
		? asRecord(second['musicResponsiveListItemFlexColumnRenderer'])
		: second;
	const text = renderer ? asRecord(renderer['text']) : null;
	const runs = text && Array.isArray(text['runs']) ? text['runs'] : [];
	const names: string[] = [];
	for (const run of runs) {
		const rec = asRecord(run);
		const value = rec ? textOf(rec['text']) : '';
		if (value && value !== '•' && !/^\d/.test(value)) {
			names.push(value);
		}
	}

	return names[0] ?? '';
}

function collectPlaylistItemTracks(
	node: unknown,
	sink: Track[],
	seen: Set<string>,
	depth: number,
): void {
	if (depth > 14 || sink.length >= MAX_LIKED_SONGS) {
		return;
	}

	if (Array.isArray(node)) {
		for (const item of node) {
			collectPlaylistItemTracks(item, sink, seen, depth + 1);
		}

		return;
	}

	const rec = asRecord(node);
	if (!rec) {
		return;
	}

	const renderer = asRecord(rec['musicResponsiveListItemRenderer']) ?? rec;
	const playlistItem = asRecord(renderer['playlistItemData']);
	const videoId =
		(playlistItem && typeof playlistItem['videoId'] === 'string'
			? playlistItem['videoId']
			: '') ||
		(typeof renderer['video_id'] === 'string' ? renderer['video_id'] : '') ||
		(typeof renderer['videoId'] === 'string' ? renderer['videoId'] : '');

	if (
		videoId &&
		videoId.length >= 11 &&
		!seen.has(videoId) &&
		!videoId.startsWith('PL') &&
		!videoId.startsWith('FE')
	) {
		seen.add(videoId);
		const artistName = artistFromFlexColumns(renderer);
		sink.push({
			videoId,
			title:
				titleFromFlexColumns(renderer) ||
				textOf(renderer['title']) ||
				textOf(renderer['name']) ||
				'Unknown',
			artists: [
				{
					artistId: '',
					name: artistName || 'Unknown',
				},
			],
			duration: 0,
		});
	}

	for (const value of Object.values(rec)) {
		if (value && typeof value === 'object') {
			collectPlaylistItemTracks(value, sink, seen, depth + 1);
		}
	}
}

export function parseTracksFromInnertubeBrowse(root: unknown): Track[] {
	const rec = asRecord(root);
	const parsed = [
		...parseAccountLibraryTracks(root),
		...(rec ? parseAccountLibraryTracks(rec['data']) : []),
		...(rec ? parseAccountLibraryTracks(rec['contents']) : []),
	];
	if (parsed.length > 0) {
		const seen = new Set<string>();
		const tracks: Track[] = [];
		for (const track of parsed) {
			if (seen.has(track.videoId)) {
				continue;
			}

			seen.add(track.videoId);
			tracks.push(track);
			if (tracks.length >= MAX_LIKED_SONGS) {
				break;
			}
		}

		return tracks;
	}

	const sink: Track[] = [];
	collectPlaylistItemTracks(root, sink, new Set<string>(), 0);
	return sink;
}

export function mergeAccountLibrary(
	playlists: AccountLibraryPlaylist[],
	likedSongs: Track[],
	librarySongs: Track[],
): AccountLibrary {
	const seenPlaylists = new Set<string>();
	const mergedPlaylists: AccountLibraryPlaylist[] = [];
	for (const playlist of playlists) {
		if (
			isLikedMusicPlaylistId(playlist.playlistId) ||
			seenPlaylists.has(playlist.playlistId)
		) {
			continue;
		}

		seenPlaylists.add(playlist.playlistId);
		mergedPlaylists.push(playlist);
	}

	const seenTracks = new Set<string>();
	const mergedTracks: Track[] = [];
	for (const track of [...likedSongs, ...librarySongs]) {
		if (seenTracks.has(track.videoId)) {
			continue;
		}

		seenTracks.add(track.videoId);
		mergedTracks.push(track);
		if (mergedTracks.length >= MAX_LIKED_SONGS) {
			break;
		}
	}

	return {
		likedSongs: mergedTracks,
		playlists: mergedPlaylists.slice(0, MAX_ACCOUNT_PLAYLISTS),
	};
}

async function applyMatchingFilter(
	library: unknown,
	matcher: (filter: string) => boolean,
): Promise<unknown | null> {
	const rec = asRecord(library);
	if (!rec || typeof rec['applyFilter'] !== 'function') {
		return null;
	}

	const filters = Array.isArray(rec['filters'])
		? rec['filters'].filter((item): item is string => typeof item === 'string')
		: [];
	const filter = pickLibraryFilter(filters, matcher);
	if (!filter) {
		return null;
	}

	try {
		return await (rec['applyFilter'] as (value: string) => Promise<unknown>)(
			filter,
		);
	} catch (error) {
		logger.debug('AccountLibrary', 'Library filter failed', {
			filter,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

async function collectContinuation(
	page: unknown,
	parse: (value: unknown) => void,
): Promise<void> {
	const rec = asRecord(page);
	if (
		!rec ||
		rec['has_continuation'] !== true ||
		typeof rec['getContinuation'] !== 'function'
	) {
		return;
	}

	try {
		const next = await (rec['getContinuation'] as () => Promise<unknown>)();
		parse(next);
	} catch (error) {
		logger.debug('AccountLibrary', 'Library continuation failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function fetchAccountLibrary(
	client: AccountLibraryClient,
): Promise<AccountLibrary> {
	const playlists: AccountLibraryPlaylist[] = [];
	const librarySongs: Track[] = [];

	try {
		const library = await client.getLibrary();
		playlists.push(...parseAccountLibraryPlaylists(library));
		librarySongs.push(...parseAccountLibraryTracks(library));

		const playlistPage = await applyMatchingFilter(library, filter =>
			/playlist/i.test(filter),
		);
		if (playlistPage) {
			playlists.push(...parseAccountLibraryPlaylists(playlistPage));
			await collectContinuation(playlistPage, page => {
				playlists.push(...parseAccountLibraryPlaylists(page));
			});
		}

		const songsPage = await applyMatchingFilter(library, filter =>
			/^songs?$/i.test(filter.trim()),
		);
		if (songsPage) {
			librarySongs.push(...parseAccountLibraryTracks(songsPage));
			await collectContinuation(songsPage, page => {
				librarySongs.push(...parseAccountLibraryTracks(page));
			});
		}
	} catch (error) {
		logger.warn('AccountLibrary', 'getLibrary failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	let likedSongs: Track[] = [];
	try {
		likedSongs = await client.getLikedSongs();
	} catch (error) {
		logger.debug('AccountLibrary', 'Liked songs browse failed', {
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return mergeAccountLibrary(playlists, likedSongs, librarySongs);
}
