import {test, describe, expect, beforeEach, afterEach} from 'bun:test';
import {
	isTrackPlayableOffline,
	resolveTrackPlayUrl,
	areTracksPlayableOffline,
	resetDownloadsIndexForTests,
} from '../source/utils/local-track.ts';
import type {Track} from '../source/types/youtube-music.types.ts';

import {
	getOfflineState,
	setOfflineState,
	resetOfflineStateForTests,
} from '../source/services/offline/offline-mode.service.ts';

describe('Offline Mode Service', () => {
	describe('isTrackPlayableOffline', () => {
		beforeEach(() => {
			resetDownloadsIndexForTests();
		});

		afterEach(() => {
			resetDownloadsIndexForTests();
		});

		test('returns false for track without local file', () => {
			const track: Track = {
				videoId: 'nonexistent123',
				title: 'Test Track',
				artists: [{name: 'Test Artist', artistId: 'test-artist'}],
			};

			expect(isTrackPlayableOffline(track)).toBe(false);
		});
	});

	describe('resolveTrackPlayUrl', () => {
		beforeEach(() => {
			resetDownloadsIndexForTests();
		});

		afterEach(() => {
			resetDownloadsIndexForTests();
		});

		test('defaults to YouTube URL for non-downloaded tracks', () => {
			const track: Track = {
				videoId: 'test-track-id',
				title: 'Test Track',
				artists: [{name: 'Test Artist', artistId: 'test-artist'}],
			};

			const result = resolveTrackPlayUrl(track, {preferLocal: true});

			expect(result.source).toBe('youtube');
			expect(result.url).toContain('youtube.com');
		});

		test('uses YouTube when preferLocal is false', () => {
			const track: Track = {
				videoId: 'test-track-id',
				title: 'Test Track',
				artists: [{name: 'Test Artist', artistId: 'test-artist'}],
			};

			const result = resolveTrackPlayUrl(track, {preferLocal: false});

			expect(result.source).toBe('youtube');
			expect(result.url).toContain('youtube.com');
		});
	});

	describe('OfflineState management', () => {
		beforeEach(() => {
			resetOfflineStateForTests();
		});

		afterEach(() => {
			resetOfflineStateForTests();
		});

		test('getOfflineState returns valid structure', () => {
			const state = getOfflineState();

			expect(state).toHaveProperty('isOffline');
			expect(state).toHaveProperty('offlineTracks');
			expect(state).toHaveProperty('lastNetworkCheck');
			expect(Array.isArray(state.offlineTracks)).toBe(true);
		});

		test('setOfflineState updates state', () => {
			setOfflineState({
				isOffline: true,
				offlineTracks: [],
			});

			const state = getOfflineState();
			expect(state.isOffline).toBe(true);
		});

		test('areTracksPlayableOffline checks all tracks', () => {
			const tracks: Track[] = [
				{
					videoId: 'track1',
					title: 'Track 1',
					artists: [{name: 'Artist', artistId: 'artist1'}],
				},
				{
					videoId: 'track2',
					title: 'Track 2',
					artists: [{name: 'Artist', artistId: 'artist1'}],
				},
			];

			expect(areTracksPlayableOffline(tracks)).toBe(false);
		});
	});
});
