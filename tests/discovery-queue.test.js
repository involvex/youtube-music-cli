import {afterEach, describe, expect, it, mock, spyOn} from 'bun:test';
import {
	pickDiscoveryAnchors,
	DISCOVERY_RECENT_SKIP,
} from '../source/services/radio/discovery-queue.service.ts';
import {
	getRadioService,
	resetRadioService,
} from '../source/services/radio/radio.service.ts';
import {getMusicService} from '../source/services/youtube-music/api.ts';

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

function track(videoId, title = videoId, artist = 'Artist') {
	return {
		videoId,
		title,
		artists: [{name: artist, artistId: artist.toLowerCase()}],
		duration: 180,
	};
}

describe('pickDiscoveryAnchors', () => {
	it('skips the newest recent plays and prefers top artists', () => {
		const entries = [];
		for (let i = 0; i < DISCOVERY_RECENT_SKIP; i++) {
			entries.push(
				entry(
					`recent-${i}`,
					`Recent ${i}`,
					'Recent Artist',
					`2026-11-22T0${i}:00:00.000Z`,
				),
			);
		}
		entries.push(entry('a1', 'A1', 'Alpha', '2026-10-01T00:00:00.000Z'));
		entries.push(entry('a2', 'A2', 'Alpha', '2026-10-02T00:00:00.000Z'));
		entries.push(entry('b1', 'B1', 'Beta', '2026-10-03T00:00:00.000Z'));
		entries.push(entry('c1', 'C1', 'Gamma', '2026-10-04T00:00:00.000Z'));

		const anchors = pickDiscoveryAnchors(entries, {anchorCount: 3});
		expect(anchors.length).toBe(3);
		expect(anchors.every(a => !a.videoId.startsWith('recent-'))).toBe(true);
		expect(anchors[0]?.artists[0]?.name).toBe('Alpha');
	});

	it('falls back to recent history when older pool is empty', () => {
		const entries = [
			entry('only-1', 'Only', 'Solo', '2026-11-22T00:00:00.000Z'),
		];
		const anchors = pickDiscoveryAnchors(entries, {
			recentSkip: 50,
			anchorCount: 2,
		});
		expect(anchors.length).toBe(1);
		expect(anchors[0]?.videoId).toBe('only-1');
	});

	it('returns empty for empty history', () => {
		expect(pickDiscoveryAnchors([])).toEqual([]);
	});
});

