// Type tests for AI Playlist
import {
	type AIPlaylist,
	type AITrack,
} from '../source/types/ai-playlist.types.ts';
import {test, expect} from 'bun:test';

// This test verifies the types compile correctly
test('AIPlaylist types compile', () => {
	const track: AITrack = {
		videoId: 'abc123',
		title: 'Test Track',
		artists: ['Test Artist'],
		duration: 180,
		source: 'search',
	};

	const playlist: AIPlaylist = {
		id: '1',
		name: 'Test Playlist',
		prompt: 'test prompt',
		tracks: [track],
		createdAt: Date.now(),
	};

	// Test optional modifiedAt
	const playlistWithModified: AIPlaylist = {
		...playlist,
		modifiedAt: Date.now(),
	};

	expect(track.videoId).toBe('abc123');
	expect(playlist.id).toBe('1');
	expect(playlistWithModified.modifiedAt).toBeDefined();
});
