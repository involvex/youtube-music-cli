import {expect, test} from 'bun:test';
import {isSafePluginId} from '../source/services/plugin/plugin-installer.service.ts';

test('isSafePluginId accepts normal ids and rejects path tricks', () => {
	for (const id of ['adblock', 'lyrics', 'my-plugin_2', 'plugin.v2']) {
		expect(isSafePluginId(id)).toBe(true);
	}

	for (const id of [
		'',
		'.',
		'..',
		'../evil',
		'a/b',
		'a\\b',
		'.temp-install',
		'/etc',
		'C:\\x',
		undefined,
	]) {
		expect(isSafePluginId(id)).toBe(false);
	}
});

test('uninstall refuses ids that would resolve outside the plugins dir', async () => {
	const {getPluginInstallerService} =
		await import('../source/services/plugin/plugin-installer.service.ts');

	const result = await getPluginInstallerService().uninstall('..');
	expect(result.success).toBe(false);
	expect(result.error).toContain('Invalid plugin id');
});