describe('RadioService continuation', () => {
	afterEach(() => {
		mock.restore();
		resetRadioService();
	});

	it('artist refill uses getSuggestions instead of searching again', async () => {
		const music = getMusicService();
		const searchSpy = spyOn(music, 'search').mockResolvedValue({
			results: [
				{type: 'song', data: track('s1', 'Song 1', 'Artist')},
				{type: 'song', data: track('s2', 'Song 2', 'Artist')},
			],
			hasMore: false,
		});
		const suggestionsSpy = spyOn(music, 'getSuggestions').mockResolvedValue([
			track('s3', 'Song 3', 'Artist'),
			track('s4', 'Song 4', 'Other'),
		]);

		const radio = getRadioService();
		const first = await radio.fetchTracksForSeed({
			type: 'artist',
			id: 'Artist',
			name: 'Artist',
		});
		expect(first.map(t => t.videoId)).toEqual(['s1', 's2']);
		expect(searchSpy).toHaveBeenCalledTimes(1);

		const more = await radio.fetchMoreTracks({
			type: 'artist',
			id: 'Artist',
			name: 'Artist',
		});
		expect(searchSpy).toHaveBeenCalledTimes(1);
		expect(suggestionsSpy).toHaveBeenCalled();
		expect(more.map(t => t.videoId)).toEqual(['s3', 's4']);
	});

	it('mood refill uses suggestions after the initial seed search', async () => {
		const music = getMusicService();
		spyOn(music, 'search').mockResolvedValue({
			results: [{type: 'song', data: track('m1', 'Mood 1', 'Brian Eno')}],
			hasMore: false,
		});
		const suggestionsSpy = spyOn(music, 'getSuggestions').mockResolvedValue([
			track('m2', 'Mood 2', 'Enya'),
		]);

		const radio = getRadioService();
		const first = await radio.fetchTracksForSeed({
			type: 'mood',
			id: 'relaxing',
			name: 'Relaxing',
		});
		expect(first.length).toBeGreaterThan(0);
		const searchCalls = music.search.mock.calls.length;

		await radio.fetchMoreTracks({
			type: 'mood',
			id: 'relaxing',
			name: 'Relaxing',
		});
		expect(music.search.mock.calls.length).toBe(searchCalls);
		expect(suggestionsSpy).toHaveBeenCalled();
	});

	it('genre walks the next playlist before falling back to suggestions', async () => {
		const music = getMusicService();
		spyOn(music, 'getGenrePlaylists').mockResolvedValue([
			{title: 'G1', browseId: 'PL1'},
			{title: 'G2', browseId: 'PL2'},
		]);
		const playlistSpy = spyOn(music, 'getPlaylist').mockImplementation(
			async id => ({
				playlistId: id,
				name: id,
				tracks: [track(`${id}-t1`, id, 'Genre Artist')],
			}),
		);
		const suggestionsSpy = spyOn(music, 'getSuggestions').mockResolvedValue([
			track('g-extra', 'Extra', 'Genre Artist'),
		]);

		const radio = getRadioService();
		const first = await radio.fetchTracksForSeed({
			type: 'genre',
			id: 'genre-1',
			name: 'Genre',
		});
		expect(first[0]?.videoId).toBe('PL1-t1');
		expect(playlistSpy).toHaveBeenCalledWith('PL1');

		const second = await radio.fetchMoreTracks({
			type: 'genre',
			id: 'genre-1',
			name: 'Genre',
		});
		expect(second[0]?.videoId).toBe('PL2-t1');
		expect(playlistSpy).toHaveBeenCalledWith('PL2');
		expect(suggestionsSpy).not.toHaveBeenCalled();

		const third = await radio.fetchMoreTracks({
			type: 'genre',
			id: 'genre-1',
			name: 'Genre',
		});
		expect(suggestionsSpy).toHaveBeenCalled();
		expect(third[0]?.videoId).toBe('g-extra');
	});

	it('album seed loads release tracks then continues with suggestions', async () => {
		const music = getMusicService();
		spyOn(music, 'getReleaseTracks').mockResolvedValue([
			track('al1', 'Album 1', 'Band'),
			track('al2', 'Album 2', 'Band'),
		]);
		const suggestionsSpy = spyOn(music, 'getSuggestions').mockResolvedValue([
			track('al3', 'Related', 'Band'),
		]);

		const radio = getRadioService();
		const first = await radio.fetchTracksForSeed({
			type: 'album',
			id: 'MPREb_test',
			name: 'Test Album',
		});
		expect(first.map(t => t.videoId)).toEqual(['al1', 'al2']);

		const more = await radio.fetchMoreTracks({
			type: 'album',
			id: 'MPREb_test',
			name: 'Test Album',
		});
		expect(suggestionsSpy).toHaveBeenCalledWith('al1');
		expect(more.map(t => t.videoId)).toEqual(['al3']);
	});
});

describe('radioSeedFromSearchResult', () => {
	it('builds artist and album radio seeds', async () => {
		const {radioSeedFromSearchResult} =
			await import('../source/immersive/actions/playback-actions.ts');

		expect(
			radioSeedFromSearchResult({
				type: 'artist',
				data: {artistId: 'a1', name: 'Daft Punk'},
			}),
		).toEqual({type: 'artist', id: 'Daft Punk', name: 'Daft Punk'});

		expect(
			radioSeedFromSearchResult({
				type: 'album',
				data: {
					albumId: 'MPREb_x',
					name: 'Discovery',
					artists: [{artistId: 'a1', name: 'Daft Punk'}],
				},
			}),
		).toEqual({type: 'album', id: 'MPREb_x', name: 'Discovery'});

		expect(
			radioSeedFromSearchResult({
				type: 'song',
				data: track('v1'),
			}),
		).toBeNull();
	});
});
