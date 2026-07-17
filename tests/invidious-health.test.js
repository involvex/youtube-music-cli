import test from 'ava';
import os from 'node:os';
import path from 'node:path';
import {existsSync, rmSync} from 'node:fs';
import {
	DEFAULT_INVIDIOUS_INSTANCES,
	parseInvidiousDiscoveryPayload,
	resetInvidiousHealthServiceForTests,
} from '../source/services/invidious/invidious-health.service.ts';
import {formatDownloadProgress} from '../source/utils/download-progress.ts';

test('formatDownloadProgress renders phases', t => {
	const track = {title: 'Song A'};
	t.is(
		formatDownloadProgress({
			current: 1,
			total: 3,
			track,
			phase: 'start',
		}),
		'[1/3] Downloading: Song A',
	);
	t.is(
		formatDownloadProgress({
			current: 2,
			total: 3,
			track,
			phase: 'done',
		}),
		'[2/3] Saved: Song A',
	);
	t.is(
		formatDownloadProgress({
			current: 3,
			total: 3,
			track,
			phase: 'fail',
			error: 'boom',
		}),
		'[3/3] Failed: Song A — boom',
	);
});

test('parseInvidiousDiscoveryPayload keeps https instances only', t => {
	const urls = parseInvidiousDiscoveryPayload([
		['inv.example.com', {type: 'https', uri: 'https://inv.example.com'}],
		['onion.example', {type: 'onion', uri: 'http://abc.onion'}],
		['bad', {type: 'https', uri: 'not-a-url'}],
		['http-ok', {type: 'https', uri: 'https://invidious.example.org/'}],
	]);

	t.deepEqual(urls, [
		'https://inv.example.com',
		'https://invidious.example.org',
	]);
});

test('Invidious health ranks successful instances first', t => {
	const healthFile = path.join(
		os.tmpdir(),
		`ymc-invidious-health-${Date.now()}.json`,
	);
	t.teardown(() => {
		if (existsSync(healthFile)) {
			rmSync(healthFile, {force: true});
		}
	});

	const health = resetInvidiousHealthServiceForTests(healthFile);
	const [first, second] = DEFAULT_INVIDIOUS_INSTANCES;
	health.recordFailure(first);
	health.recordSuccess(second, 120);
	health.recordSuccess(second, 90);

	const ordered = health.getOrderedInstances();
	t.is(ordered[0], second);
	t.true(ordered.includes(first));
});
