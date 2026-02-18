import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'ava';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

// Enable TS imports for source files
register('ts-node/esm', pathToFileURL('./'));

test('loads and initializes a plugin from disk', async t => {
	const dir = mkdtempSync(join(tmpdir(), 'plugin-'));
	const manifest = {
		id: 'test-plugin',
		name: 'Test Plugin',
		version: '1.0.0',
		description: 'Test plugin',
		author: 'tester',
		main: 'index.js',
		permissions: ['player'],
	};

	writeFileSync(join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2));

	const pluginSource = `
		export const manifest = ${JSON.stringify(manifest)};
		export async function init(ctx){ ctx.logger.info('init called'); }
		export default {manifest, init};
	`;
	writeFileSync(join(dir, 'index.js'), pluginSource);

	const {getPluginLoaderService, resetPluginLoaderService} =
		await import('../source/services/plugin/plugin-loader.service.ts');

	resetPluginLoaderService();
	const loader = getPluginLoaderService();

	const instance = await loader.loadPlugin(dir);
	t.is(instance.manifest.id, 'test-plugin');
	t.is(instance.plugin.manifest.name, 'Test Plugin');

	// Provide minimal context for hook call
	const context = {
		logger: {info: () => {}},
		manifest: instance.manifest,
	};

	await loader.callHook(instance.plugin, 'init', context);

	t.pass();
});
