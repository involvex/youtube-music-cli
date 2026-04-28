import test from 'ava';

test('download config defaults are present', async t => {
	const {getConfigService} =
		await import('../source/services/config/config.service.ts');
	const config = getConfigService();

	t.is(typeof (config.get('downloadsEnabled') ?? false), 'boolean');
	t.truthy(config.get('downloadDirectory'));
	t.is(config.get('downloadFormat'), 'mp3');
});

test('download keybinding is registered as shift+d', async t => {
	const {KEYBINDINGS} = await import('../source/utils/constants.ts');
	t.deepEqual(KEYBINDINGS.DOWNLOAD, ['shift+d']);
});

test('download service resolves song selection to one track', async t => {
	const {getDownloadService} =
		await import('../source/services/download/download.service.ts');

	const service = getDownloadService();
	const result = await service.resolveSearchTarget({
		type: 'song',
		data: {
			videoId: 'abc123',
			title: 'Track',
			artists: [{artistId: 'artist1', name: 'Artist'}],
		},
	});

	t.is(result.tracks.length, 1);
	t.is(result.tracks[0].videoId, 'abc123');
});
