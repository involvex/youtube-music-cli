import {expect, test} from 'bun:test';
import {materializeTracks} from '../source/services/smart-playlist/smart-playlist-rules.ts';

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

const now = Date.parse('2026-11-16T12:00:00.000Z');

test('materializeTracks returns empty for empty history', () => {
	expect(materializeTracks('top_tracks_7d', [], undefined, now)).toEqual([]);
	expect(materializeTracks('top_tracks_all', [], undefined, now)).toEqual([]);
	expect(materializeTracks('rediscover', [], undefined, now)).toEqual([]);
	expect(materializeTracks('top_artist_deep_dive', [], undefined, now)).toEqual(
		[],
	);
});

test('top_tracks_7d windows by days and sorts by play count', () => {
	const entries = [
		entry('a', 'A', 'X', '2026-11-15T10:00:00.000Z'),
		entry('a', 'A', 'X', '2026-11-14T10:00:00.000Z'),
		entry('b', 'B', 'Y', '2026-11-13T10:00:00.000Z'),
		entry('c', 'C', 'Z', '2026-10-01T10:00:00.000Z'),
	];
	const tracks = materializeTracks(
		'top_tracks_7d',
		entries,
		{limit: 10, days: 7},
		now,
	);
	expect(tracks.map(t => t.videoId)).toEqual(['a', 'b']);
});

test('top_tracks_all respects limit', () => {
	const entries = [
		entry('a', 'A', 'X', '2026-11-01T00:00:00.000Z'),
		entry('a', 'A', 'X', '2026-11-02T00:00:00.000Z'),
		entry('b', 'B', 'Y', '2026-11-03T00:00:00.000Z'),
		entry('c', 'C', 'Z', '2026-11-04T00:00:00.000Z'),
	];
	const tracks = materializeTracks('top_tracks_all', entries, {limit: 2}, now);
	expect(tracks.map(t => t.videoId)).toEqual(['a', 'c']);
});

test('rediscover requires minPlays and stale lastPlayedAt', () => {
	const entries = [
		entry('old', 'Old', 'X', '2026-10-01T00:00:00.000Z'),
		entry('old', 'Old', 'X', '2026-10-02T00:00:00.000Z'),
		entry('recent', 'Recent', 'Y', '2026-11-15T00:00:00.000Z'),
		entry('recent', 'Recent', 'Y', '2026-11-14T00:00:00.000Z'),
		entry('once', 'Once', 'Z', '2026-09-01T00:00:00.000Z'),
	];
	const tracks = materializeTracks(
		'rediscover',
		entries,
		{limit: 10, days: 14, minPlays: 2},
		now,
	);
	expect(tracks.map(t => t.videoId)).toEqual(['old']);
});

test('top_artist_deep_dive picks tracks from top artist', () => {
	const entries = [
		entry('a1', 'A1', 'Alpha', '2026-11-01T00:00:00.000Z'),
		entry('a2', 'A2', 'Alpha', '2026-11-02T00:00:00.000Z'),
		entry('a1', 'A1', 'Alpha', '2026-11-03T00:00:00.000Z'),
		entry('b1', 'B1', 'Beta', '2026-11-04T00:00:00.000Z'),
	];
	const tracks = materializeTracks(
		'top_artist_deep_dive',
		entries,
		{limit: 10},
		now,
	);
	expect(tracks.every(t => t.artists[0].name === 'Alpha')).toBe(true);
	expect(tracks.map(t => t.videoId)).toEqual(['a1', 'a2']);
});
