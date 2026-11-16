import {afterEach, beforeEach, expect, test} from 'bun:test';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getConfigService} from '../source/services/config/config.service.ts';
import {
	findMaterializedPlaylist,
	getMaterializedPlaylistId,
	listDefinitions,
	refreshOne,
} from '../source/services/smart-playlist/smart-playlist.service.ts';
import {
	resetSmartPlaylistsStorageForTests,
	setSmartPlaylistsFilePathForTests,
} from '../source/services/smart-playlist/smart-playlist-storage.ts';

let tempDir;
let previousPlaylists;

function entry(videoId, title, artist, playedAt) {
	return {
		track: {
			videoId,
			title,
			artists: [{name: artist, artistId: artist.toLowerCase()}],
			duration: 180,
		},
		playedAt,
	};
}

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), 'ymc-smart-playlist-'));
	setSmartPlaylistsFilePathForTests(join(tempDir, 'smart-playlists.json'));
	previousPlaylists = getConfigService().get('playlists');
	getConfigService().set('playlists', []);
});

afterEach(() => {
	getConfigService().set('playlists', previousPlaylists);
	resetSmartPlaylistsStorageForTests();
	rmSync(tempDir, {recursive: true, force: true});
});

test('listDefinitions seeds builtin smart playlists', async () => {
	const definitions = await listDefinitions();
	expect(definitions.length).toBe(4);
	expect(definitions.map(d => d.id).toSorted()).toEqual([
		'rediscover',
		'top_artist_deep_dive',
		'top_tracks_7d',
		'top_tracks_all',
	]);
});

test('refreshOne upserts stable smart-* playlist id', async () => {
	const entries = [
		entry('a', 'A', 'X', '2026-11-15T00:00:00.000Z'),
		entry('a', 'A', 'X', '2026-11-14T00:00:00.000Z'),
		entry('b', 'B', 'Y', '2026-11-13T00:00:00.000Z'),
	];

	const result = await refreshOne('top_tracks_all', {entries});
	expect(result.playlistId).toBe(getMaterializedPlaylistId('top_tracks_all'));
	expect(result.created).toBe(true);
	expect(result.trackCount).toBe(2);

	const playlist = findMaterializedPlaylist('top_tracks_all');
	expect(playlist?.playlistId).toBe('smart-top_tracks_all');
	expect(playlist?.name).toBe('Smart: Top Tracks');
	expect(playlist?.tracks.map(t => t.videoId)).toEqual(['a', 'b']);
});

test('refreshOne keeps custom playlist name on refresh', async () => {
	const entries = [
		entry('a', 'A', 'X', '2026-11-15T00:00:00.000Z'),
		entry('b', 'B', 'Y', '2026-11-13T00:00:00.000Z'),
	];

	await refreshOne('top_tracks_all', {entries});
	const playlists = getConfigService()
		.get('playlists')
		.map(p =>
			p.playlistId === 'smart-top_tracks_all'
				? {...p, name: 'My Custom Smart Mix'}
				: p,
		);
	getConfigService().set('playlists', playlists);

	const moreEntries = [
		...entries,
		entry('c', 'C', 'Z', '2026-11-12T00:00:00.000Z'),
		entry('c', 'C', 'Z', '2026-11-11T00:00:00.000Z'),
	];
	const result = await refreshOne('top_tracks_all', {entries: moreEntries});
	expect(result.created).toBe(false);

	const playlist = findMaterializedPlaylist('top_tracks_all');
	expect(playlist?.name).toBe('My Custom Smart Mix');
	expect(playlist?.tracks[0]?.videoId).toBe('c');
});
