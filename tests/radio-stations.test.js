import test from 'ava';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BUILTIN_RADIO_STATIONS} from '../source/data/builtin-radio-stations.ts';
import {
	getBuiltinStations,
	getStationById,
	playStationStream,
	flattenRadioStations,
} from '../source/services/radio-stations/radio-stations.service.ts';
import {mapApiStationToRadioStation} from '../source/services/radio-stations/radio-browser.service.ts';
import {
	cacheKeyForBrowse,
	getCachedStations,
	setCachedStations,
	setRadioBrowserCachePathForTests,
} from '../source/services/radio-stations/radio-browser-cache.ts';
import {
	getRadioFavorites,
	isRadioFavorite,
	resetRadioFavoritesForTests,
	setRadioFavoritesPathForTests,
	toggleRadioFavorite,
} from '../source/services/radio-stations/radio-favorites.service.ts';
import {parseStreamMetadata} from '../source/services/radio-stations/stream-metadata.ts';
import {
	createRadioOverlayState,
	handleRadioOverlayInput,
	getSelectedStation,
	getRadioOverlayStations,
	openRadioOverlay,
	applyRadioStationList,
	beginRadioSearch,
	cycleRadioCountry,
} from '../source/immersive/ui/radio-overlay.ts';
import {buildModeStatusLine} from '../source/immersive/ui/layout.ts';

test.afterEach(() => {
	setRadioBrowserCachePathForTests(null);
	setRadioFavoritesPathForTests(null);
	resetRadioFavoritesForTests();
});

test('builtin radio stations have unique ids and http stream URLs', t => {
	const stations = getBuiltinStations();
	const ids = new Set();

	for (const station of stations) {
		t.false(ids.has(station.id), `duplicate id: ${station.id}`);
		ids.add(station.id);
		t.true(station.streamUrl.startsWith('http'));
		t.true(station.name.length > 0);
		t.is(station.source, 'builtin');
	}

	t.is(stations.length, BUILTIN_RADIO_STATIONS.length);
	t.is(getStationById('rockland-kl')?.name, 'Rockland Radio — Kaiserslautern');
	t.truthy(getStationById('swr3'));
});

test('mapApiStationToRadioStation maps radio-browser rows', t => {
	const mapped = mapApiStationToRadioStation({
		stationuuid: '05eb782e-e789-4573-9771-27bfa417655c',
		name: 'psyradio * fm - progressive',
		url: 'http://streamer.psyradio.org:8010/;listen.mp3',
		url_resolved: 'http://streamer.psyradio.org:8010/;listen.mp3',
		tags: 'progressive,psychedelic,psytrance',
		country: 'Germany',
		countrycode: 'DE',
		lastcheckok: 1,
	});

	t.truthy(mapped);
	t.is(mapped?.id, 'rb-05eb782e-e789-4573-9771-27bfa417655c');
	t.is(mapped?.source, 'radio-browser');
	t.is(mapped?.stationuuid, '05eb782e-e789-4573-9771-27bfa417655c');
	t.is(mapped?.region, 'Germany');
	t.is(mapped?.genre, 'progressive');
	t.true(mapped?.streamUrl.startsWith('http'));
});

test('mapApiStationToRadioStation rejects broken or incomplete rows', t => {
	t.is(
		mapApiStationToRadioStation({
			stationuuid: 'x',
			name: 'Broken',
			url: 'http://example.com/stream',
			lastcheckok: 0,
		}),
		null,
	);
	t.is(
		mapApiStationToRadioStation({
			stationuuid: 'x',
			name: 'No url',
			lastcheckok: 1,
		}),
		null,
	);
});

test('parseStreamMetadata splits artist and title from icy-title', t => {
	const parsed = parseStreamMetadata({
		'icy-title': 'Crunch - Sponge',
		'icy-name': 'Limbik Frequencies',
	});

	t.deepEqual(parsed, {
		artist: 'Crunch',
		title: 'Sponge',
		raw: 'Crunch - Sponge',
	});
});

