import type {Playlist, Track} from '../../types/youtube-music.types.ts';
import {trackArtists} from '../state/queue-state.ts';
import {truncate} from '../../utils/format.ts';

export type LibraryView =
	'menu' | 'playlists' | 'favorites' | 'playlist_edit' | 'add_to_playlist';

export interface LibraryOverlayState {
	active: boolean;
	view: LibraryView;
	selectedIndex: number;
	status: string | null;
	editingPlaylistId: string | null;
	pendingTrack: Track | null;
	addToPlaylistReturnView: LibraryView | null;
	addToPlaylistReturnToSearch: boolean;
}

export const LIBRARY_MENU_ITEMS = [
	'Saved Playlists...',
	'Favorites...',
	'Play All Favorites',
	'Random Favorite',
	'Back',
] as const;

export function createLibraryOverlayState(): LibraryOverlayState {
	return {
		active: false,
		view: 'menu',
		selectedIndex: 0,
		status: null,
		editingPlaylistId: null,
		pendingTrack: null,
		addToPlaylistReturnView: null,
		addToPlaylistReturnToSearch: false,
	};
}

function resetLibraryTransientState(state: LibraryOverlayState): void {
	state.editingPlaylistId = null;
	state.pendingTrack = null;
	state.addToPlaylistReturnView = null;
	state.addToPlaylistReturnToSearch = false;
}

export function openLibraryMenu(state: LibraryOverlayState): void {
	state.active = true;
	state.view = 'menu';
	state.selectedIndex = 0;
	state.status = null;
	resetLibraryTransientState(state);
}

export function openPlaylistPicker(state: LibraryOverlayState): void {
	state.active = true;
	state.view = 'playlists';
	state.selectedIndex = 0;
	state.status = null;
	resetLibraryTransientState(state);
}

export function openFavoritesPicker(state: LibraryOverlayState): void {
	state.active = true;
	state.view = 'favorites';
	state.selectedIndex = 0;
	state.status = null;
	resetLibraryTransientState(state);
}

export function openPlaylistEdit(
	state: LibraryOverlayState,
	playlistId: string,
): void {
	state.view = 'playlist_edit';
	state.editingPlaylistId = playlistId;
	state.selectedIndex = 0;
	state.status = null;
	state.pendingTrack = null;
	state.addToPlaylistReturnView = null;
	state.addToPlaylistReturnToSearch = false;
}

export function closePlaylistEdit(state: LibraryOverlayState): void {
	state.view = 'playlists';
	state.editingPlaylistId = null;
	state.selectedIndex = 0;
	state.status = null;
}

export function openAddToPlaylistPicker(
	state: LibraryOverlayState,
	track: Track,
	options: {returnView?: LibraryView; returnToSearch?: boolean} = {},
): void {
	state.active = true;
	state.view = 'add_to_playlist';
	state.selectedIndex = 0;
	state.pendingTrack = track;
	state.status = `Add "${track.title}" to playlist`;
	state.addToPlaylistReturnView = options.returnView ?? null;
	state.addToPlaylistReturnToSearch = options.returnToSearch ?? false;
	state.editingPlaylistId = null;
}

export function closeAddToPlaylistPicker(state: LibraryOverlayState): void {
	const returnToSearch = state.addToPlaylistReturnToSearch;
	const returnView = state.addToPlaylistReturnView;
	state.pendingTrack = null;
	state.addToPlaylistReturnView = null;
	state.addToPlaylistReturnToSearch = false;

	if (returnToSearch) {
		state.active = false;
		state.view = 'menu';
		state.selectedIndex = 0;
		state.status = null;
		return;
	}

	state.view = returnView ?? 'menu';
	state.selectedIndex = 0;
	state.status = null;
}

export function closeLibraryOverlay(state: LibraryOverlayState): void {
	state.active = false;
	state.view = 'menu';
	state.selectedIndex = 0;
	state.status = null;
	resetLibraryTransientState(state);
}

export type LibraryInputAction =
	| 'none'
	| 'close'
	| 'menu_select'
	| 'play_playlist'
	| 'play_favorite'
	| 'back_to_menu'
	| 'edit_playlist'
	| 'remove_favorite'
	| 'pick_add_to_playlist'
	| 'remove_playlist_track'
	| 'add_current_to_playlist'
	| 'confirm_add_to_playlist'
	| 'cancel_add_to_playlist';

