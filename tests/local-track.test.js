import {afterEach, expect, test} from 'bun:test';
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	classifyPlayMedia,
	getLegacyTrackDestinationPath,
	getTrackDestinationPath,
	loadDownloadsIndex,
	resolveLocalTrackPath,
	resolveTrackPlayUrl,
	upsertDownloadsIndexEntry,
} from '../source/utils/local-track.ts';

const __fileTeardowns = [];
afterEach(() => {
	while (__fileTeardowns.length) {
		const fn = __fileTeardowns.pop();
		fn();
	}
});

function makeTempDir(prefix) {
	const target = path.join(
		os.tmpdir(),
		`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
	);
	mkdirSync(target, {recursive: true});
	__fileTeardowns.push(() => {
		if (existsSync(target)) {
			rmSync(target, {recursive: true, force: true});
		}
	});
	return target;
}

const sampleTrack = {
	videoId: 'abc123XYZ01',
	title: 'Test Song',
	artists: [{name: 'Test Artist', id: 'artist1'}],
	album: {name: 'Test Album', id: 'album1'},
};

test('classifyPlayMedia passes through http URLs', () => {
	expect(classifyPlayMedia('https://www.youtube.com/watch?v=abc')).toBe(
		'https://www.youtube.com/watch?v=abc',
	);
});

test('classifyPlayMedia builds watch URL from videoId', () => {
	expect(classifyPlayMedia('abc123XYZ01')).toBe(
		'https://www.youtube.com/watch?v=abc123XYZ01',
	);
});

test('classifyPlayMedia passes through absolute file paths', () => {
	const abs =
		process.platform === 'win32'
			? 'C:\\Users\\test\\Music\\song.mp3'
			: '/home/test/Music/song.mp3';
	expect(classifyPlayMedia(abs)).toBe(abs);
});

test('classifyPlayMedia passes through file: URLs', () => {
	expect(classifyPlayMedia('file:///tmp/song.mp3')).toBe(
		'file:///tmp/song.mp3',
	);
});

test('getTrackDestinationPath embeds videoId in filename', () => {
	const dest = getTrackDestinationPath(sampleTrack, '/dl', 'mp3');
	expect(dest).toBe(
		path.join(
			'/dl',
			'Test Artist',
			'Test Album',
			'Test Song [abc123XYZ01].mp3',
		),
	);
});

test('upsertDownloadsIndexEntry and resolveLocalTrackPath use index first', () => {
	const root = makeTempDir('ymc-local-track-index');
	const indexPath = path.join(root, 'downloads-index.json');
	const filePath = path.join(root, 'song.mp3');
	writeFileSync(filePath, 'fake');

	upsertDownloadsIndexEntry(sampleTrack.videoId, filePath, 'mp3', indexPath);

	const index = loadDownloadsIndex(indexPath);
	expect(index.tracks[sampleTrack.videoId]?.path).toBe(path.resolve(filePath));

	const resolved = resolveLocalTrackPath(sampleTrack, {indexPath});
	expect(resolved).toBe(path.resolve(filePath));
});

test('resolveLocalTrackPath finds videoId filename without index', () => {
	const root = makeTempDir('ymc-local-track-id-path');
	const dest = getTrackDestinationPath(sampleTrack, root, 'mp3');
	mkdirSync(path.dirname(dest), {recursive: true});
	writeFileSync(dest, 'fake');

	const resolved = resolveLocalTrackPath(sampleTrack, {
		downloadDirectory: root,
		downloadFormat: 'mp3',
		indexPath: path.join(root, 'missing-index.json'),
	});
	expect(resolved).toBe(dest);
});

test('resolveLocalTrackPath falls back to legacy title-only path', () => {
	const root = makeTempDir('ymc-local-track-legacy');
	const dest = getLegacyTrackDestinationPath(sampleTrack, root, 'mp3');
	mkdirSync(path.dirname(dest), {recursive: true});
	writeFileSync(dest, 'fake');

	const resolved = resolveLocalTrackPath(sampleTrack, {
		downloadDirectory: root,
		downloadFormat: 'mp3',
		indexPath: path.join(root, 'missing-index.json'),
	});
	expect(resolved).toBe(dest);
});

test('resolveTrackPlayUrl prefers local when preferLocal is true', () => {
	const root = makeTempDir('ymc-local-track-prefer');
	const indexPath = path.join(root, 'downloads-index.json');
	const filePath = path.join(root, 'local.mp3');
	writeFileSync(filePath, 'fake');
	upsertDownloadsIndexEntry(sampleTrack.videoId, filePath, 'mp3', indexPath);

	const result = resolveTrackPlayUrl(sampleTrack, {
		preferLocal: true,
		indexPath,
	});
	expect(result.source).toBe('local');
	expect(result.url).toBe(path.resolve(filePath));
});

test('resolveTrackPlayUrl uses YouTube when preferLocal is false', () => {
	const root = makeTempDir('ymc-local-track-remote');
	const indexPath = path.join(root, 'downloads-index.json');
	const filePath = path.join(root, 'local.mp3');
	writeFileSync(filePath, 'fake');
	upsertDownloadsIndexEntry(sampleTrack.videoId, filePath, 'mp3', indexPath);

	const result = resolveTrackPlayUrl(sampleTrack, {
		preferLocal: false,
		indexPath,
	});
	expect(result.source).toBe('youtube');
	expect(result.url).toBe(
		`https://www.youtube.com/watch?v=${sampleTrack.videoId}`,
	);
});

test('getTrackDestinationPath keeps "." and ".." metadata inside the download dir', () => {
	const hostile = {
		...sampleTrack,
		artists: [{name: '..', id: 'a'}],
		album: {name: '.', id: 'b'},
	};
	const dest = getTrackDestinationPath(hostile, '/dl', 'mp3');

	expect(path.relative('/dl', dest).startsWith('..')).toBe(false);
	expect(dest).toBe(path.join('/dl', '__', '_', 'Test Song [abc123XYZ01].mp3'));
});
