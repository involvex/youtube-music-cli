import test from 'ava';
import {computeStats} from '../source/services/stats/stats.service.ts';

function makeEntry(videoId, title, artists, duration, daysAgo) {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	return {
		track: {
			videoId,
			title,
			artists: artists.map(name => ({artistId: name.toLowerCase(), name})),
			duration,
		},
		playedAt: date.toISOString(),
	};
}

test('computeStats: returns empty stats for empty history', t => {
	const stats = computeStats([]);
	t.is(stats.totalPlays, 0);
	t.is(stats.totalListeningMinutes, 0);
	t.is(stats.uniqueTracks, 0);
	t.is(stats.uniqueArtists, 0);
	t.is(stats.topTracks.length, 0);
	t.is(stats.topArtists.length, 0);
	t.is(stats.currentStreak, 0);
	t.is(stats.longestStreak, 0);
	t.is(stats.firstPlayDate, null);
});

test('computeStats: counts total plays correctly', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 180, 0),
		makeEntry('v1', 'Song A', ['Artist X'], 180, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 240, 1),
	];
	const stats = computeStats(entries);
	t.is(stats.totalPlays, 3);
});

test('computeStats: estimates listening time from track duration', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 180, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 240, 1),
	];
	const stats = computeStats(entries);
	t.is(stats.totalListeningMinutes, 7);
});

test('computeStats: uses default 240s when track duration is undefined', t => {
	const entries = [makeEntry('v1', 'Song A', ['Artist X'], undefined, 0)];
	const stats = computeStats(entries);
	t.is(stats.totalListeningMinutes, 4);
});

test('computeStats: counts unique tracks and artists', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 0),
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
	];
	const stats = computeStats(entries);
	t.is(stats.uniqueTracks, 2);
	t.is(stats.uniqueArtists, 2);
});

test('computeStats: computes top tracks sorted by play count', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 0),
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
	];
	const stats = computeStats(entries);
	t.is(stats.topTracks[0].track.videoId, 'v1');
	t.is(stats.topTracks[0].playCount, 3);
	t.is(stats.topTracks[1].track.videoId, 'v2');
	t.is(stats.topTracks[1].playCount, 1);
});

test('computeStats: computes top artists with play counts', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist X'], 200, 0),
		makeEntry('v3', 'Song C', ['Artist Y'], 200, 0),
	];
	const stats = computeStats(entries);
	t.is(stats.topArtists[0].name, 'Artist X');
	t.is(stats.topArtists[0].playCount, 2);
	t.is(stats.topArtists[0].uniqueTracks, 2);
});

test('computeStats: handles tracks with no artists', t => {
	const entry = {
		track: {
			videoId: 'v1',
			title: 'Unknown Artist Song',
			artists: [],
			duration: 200,
		},
		playedAt: new Date().toISOString(),
	};
	const stats = computeStats([entry]);
	t.is(stats.uniqueArtists, 1);
	t.is(stats.topArtists[0].name, 'Unknown');
});

test('computeStats: computes listening by day for last 14 days', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 0),
	];
	const stats = computeStats(entries);
	t.is(stats.listeningByDay.length, 14);
	const today = stats.listeningByDay[stats.listeningByDay.length - 1];
	t.is(today.playCount, 2);
});

test('computeStats: computes current streak', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 1),
		makeEntry('v3', 'Song C', ['Artist Z'], 200, 2),
	];
	const stats = computeStats(entries);
	t.is(stats.currentStreak, 3);
});

test('computeStats: computes longest streak', t => {
	const entries = [
		makeEntry('v1', 'Song A', ['Artist X'], 200, 0),
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 1),
		makeEntry('v3', 'Song C', ['Artist Z'], 200, 2),
		makeEntry('v4', 'Song D', ['Artist W'], 200, 10),
		makeEntry('v5', 'Song E', ['Artist V'], 200, 11),
	];
	const stats = computeStats(entries);
	t.is(stats.longestStreak, 3);
});

test('computeStats: sets firstPlayDate to earliest entry', t => {
	const entries = [
		makeEntry('v2', 'Song B', ['Artist Y'], 200, 5),
		makeEntry('v1', 'Song A', ['Artist X'], 200, 10),
	];
	const stats = computeStats(entries);
	t.truthy(stats.firstPlayDate);
});

test('computeStats: limits top tracks and artists to 10', t => {
	const entries = [];
	for (let i = 0; i < 15; i++) {
		entries.push(makeEntry(`v${i}`, `Song ${i}`, [`Artist ${i}`], 200, 0));
	}

	const stats = computeStats(entries);
	t.is(stats.topTracks.length, 10);
	t.is(stats.topArtists.length, 10);
});
