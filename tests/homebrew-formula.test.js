import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'ava';

const repoRoot = process.cwd();
const formulaPath = join(repoRoot, 'Formula', 'youtube-music-cli.rb');
const workflowPath = join(
	repoRoot,
	'.github',
	'workflows',
	'homebrew-publish.yml',
);

const expectedSymlinks = [
	'bin.install_symlink libexec/"bin/youtube-music-cli"',
	'bin.install_symlink libexec/"bin/ymc"',
];

test('homebrew formula links both CLI entrypoints into bin', t => {
	const formula = readFileSync(formulaPath, 'utf8');

	for (const expectedLine of expectedSymlinks) {
		t.true(
			formula.includes(expectedLine),
			`Expected formula to include: ${expectedLine}`,
		);
	}
});

test('homebrew publish workflow generates the same bin symlinks', t => {
	const workflow = readFileSync(workflowPath, 'utf8');

	for (const expectedLine of expectedSymlinks) {
		t.true(
			workflow.includes(expectedLine),
			`Expected workflow to include: ${expectedLine}`,
		);
	}
});
