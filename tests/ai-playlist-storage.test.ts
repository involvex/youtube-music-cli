// Tests for AI Playlist storage utility
import {test, expect, beforeEach, afterEach, describe} from 'bun:test';
import {
	loadAIPlaylists,
	saveAIPlaylist,
	deleteAIPlaylist,
} from '../source/utils/ai-playlist-storage.ts';
import {CONFIG_DIR} from '../source/utils/constants.ts';
import {writeFileSync, existsSync, rmSync} from 'node:fs';

const TEST_STORAGE_FILE = `${CONFIG_DIR}/ai-playlists.json`;

function cleanTestFile(): void {
	if (existsSync(TEST_STORAGE_FILE)) {
		rmSync(TEST_STORAGE_FILE);
	}
}

describe('AI Playlist Storage', () => {
	beforeEach(() => {
		cleanTestFile();
	});

	afterEach(() => {
		cleanTestFile();
	});

	test('loadAIPlaylists returns empty array when file does not exist', () => {
		const playlists = loadAIPlaylists();
		expect(playlists).toEqual([]);
	});

	test('saveAIPlaylist and loadAIPlaylists roundtrip', () => {
		const playlist = {
			id: 'test-1',
			name: 'Test Playlist',
			prompt: 'test prompt',
			tracks: [{videoId: 'abc123', title: 'Track 1', artists: ['Artist 1']}],
			createdAt: Date.now(),
		};

		saveAIPlaylist(playlist);
		const loaded = loadAIPlaylists();

		expect(loaded.length).toBe(1);
		const first = loaded[0];
		expect(first).toBeDefined();
		if (first) {
			expect(first.id).toBe('test-1');
			expect(first.name).toBe('Test Playlist');
			expect(first.tracks.length).toBe(1);
		}
	});

	test('saveAIPlaylist updates existing playlist', () => {
		const playlist1 = {
			id: 'test-1',
			name: 'Test Playlist',
			prompt: 'test prompt',
			tracks: [],
			createdAt: Date.now(),
		};

		const playlist2 = {
			...playlist1,
			name: 'Updated Playlist',
			modifiedAt: Date.now(),
		};

		saveAIPlaylist(playlist1);
		saveAIPlaylist(playlist2);

		const loaded = loadAIPlaylists();
		expect(loaded.length).toBe(1);
		const first = loaded[0];
		expect(first).toBeDefined();
		if (first) {
			expect(first.name).toBe('Updated Playlist');
			expect(first.modifiedAt).toBeDefined();
		}
	});

	test('deleteAIPlaylist removes playlist', () => {
		const playlist = {
			id: 'test-1',
			name: 'Test Playlist',
			prompt: 'test prompt',
			tracks: [],
			createdAt: Date.now(),
		};

		saveAIPlaylist(playlist);
		expect(loadAIPlaylists().length).toBe(1);

		deleteAIPlaylist('test-1');
		expect(loadAIPlaylists().length).toBe(0);
	});

	test('deleteAIPlaylist handles non-existent id gracefully', () => {
		deleteAIPlaylist('non-existent');
		expect(loadAIPlaylists()).toEqual([]);
	});

	test('handles corrupted JSON gracefully', () => {
		writeFileSync(TEST_STORAGE_FILE, 'invalid json');
		const loaded = loadAIPlaylists();
		expect(loaded).toEqual([]);
	});

	test('handles non-array JSON gracefully', () => {
		writeFileSync(TEST_STORAGE_FILE, '{"not": "an array"}');
		const loaded = loadAIPlaylists();
		expect(loaded).toEqual([]);
	});
});
