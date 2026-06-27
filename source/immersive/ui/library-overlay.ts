import type {Playlist} from '../../types/youtube-music.types.ts';

export type LibraryView = 'menu' | 'playlists';

export interface LibraryOverlayState {
	active: boolean;
	view: LibraryView;
	selectedIndex: number;
	status: string | null;
}

export const LIBRARY_MENU_ITEMS = [
	'Saved Playlists...',
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
	};
}

export function openLibraryMenu(state: LibraryOverlayState): void {
	state.active = true;
	state.view = 'menu';
	state.selectedIndex = 0;
	state.status = null;
}

export function openPlaylistPicker(state: LibraryOverlayState): void {
	state.active = true;
	state.view = 'playlists';
	state.selectedIndex = 0;
	state.status = null;
}

export function closeLibraryOverlay(state: LibraryOverlayState): void {
	state.active = false;
	state.view = 'menu';
	state.selectedIndex = 0;
	state.status = null;
}

export type LibraryInputAction =
	'none' | 'close' | 'menu_select' | 'play_playlist' | 'back_to_menu';

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

	if (key === 'enter') {
		return 'play_playlist';
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
