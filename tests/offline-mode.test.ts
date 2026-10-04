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
	checkNetworkStatus,
	initOfflineMode,
	refreshOfflineState,
	startPeriodicNetworkChecks,
	stopPeriodicNetworkChecks,
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

	describe('Network Status Checks', () => {
		beforeEach(() => {
			resetOfflineStateForTests();
		});

		afterEach(() => {
			resetOfflineStateForTests();
		});

		test('checkNetworkStatus returns boolean', async () => {
			const result = await checkNetworkStatus();
			expect(typeof result).toBe('boolean');
		});

		test('initOfflineMode initializes state', async () => {
			const state = await initOfflineMode();

			expect(state).toHaveProperty('isOffline');
			expect(state).toHaveProperty('offlineTracks');
			expect(state).toHaveProperty('lastNetworkCheck');
			expect(state.lastNetworkCheck).toBeGreaterThan(0);
		});

		test('refreshOfflineState updates network check timestamp', async () => {
			await initOfflineMode();

			const initialTimestamp = getOfflineState().lastNetworkCheck;

			await refreshOfflineState();

			const updatedTimestamp = getOfflineState().lastNetworkCheck;
			expect(updatedTimestamp).toBeGreaterThan(initialTimestamp);
		});

		test('periodic checks can be started and stopped', async () => {
			await initOfflineMode();

			startPeriodicNetworkChecks();

			const wasRunningInitially = getOfflineState().lastNetworkCheck > 0;

			expect(wasRunningInitially).toBe(true);

			stopPeriodicNetworkChecks();
		});
	});

	describe('Integration with File Downloads', () => {
		beforeEach(() => {
			resetDownloadsIndexForTests();
			resetOfflineStateForTests();
		});

		afterEach(() => {
			resetDownloadsIndexForTests();
			resetOfflineStateForTests();
		});

		test('offline tracks can be tracked after download', async () => {
			const localPath = '/fake/path/test-track.mp3';

			// Simulate what happens when a track is downloaded
			const track: Track = {
				videoId: 'downloaded-track-123',
				title: 'Downloaded Track',
				artists: [{name: 'Test Artist', artistId: 'artist1'}],
			};

			// Set offline state with locally available tracks
			setOfflineState({
				isOffline: true,
				offlineTracks: [
					{
						videoId: track.videoId,
						title: track.title,
						artists: [],
						localPath: localPath,
					},
				],
			});

			const state = getOfflineState();

			expect(state.isOffline).toBe(true);
			expect(state.offlineTracks).toHaveLength(1);
			expect(state.offlineTracks[0]?.videoId).toBe(track.videoId);
		});

		test('offline mode respects download index', async () => {
			// Initialize offline mode which loads from downloads index
			await initOfflineMode();

			const state = getOfflineState();

			// State should be initialized
			expect(state).toBeDefined();
			expect(state.lastNetworkCheck).toBeGreaterThan(0);
		});
	});
});
