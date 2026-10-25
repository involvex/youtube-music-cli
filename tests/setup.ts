// Test preload: point HOME at a throwaway directory before any source module
// computes CONFIG_DIR. Without this, tests read and write the developer's real
// ~/.youtube-music-cli (auth tests sign the user out, config tests overwrite
// config.json and create backups).
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const testHome = mkdtempSync(join(tmpdir(), 'ymc-test-home-'));
process.env['HOME'] = testHome;
process.env['USERPROFILE'] = testHome;

process.on('exit', () => {
	rmSync(testHome, {recursive: true, force: true});
});
