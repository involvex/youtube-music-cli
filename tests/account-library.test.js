import {expect, test} from 'bun:test';
import {
	fetchAccountLibrary,
	isLikedMusicPlaylistId,
	mergeAccountLibrary,
	normalizeAccountPlaylistId,
	parseAccountLibraryPlaylists,
	parseAccountLibraryTracks,
	pickLibraryFilter,
	SIGNED_OUT_LIBRARY_MESSAGE,
} from '../source/services/youtube-music/account-library.ts';
import {
	accountLibraryRowCount,
	createLibraryOverlayState,
	handleLibraryAccountInput,
	handleLibraryAccountLikedInput,
	handleLibraryMenuInput,
	LIBRARY_MENU_ITEMS,
	openAccountLibrary,
	openAccountLiked,
	openLibraryMenu,
} from '../source/immersive/ui/library-overlay.ts';
import {formatAccountPlaylistLine as formatOverlayPlaylistLine} from '../source/immersive/ui/library-overlay.ts';
import {KEYBINDINGS, VIEW} from '../source/utils/constants.ts';

test('account library constants and playlist id helpers', () => {
	expect(VIEW.ACCOUNT_LIBRARY).toBe('account_library');
	expect(KEYBINDINGS.ACCOUNT_LIBRARY).toEqual(['shift+l']);
	expect(normalizeAccountPlaylistId('VLLM')).toBe('LM');
	expect(normalizeAccountPlaylistId('PLabc')).toBe('PLabc');
	expect(isLikedMusicPlaylistId('VLLM')).toBe(true);
	expect(isLikedMusicPlaylistId('PLother')).toBe(false);
	expect(SIGNED_OUT_LIBRARY_MESSAGE.includes('ymc login')).toBe(true);
});

test('parseAccountLibraryPlaylists reads shelves and skips liked music later via merge', () => {
	const library = {
		contents: [
			{
				title: 'Playlists',
				contents: [
					{
						id: 'VLLM',
						title: {text: 'Liked Music'},
						item_type: 'playlist',
						item_count: '42',
					},
					{
						id: 'PLmine',
						name: 'Road Trip',
						item_type: 'playlist',
						item_count: 12,
					},
					{
						id: 'dQw4w9WgXcQ',
						title: 'A song',
						item_type: 'song',
					},
				],
			},
		],
	};

	const playlists = parseAccountLibraryPlaylists(library);
	expect(playlists.map(item => item.playlistId)).toEqual(['LM', 'PLmine']);
	expect(playlists[1]?.trackCount).toBe(12);
});

test('parseAccountLibraryTracks reads songs and ignores playlists', () => {
	const library = {
		contents: [
			{
				items: [
					{
						id: 'PLmine',
						title: 'A playlist',
						item_type: 'playlist',
					},
					{
						video_id: 'abc11111111',
						title: 'Liked One',
						item_type: 'song',
						artists: [{name: 'Artist', channel_id: 'UC1'}],
						duration: {seconds: 180},
					},
				],
			},
		],
	};

	const tracks = parseAccountLibraryTracks(library);
	expect(tracks).toHaveLength(1);
	expect(tracks[0]?.videoId).toBe('abc11111111');
	expect(tracks[0]?.artists[0]?.name).toBe('Artist');
	expect(tracks[0]?.duration).toBe(180);
});

test('mergeAccountLibrary drops liked playlist and dedupes tracks', () => {
	const merged = mergeAccountLibrary(
		[
			{playlistId: 'LM', name: 'Liked Music'},
			{playlistId: 'PLmine', name: 'Mine'},
			{playlistId: 'PLmine', name: 'Mine copy'},
		],
		[{videoId: 'a', title: 'A', artists: []}],
		[
			{videoId: 'a', title: 'A dup', artists: []},
			{videoId: 'b', title: 'B', artists: []},
		],
	);

	expect(merged.playlists.map(item => item.playlistId)).toEqual(['PLmine']);
	expect(merged.likedSongs.map(item => item.videoId)).toEqual(['a', 'b']);
});

