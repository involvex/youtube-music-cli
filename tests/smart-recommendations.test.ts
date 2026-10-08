import {describe, it, expect, mock} from 'bun:test';

mock.module('../source/services/youtube-music/api.ts', () => ({
	getMusicService: () => ({
		getSuggestions: async () => [
			{
				videoId: 'test-video-a1',
				title: 'Track A1',
				artists: [{name: 'Artist A', artistId: 'artist-a'}],
				duration: 180,
			},
			{
				videoId: 'test-video-a2',
				title: 'Track A2',
				artists: [{name: 'Artist A', artistId: 'artist-a'}],
				duration: 200,
			},
			{
				videoId: 'test-video-a3',
				title: 'Track A3',
				artists: [{name: 'Artist A', artistId: 'artist-a'}],
				duration: 210,
			},
			{
				videoId: 'test-video-b1',
				title: 'Track B1',
				artists: [{name: 'Artist B', artistId: 'artist-b'}],
				duration: 190,
			},
			{
				videoId: 'test-video-b2',
				title: 'Track B2',
				artists: [{name: 'Artist B', artistId: 'artist-b'}],
				duration: 220,
			},
			{
				videoId: 'test-video-c1',
				title: 'Track C1',
				artists: [{name: 'Artist C', artistId: 'artist-c'}],
				duration: 230,
			},
		],
		getTrending: async () => [],
	}),
}));

import {getSmartRecommendations} from '../source/services/youtube-music/smart-recommendations.service.ts';
import type {Track} from '../source/types/youtube-music.types.ts';

describe('SmartRecommendations', () => {
	it('should return recommendations with diversity capping', async () => {
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