test('parseStreamMetadata falls back to raw title without separator', t => {
	const parsed = parseStreamMetadata({
		StreamTitle: 'Just A Track Name',
	});

	t.deepEqual(parsed, {
		artist: null,
		title: 'Just A Track Name',
		raw: 'Just A Track Name',
	});
});

test('parseStreamMetadata returns null when no title tags', t => {
	t.is(parseStreamMetadata({'icy-name': 'Station Only'}), null);
	t.is(parseStreamMetadata(null), null);
});

test('radio browser cache stores and returns browse results', t => {
	const dir = mkdtempSync(join(tmpdir(), 'ymc-radio-cache-'));
	setRadioBrowserCachePathForTests(join(dir, 'cache.json'));

	const key = cacheKeyForBrowse('DE', 50);
	const stations = [
		mapApiStationToRadioStation({
			stationuuid: 'cache-1',
			name: 'Cached FM',
			url: 'https://example.com/stream',
			lastcheckok: 1,
		}),
	].filter(Boolean);

	setCachedStations(key, stations);
	const hit = getCachedStations(key);
	t.truthy(hit);
	t.false(hit?.stale);
	t.is(hit?.stations[0]?.name, 'Cached FM');

	rmSync(dir, {recursive: true, force: true});
});

test('radio favorites toggle persists stations', t => {
	const dir = mkdtempSync(join(tmpdir(), 'ymc-radio-fav-'));
	setRadioFavoritesPathForTests(join(dir, 'fav.json'));
	resetRadioFavoritesForTests();

	const station = getStationById('swr3');
	t.truthy(station);

	t.true(toggleRadioFavorite(station));
	t.true(isRadioFavorite('swr3'));
	t.is(getRadioFavorites().length, 1);

	t.false(toggleRadioFavorite(station));
	t.false(isRadioFavorite('swr3'));
	t.is(getRadioFavorites().length, 0);

	rmSync(dir, {recursive: true, force: true});
});

test('PLAY_STREAM reducer enters stream playback mode and clears metadata', async t => {
	const {playerReducer} = await import('../source/stores/player.store.tsx');
	const station = getStationById('rockland-kl');
	t.truthy(station);

	const state = {
		currentTrack: {videoId: 'abc', title: 'Song', artists: []},
		isPlaying: true,
		volume: 70,
		speed: 1,
		progress: 10,
		duration: 200,
		queue: [{videoId: 'abc', title: 'Song', artists: []}],
		queuePosition: 0,
		repeat: 'off',
		shuffle: false,
		autoplay: true,
		isLoading: false,
		error: null,
		playRequestId: 0,
		abLoop: {a: null, b: null},
		subtitle: null,
		radioIsActive: true,
		radioSeed: {type: 'track', id: 'abc', name: 'Song'},
		explicitQueueLength: 1,
		playbackMode: 'youtube',
		currentStation: null,
		streamNowPlaying: {
			artist: 'Old',
			title: 'Meta',
			raw: 'Old - Meta',
		},
	};

	const next = playerReducer(state, {category: 'PLAY_STREAM', station});

	t.is(next.playbackMode, 'stream');
	t.is(next.currentStation, station);
	t.is(next.currentTrack, null);
	t.deepEqual(next.queue, []);
	t.false(next.autoplay);
	t.false(next.radioIsActive);
	t.is(next.radioSeed, null);
	t.true(next.isPlaying);
	t.is(next.streamNowPlaying, null);

	const withMeta = playerReducer(next, {
		category: 'SET_STREAM_NOW_PLAYING',
		streamNowPlaying: {artist: 'A', title: 'B', raw: 'A - B'},
	});
	t.deepEqual(withMeta.streamNowPlaying, {
		artist: 'A',
		title: 'B',
		raw: 'A - B',
	});
});