test('pickLibraryFilter matches playlist chips', () => {
	expect(
		pickLibraryFilter(['Songs', 'Playlists', 'Albums'], filter =>
			/playlist/i.test(filter),
		),
	).toBe('Playlists');
	expect(pickLibraryFilter(['Songs'], filter => /playlist/i.test(filter))).toBe(
		null,
	);
});

test('fetchAccountLibrary uses filters, liked playlist, and continuation', async () => {
	const library = {
		filters: ['Playlists', 'Songs'],
		contents: [],
		async applyFilter(filter) {
			if (filter === 'Playlists') {
				return {
					has_continuation: true,
					contents: [
						{
							id: 'PLone',
							title: 'One',
							item_type: 'playlist',
						},
					],
					async getContinuation() {
						return {
							contents: [
								{
									id: 'PLtwo',
									title: 'Two',
									item_type: 'playlist',
								},
							],
						};
					},
				};
			}

			return {
				contents: [
					{
						video_id: 'libsong1111',
						title: 'Library Song',
						item_type: 'song',
						artists: [{name: 'Lib'}],
					},
				],
			};
		},
	};

	const result = await fetchAccountLibrary({
		getLibrary: async () => library,
		getLikedPlaylist: async () => ({
			tracks: [
				{videoId: 'liked111111', title: 'Liked', artists: [{name: 'A'}]},
			],
		}),
	});

	expect(result.playlists.map(item => item.playlistId)).toEqual([
		'PLone',
		'PLtwo',
	]);
	expect(result.likedSongs.map(item => item.videoId)).toEqual([
		'liked111111',
		'libsong1111',
	]);
});

test('immersive library menu includes YouTube Music library first', () => {
	expect(LIBRARY_MENU_ITEMS[0]).toBe('YouTube Music Library...');
	expect(LIBRARY_MENU_ITEMS).toContain('Saved Playlists...');

	const overlay = createLibraryOverlayState();
	openLibraryMenu(overlay);
	expect(handleLibraryMenuInput(overlay, 'enter')).toBe('menu_select');
	expect(overlay.selectedIndex).toBe(0);

	openAccountLibrary(overlay);
	expect(overlay.view).toBe('account');
	expect(overlay.accountLoading).toBe(true);

	overlay.accountLoading = false;
	overlay.accountSignedIn = true;
	overlay.accountLiked = [{videoId: 'a', title: 'A', artists: []}];
	overlay.accountPlaylists = [{playlistId: 'PLx', name: 'Mine', trackCount: 3}];
	expect(accountLibraryRowCount(overlay)).toBe(2);
	expect(handleLibraryAccountInput(overlay, 'enter', 2)).toBe(
		'open_account_liked',
	);
	expect(handleLibraryAccountInput(overlay, 'down', 2)).toBe('none');
	expect(overlay.selectedIndex).toBe(1);
	expect(handleLibraryAccountInput(overlay, 'enter', 2)).toBe(
		'play_account_playlist',
	);

	openAccountLiked(overlay);
	expect(overlay.view).toBe('account_liked');
	expect(handleLibraryAccountLikedInput(overlay, 'enter', 1)).toBe(
		'play_account_liked',
	);
	expect(handleLibraryAccountLikedInput(overlay, 'escape', 1)).toBe(
		'back_to_account',
	);
	expect(overlay.view).toBe('account');

	const line = formatOverlayPlaylistLine(
		{playlistId: 'PLx', name: 'Mine', trackCount: 3},
		40,
	);
	expect(line.includes('Mine')).toBe(true);
	expect(line.includes('3')).toBe(true);
});

test('account overlay ignores select while signed out', () => {
	const overlay = createLibraryOverlayState();
	openAccountLibrary(overlay);
	overlay.accountLoading = false;
	overlay.accountSignedIn = false;
	expect(handleLibraryAccountInput(overlay, 'enter', 1)).toBe('none');
	expect(handleLibraryAccountInput(overlay, 'escape', 1)).toBe('back_to_menu');
});
