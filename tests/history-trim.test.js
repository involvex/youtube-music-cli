import {expect, test} from 'bun:test';

function sampleEntries(count) {
	return Array.from({length: count}, (_, index) => ({
		track: {
			videoId: `id-${index}`,
			title: `Track ${index}`,
			artists: [{name: 'Artist', id: 'a'}],
			duration: 120,
			thumbnails: [],
		},
		playedAt: new Date(2026, 0, index + 1).toISOString(),
	}));
}

test('history trimHistoryEntries caps length when max is positive', async () => {
	const {trimHistoryEntries} =
		await import('../source/services/history/history.service.ts');

	const entries = sampleEntries(5);
	const trimmed = trimHistoryEntries(entries, 3);
	expect(trimmed.length).toBe(3);
	expect(trimmed[0]?.track.videoId).toBe('id-0');
	expect(trimmed[2]?.track.videoId).toBe('id-2');
});

test('history trimHistoryEntries keeps all entries when max is 0 (unlimited)', async () => {
	const {trimHistoryEntries} =
		await import('../source/services/history/history.service.ts');

	const entries = sampleEntries(5);
	expect(trimHistoryEntries(entries, 0)).toEqual(entries);
	expect(trimHistoryEntries(entries, -1)).toEqual(entries);
});

test('DEFAULT_MAX_HISTORY_ENTRIES is unlimited', async () => {
	const {DEFAULT_MAX_HISTORY_ENTRIES} =
		await import('../source/services/history/history.service.ts');
	expect(DEFAULT_MAX_HISTORY_ENTRIES).toBe(0);
});