export function handleLibraryMenuInput(
	state: LibraryOverlayState,
	key: string,
): LibraryInputAction {
	if (key === 'escape') {
		closeLibraryOverlay(state);
		return 'close';
	}

	if (key === 'up') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		return 'none';
	}

	if (key === 'down') {
		state.selectedIndex = Math.min(
			LIBRARY_MENU_ITEMS.length - 1,
			state.selectedIndex + 1,
		);
		return 'none';
	}

	if (key === 'enter') {
		return 'menu_select';
	}

	return 'none';
}

export function handleLibraryPlaylistInput(
	state: LibraryOverlayState,
	key: string,
	playlistCount: number,
): LibraryInputAction {
	if (key === 'escape') {
		state.view = 'menu';
		state.selectedIndex = 0;
		state.status = null;
		return 'back_to_menu';
	}

	if (playlistCount === 0) {
		return 'none';
	}

	if (key === 'up') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		return 'none';
	}

	if (key === 'down') {
		state.selectedIndex = Math.min(playlistCount - 1, state.selectedIndex + 1);
		return 'none';
	}

	if (key === 'e') {
		return 'edit_playlist';
	}

	if (key === 'enter') {
		return 'play_playlist';
	}

	return 'none';
}

export function handleLibraryFavoritesInput(
	state: LibraryOverlayState,
	key: string,
	favoriteCount: number,
): LibraryInputAction {
	if (key === 'escape') {
		state.view = 'menu';
		state.selectedIndex = 0;
		state.status = null;
		return 'back_to_menu';
	}

	if (favoriteCount === 0) {
		return 'none';
	}

	if (key === 'up') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		return 'none';
	}

	if (key === 'down') {
		state.selectedIndex = Math.min(favoriteCount - 1, state.selectedIndex + 1);
		return 'none';
	}

	if (key === 'f') {
		return 'remove_favorite';
	}

	if (key === 'a') {
		return 'pick_add_to_playlist';
	}

	if (key === 'enter') {
		return 'play_favorite';
	}

	return 'none';
}

export function handleLibraryPlaylistEditInput(
	state: LibraryOverlayState,
	key: string,
	trackCount: number,
): LibraryInputAction {
	if (key === 'escape') {
		closePlaylistEdit(state);
		return 'back_to_menu';
	}

	if (trackCount > 0) {
		if (key === 'up') {
			state.selectedIndex = Math.max(0, state.selectedIndex - 1);
			return 'none';
		}

		if (key === 'down') {
			state.selectedIndex = Math.min(trackCount - 1, state.selectedIndex + 1);
			return 'none';
		}
	}

	if (key === 'd') {
		if (trackCount === 0) {
			return 'none';
		}

		return 'remove_playlist_track';
	}

	if (key === 'a') {
		return 'add_current_to_playlist';
	}

	return 'none';
}

export function handleLibraryAddToPlaylistInput(
	state: LibraryOverlayState,
	key: string,
	playlistCount: number,
): LibraryInputAction {
	if (key === 'escape') {
		closeAddToPlaylistPicker(state);
		return 'cancel_add_to_playlist';
	}

	if (playlistCount === 0) {
		return 'none';
	}

	if (key === 'up') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		return 'none';
	}

	if (key === 'down') {
		state.selectedIndex = Math.min(playlistCount - 1, state.selectedIndex + 1);
		return 'none';
	}

	if (key === 'enter') {
		return 'confirm_add_to_playlist';
	}

	return 'none';
}

export function formatPlaylistLine(
	playlist: Playlist,
	maxWidth: number,
): string {
	const suffix = ` (${playlist.tracks.length} tracks)`;
	const maxName = Math.max(8, maxWidth - suffix.length);
	const name =
		playlist.name.length > maxName
			? `${playlist.name.slice(0, maxName - 3)}...`
			: playlist.name;
	return `${name}${suffix}`;
}

export function formatFavoriteLine(track: Track, maxWidth: number): string {
	const artist = trackArtists(track);
	const suffix = artist ? ` · ${artist}` : '';
	const maxTitle = Math.max(8, maxWidth - suffix.length);
	const title =
		track.title.length > maxTitle
			? `${track.title.slice(0, maxTitle - 3)}...`
			: track.title;
	return truncate(`${title}${suffix}`, maxWidth);
}

export function formatPlaylistTrackLine(
	track: Track,
	maxWidth: number,
): string {
	return formatFavoriteLine(track, maxWidth);
}
