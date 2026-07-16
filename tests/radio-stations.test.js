import test from 'ava';
import {BUILTIN_RADIO_STATIONS} from '../source/data/builtin-radio-stations.ts';
import {
	getBuiltinStations,
	getStationById,
	playStationStream,
} from '../source/services/radio-stations/radio-stations.service.ts';
import {
	createRadioOverlayState,
	handleRadioOverlayInput,
	getSelectedStation,
	openRadioOverlay,
} from '../source/immersive/ui/radio-overlay.ts';
import {buildModeStatusLine} from '../source/immersive/ui/layout.ts';

test('builtin radio stations have unique ids and http stream URLs', t => {
	const stations = getBuiltinStations();
	const ids = new Set();

	for (const station of stations) {
		t.false(ids.has(station.id), `duplicate id: ${station.id}`);
		ids.add(station.id);
		t.true(station.streamUrl.startsWith('http'));
		t.true(station.name.length > 0);
	}

	t.is(stations.length, BUILTIN_RADIO_STATIONS.length);
	t.is(getStationById('rockland-kl')?.name, 'Rockland Radio — Kaiserslautern');
});

test('PLAY_STREAM reducer enters stream playback mode', async t => {
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
		await playStationStream(station, 55);
	} finally {
		player.play = originalPlay;
	}

	t.is(capturedUrl, station.streamUrl);
	t.is(capturedTrackId, station.id);
	t.false(capturedUrl.includes('youtube.com'));
});

test('radio overlay selects and plays a station', t => {
	const overlay = createRadioOverlayState();
	openRadioOverlay(overlay);
	t.true(overlay.active);

	const stations = getBuiltinStations();
	for (let i = 0; i < stations.length - 1; i++) {
		handleRadioOverlayInput(overlay, 'down', stations.length);
	}

	const action = handleRadioOverlayInput(overlay, 'enter', stations.length);
	t.is(action, 'play');
	t.is(getSelectedStation(overlay)?.id, stations.at(-1)?.id);
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
