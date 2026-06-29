import test from 'ava';

const sampleTrack = {
	videoId: 'abc123',
	title: 'Sample Song',
	artists: [{artistId: 'a1', name: 'Artist'}],
};

test('favorites: parseFavoritesFileContent accepts schema-versioned payload', async t => {
	const {parseFavoritesFileContent} =
		await import('../source/services/favorites/favorites.service.ts');

	const tracks = parseFavoritesFileContent({
		schemaVersion: 1,
		tracks: [sampleTrack],
		lastUpdated: '2026-01-01T00:00:00.000Z',
	});

	t.is(tracks.length, 1);
	t.is(tracks[0]?.videoId, 'abc123');
});

test('favorites: parseFavoritesFileContent migrates legacy payloads without schemaVersion', async t => {
	const {parseFavoritesFileContent} =
		await import('../source/services/favorites/favorites.service.ts');

	const tracks = parseFavoritesFileContent({
		tracks: [sampleTrack],
	});

	t.is(tracks.length, 1);
});

test('favorites: parseFavoritesFileContent accepts bare track arrays', async t => {
	const {parseFavoritesFileContent} =
		await import('../source/services/favorites/favorites.service.ts');

	const tracks = parseFavoritesFileContent([sampleTrack]);
	t.is(tracks.length, 1);
});

test('favorites: parseFavoritesFileContent filters invalid entries', async t => {
	const {parseFavoritesFileContent} =
		await import('../source/services/favorites/favorites.service.ts');

	const tracks = parseFavoritesFileContent({
		schemaVersion: 1,
		tracks: [{videoId: 'x'}, sampleTrack, null, 'bad'],
	});
	t.is(tracks.length, 1);
});
