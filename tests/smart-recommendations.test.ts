import {afterEach, describe, expect, it, mock, spyOn} from 'bun:test';
import {getMusicService} from '../source/services/youtube-music/api.ts';
import {getSmartRecommendations} from '../source/services/youtube-music/smart-recommendations.service.ts';
import type {Track} from '../source/types/youtube-music.types.ts';

function cannedTrack(videoId: string, title: string, artist: string): Track {
	return {
		videoId,
		title,
		artists: [{name: artist, artistId: `test-${artist}`}],
		duration: 180,
	};
}

describe('SmartRecommendations', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should return recommendations with diversity capping', async () => {
		// Stub the singleton instance (restored above): no module mocks, so
		// nothing leaks into other test files sharing this process.
		spyOn(getMusicService(), 'getSuggestions').mockResolvedValue([
			cannedTrack('test-video-a1', 'Track A1', 'Artist A'),
			cannedTrack('test-video-a2', 'Track A2', 'Artist A'),
			cannedTrack('test-video-a3', 'Track A3', 'Artist A'),
			cannedTrack('test-video-b1', 'Track B1', 'Artist B'),
			cannedTrack('test-video-b2', 'Track B2', 'Artist B'),
			cannedTrack('test-video-c1', 'Track C1', 'Artist C'),
		]);

		const seedTrack: Track = {
			videoId: 'seed123',
			title: 'Seed Track',
			artists: [{name: 'Artist A', artistId: 'artist1'}],
			duration: 180,
		};

		const recommendations = await getSmartRecommendations(seedTrack, 5);
		expect(Array.isArray(recommendations)).toBe(true);
		expect(recommendations.length).toBe(5);

		const counts = new Map<string, number>();
		for (const track of recommendations) {
			const artist = track.artists[0]?.name ?? 'unknown';
			counts.set(artist, (counts.get(artist) ?? 0) + 1);
		}
		for (const count of counts.values()) {
			expect(count).toBeLessThanOrEqual(2);
		}
		expect(counts.get('Artist A')).toBe(2);
	});
});
