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

test('favorites: saveFavorites refuses empty overwrite of populated file', async t => {
	const {mkdtempSync, readFileSync, rmSync, writeFileSync} =
		await import('node:fs');
	const {tmpdir} = await import('node:os');
	const {join} = await import('node:path');
	const {
		loadFavorites,
		parseFavoritesFileContent,
		saveFavorites,
		setFavoritesFilePathForTests,
	} = await import('../source/services/favorites/favorites.service.ts');

	const tempDir = mkdtempSync(join(tmpdir(), 'ymc-favorites-save-test-'));
	const favoritesFile = join(tempDir, 'favorites.json');
	setFavoritesFilePathForTests(favoritesFile);
	t.teardown(() => {
		setFavoritesFilePathForTests(null);
		rmSync(tempDir, {force: true, recursive: true});
	});

	writeFileSync(
		favoritesFile,
		JSON.stringify({schemaVersion: 1, tracks: [sampleTrack]}, null, 2),
		'utf8',
	);

	await saveFavorites([]);
	const persisted = parseFavoritesFileContent(
		JSON.parse(readFileSync(favoritesFile, 'utf8')),
	);
	t.is(persisted.length, 1);

	await saveFavorites([], {allowEmptyOverwrite: true});
	const cleared = await loadFavorites();
	t.is(cleared.length, 0);
});