test('playStationStream passes direct stream URL and station id to mpv', async t => {
	const {getPlayerService} =
		await import('../source/services/player/player.service.ts');
	const player = getPlayerService();
	const station = getStationById('rockland-kl');
	t.truthy(station);

	const originalPlay = player.play.bind(player);
	let capturedUrl = '';
	let capturedTrackId = '';

	player.play = async (url, options) => {
		capturedUrl = url;
		capturedTrackId = options?.trackId ?? '';
	};

	try {
		await playStationStream(station);
		t.is(capturedUrl, station.streamUrl);
		t.is(capturedTrackId, station.id);
	} finally {
		player.play = originalPlay;
	}
});

test('flattenRadioStations keeps favorites then builtins before remote', t => {
	const builtins = getBuiltinStations();
	const remote = [
		mapApiStationToRadioStation({
			stationuuid: 'aaa',
			name: 'Remote One',
			url: 'https://example.com/a',
			lastcheckok: 1,
		}),
	].filter(Boolean);

	const flat = flattenRadioStations({
		favorites: [builtins[6]],
		builtins,
		remote,
	});
	t.is(flat[0]?.id, 'swr3');
	t.is(flat.at(-1)?.source, 'radio-browser');
});

test('radio overlay selects and plays a station', t => {
	const overlay = createRadioOverlayState();
	openRadioOverlay(overlay);
	applyRadioStationList(
		overlay,
		{
			favorites: [],
			builtins: getBuiltinStations(),
			remote: [],
		},
		'8 local stations',
	);
	t.true(overlay.active);

	const stations = getRadioOverlayStations(overlay);
	for (let i = 0; i < stations.length - 1; i++) {
		handleRadioOverlayInput(overlay, 'down', stations.length);
	}

	const action = handleRadioOverlayInput(overlay, 'enter', stations.length);
	t.is(action, 'play');
	t.is(getSelectedStation(overlay)?.id, stations.at(-1)?.id);
});

test('radio overlay search, random, and country actions', t => {
	const overlay = createRadioOverlayState();
	openRadioOverlay(overlay);
	applyRadioStationList(
		overlay,
		{favorites: [], builtins: getBuiltinStations(), remote: []},
		'ready',
	);

	t.is(handleRadioOverlayInput(overlay, 'r', 1), 'random');
	t.is(handleRadioOverlayInput(overlay, 'c', 1), 'cycle-country');
	t.is(overlay.countryIndex, 1);

	beginRadioSearch(overlay);
	t.is(overlay.phase, 'search');
	handleRadioOverlayInput(overlay, 's', 0);
	handleRadioOverlayInput(overlay, 'w', 0);
	handleRadioOverlayInput(overlay, 'r', 0);
	t.is(overlay.searchQuery, 'swr');
	t.is(handleRadioOverlayInput(overlay, 'enter', 0), 'search');

	cycleRadioCountry(overlay);
});

test('buildModeStatusLine shows LIVE for stream playback', t => {
	const line = buildModeStatusLine({
		shuffle: false,
		repeat: 'off',
		isDiscoMode: false,
		autoplay: false,
		playbackMode: 'stream',
		currentStation: {name: 'Rockland Radio — Kaiserslautern'},
	});

	t.true(line.includes('LIVE'));
	t.true(line.includes('Rockland'));
});

test('shouldPrefetchAutoplay is false at stream mode queue end', async t => {
	const {shouldPrefetchAutoplay} =
		await import('../source/services/player/autoplay-coordinator.ts');

	const shouldFetch = shouldPrefetchAutoplay(
		{
			autoplay: false,
			isPlaying: true,
			repeat: 'off',
			shuffle: false,
			queueLength: 0,
			queuePosition: 0,
			currentTrackVideoId: null,
			radioIsActive: false,
			explicitQueueLength: 0,
		},
		{
			fetchedForVideoId: null,
			isFetching: false,
			waitingAtQueueEnd: false,
		},
	);

	t.false(shouldFetch);
});
