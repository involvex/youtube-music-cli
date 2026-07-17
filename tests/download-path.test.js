import test from 'ava';
import os from 'node:os';
import path from 'node:path';
import {existsSync, rmSync} from 'node:fs';
import {
	ensureDownloadDirectory,
	normalizeDownloadDirectory,
} from '../source/utils/download-path.ts';

test('normalizeDownloadDirectory expands tilde to home', t => {
	const result = normalizeDownloadDirectory('~/Music/YMC');
	t.is(result, path.resolve(path.join(os.homedir(), 'Music', 'YMC')));
});

test('normalizeDownloadDirectory expands $HOME', t => {
	const result = normalizeDownloadDirectory('$HOME/downloads');
	t.is(result, path.resolve(path.join(os.homedir(), 'downloads')));
});

test('normalizeDownloadDirectory resolves relative paths', t => {
	const result = normalizeDownloadDirectory('./relative-dl');
	t.is(result, path.resolve('./relative-dl'));
});

test('normalizeDownloadDirectory rejects empty input', t => {
	t.throws(() => normalizeDownloadDirectory('   '), {
		message: 'Download folder cannot be empty',
	});
});

test('ensureDownloadDirectory creates the folder', t => {
	const target = path.join(os.tmpdir(), `ymc-download-path-test-${Date.now()}`);
	t.teardown(() => {
		if (existsSync(target)) {
			rmSync(target, {recursive: true, force: true});
		}
	});

	const result = ensureDownloadDirectory(target);
	t.is(result, path.resolve(target));
	t.true(existsSync(result));
});
