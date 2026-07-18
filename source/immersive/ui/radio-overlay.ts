import type {FrameBuffer} from '../renderer/frame-buffer.ts';
import type {RadioStation} from '../../types/radio-station.types.ts';
import {RADIO_COUNTRY_OPTIONS} from '../../types/radio-station.types.ts';
import {
	flattenRadioStations,
	getBuiltinStations,
	loadBrowseStations,
	loadRandomStation,
	loadSearchStations,
	type RadioStationList,
} from '../../services/radio-stations/radio-stations.service.ts';
import {
	getRadioFavorites,
	isRadioFavorite,
	toggleRadioFavorite,
} from '../../services/radio-stations/radio-favorites.service.ts';
import {truncate} from '../../utils/format.ts';

export type RadioOverlayPhase = 'list' | 'search';

export interface RadioOverlayState {
	active: boolean;
	phase: RadioOverlayPhase;
	selectedIndex: number;
	status: string | null;
	searchQuery: string;
	favorites: readonly RadioStation[];
	builtins: readonly RadioStation[];
	remote: RadioStation[];
	countryIndex: number;
	loading: boolean;
}

type DisplayRow =
	| {kind: 'header'; label: string}
	| {kind: 'station'; station: RadioStation; flatIndex: number};

function currentCountry(state: RadioOverlayState): {
	code: string;
	label: string;
} {
	return RADIO_COUNTRY_OPTIONS[state.countryIndex] ?? RADIO_COUNTRY_OPTIONS[0]!;
}

export function createRadioOverlayState(): RadioOverlayState {
	return {
		active: false,
		phase: 'list',
		selectedIndex: 0,
		status: null,
		searchQuery: '',
		favorites: getRadioFavorites(),
		builtins: getBuiltinStations(),
		remote: [],
		countryIndex: 0,
		loading: false,
	};
}

export function getRadioOverlayStations(
	state: RadioOverlayState,
): RadioStation[] {
	return flattenRadioStations({
		favorites: state.favorites,
		builtins: state.builtins,
		remote: state.remote,
	});
}

function buildDisplayRows(state: RadioOverlayState): DisplayRow[] {
	const rows: DisplayRow[] = [];
	let flatIndex = 0;
	const favoriteIds = new Set(state.favorites.map(station => station.id));

	if (state.favorites.length > 0) {
		rows.push({kind: 'header', label: 'Favorites'});
		for (const station of state.favorites) {
			rows.push({kind: 'station', station, flatIndex});
			flatIndex += 1;
		}
	}

	const local = state.builtins.filter(station => !favoriteIds.has(station.id));
	if (local.length > 0) {
		rows.push({kind: 'header', label: 'Local'});
		for (const station of local) {
			rows.push({kind: 'station', station, flatIndex});
			flatIndex += 1;
		}
	}

	const country = currentCountry(state);
	const remoteLabel =
		state.phase === 'search' && state.searchQuery.trim()
			? `Search: ${state.searchQuery.trim()}`
			: `Browse · ${country.label}`;
	rows.push({kind: 'header', label: remoteLabel});

	for (const station of state.remote) {
		if (favoriteIds.has(station.id)) {
			continue;
		}
		rows.push({kind: 'station', station, flatIndex});
		flatIndex += 1;
	}

	return rows;
}

function clampSelection(state: RadioOverlayState): void {
	const count = getRadioOverlayStations(state).length;
	if (count === 0) {
		state.selectedIndex = 0;
		return;
	}

	state.selectedIndex = Math.max(0, Math.min(state.selectedIndex, count - 1));
}

export function openRadioOverlay(state: RadioOverlayState): void {
	state.active = true;
	state.phase = 'list';
	state.selectedIndex = 0;
	state.searchQuery = '';
	state.favorites = getRadioFavorites();
	state.builtins = getBuiltinStations();
	state.remote = [];
	state.loading = true;
	const country = currentCountry(state);
	state.status = `Loading ${country.label} stations…`;
}

export function closeRadioOverlay(state: RadioOverlayState): void {
	state.active = false;
	state.phase = 'list';
	state.selectedIndex = 0;
	state.status = null;
	state.searchQuery = '';
	state.remote = [];
	state.loading = false;
}

export function applyRadioStationList(
	state: RadioOverlayState,
	list: RadioStationList,
	status: string,
): void {
	state.favorites = list.favorites;
	state.builtins = list.builtins;
	state.remote = list.remote;
	state.loading = false;
	state.status = status;
	clampSelection(state);
}

export function setRadioOverlayError(
	state: RadioOverlayState,
	message: string,
): void {
	state.loading = false;
	state.status = message;
}

export function beginRadioSearch(state: RadioOverlayState): void {
	state.phase = 'search';
	state.searchQuery = '';
	state.status = 'Search: (type name, Enter)';
}

export function cycleRadioCountry(state: RadioOverlayState): void {
	if (state.phase === 'search' || state.loading) {
		return;
	}

	state.countryIndex = (state.countryIndex + 1) % RADIO_COUNTRY_OPTIONS.length;
	state.selectedIndex = 0;
	state.phase = 'list';
	state.searchQuery = '';
}

export function toggleSelectedRadioFavorite(state: RadioOverlayState): void {
	const station = getSelectedStation(state);
	if (!station) {
		return;
	}

	const added = toggleRadioFavorite(station);
	state.favorites = getRadioFavorites();
	state.status = added
		? `Favorited ${station.name}`
		: `Removed ${station.name} from favorites`;
	clampSelection(state);
}

export function handleRadioOverlayInput(
	state: RadioOverlayState,
	key: string,
	stationCount: number,
):
	| 'none'
	| 'close'
	| 'play'
	| 'search'
	| 'random'
	| 'load-browse'
	| 'cycle-country'
	| 'toggle-favorite' {
	if (state.phase === 'search') {
		if (key === 'escape') {
			state.phase = 'list';
			state.searchQuery = '';
			state.status = `${state.remote.length} stations`;
			return 'load-browse';
		}

		if (key === 'enter') {
			if (!state.searchQuery.trim()) {
				return 'none';
			}

			return 'search';
		}

		if (key === 'backspace') {
			state.searchQuery = state.searchQuery.slice(0, -1);
			state.status = `Search: ${state.searchQuery || '(empty)'}`;
			return 'none';
		}

		if (key.length === 1 && key >= ' ' && key <= '~') {
			if (state.searchQuery.length < 80) {
				state.searchQuery += key;
				state.status = `Search: ${state.searchQuery}`;
			}
			return 'none';
		}

		return 'none';
	}

	if (key === 'escape' || key === 'q') {
		closeRadioOverlay(state);
		return 'close';
	}

	if (key === '/') {
		beginRadioSearch(state);
		return 'none';
	}

	if (key === 'r') {
		return 'random';
	}

	if (key === 'c') {
		cycleRadioCountry(state);
		return 'cycle-country';
	}

	if (key === 'f') {
		return 'toggle-favorite';
	}

	if (stationCount === 0) {
		return 'none';
	}

	if (key === 'up') {
		state.selectedIndex = Math.max(0, state.selectedIndex - 1);
		return 'none';
	}

	if (key === 'down') {
		state.selectedIndex = Math.min(stationCount - 1, state.selectedIndex + 1);
		return 'none';
	}

	if (key === 'enter') {
		return 'play';
	}

	return 'none';
}

export function getSelectedStation(
	state: RadioOverlayState,
): RadioStation | null {
	const stations = getRadioOverlayStations(state);
	return stations[state.selectedIndex] ?? null;
}

export async function preloadRadioOverlayStations(
	state: RadioOverlayState,
): Promise<void> {
	const country = currentCountry(state);
	state.loading = true;
	state.status = `Loading ${country.label} stations…`;
	try {
		const list = await loadBrowseStations({
			countrycode: country.code,
			limit: 50,
		});
		const cacheNote = list.fromCache
			? list.stale
				? ' · cached (offline)'
				: ' · cached'
			: '';
		applyRadioStationList(
			state,
			list,
			`${list.remote.length} ${country.label} · [/] search · [c] country · [f] fav · [r] random${cacheNote}`,
		);
	} catch (error) {
		setRadioOverlayError(
			state,
			error instanceof Error ? error.message : 'Failed to load stations',
		);
	}
}

export async function runRadioOverlaySearch(
	state: RadioOverlayState,
): Promise<void> {
	const query = state.searchQuery.trim();
	if (!query) {
		return;
	}

	state.loading = true;
	state.phase = 'list';
	state.status = `Searching “${query}”…`;
	try {
		const list = await loadSearchStations(query);
		applyRadioStationList(
			state,
			list,
			`${list.remote.length} results for “${query}” · Esc clears`,
		);
		state.selectedIndex = 0;
	} catch (error) {
		setRadioOverlayError(
			state,
			error instanceof Error ? error.message : 'Search failed',
		);
	}
}

export async function runRadioOverlayRandom(
	state: RadioOverlayState,
): Promise<RadioStation | null> {
	state.status = 'Picking random station…';
	try {
		const station = await loadRandomStation({
			countrycode: currentCountry(state).code,
		});
		if (!station) {
			state.status = 'No random station found';
			return null;
		}

		state.status = `Random: ${station.name}`;
		return station;
	} catch (error) {
		setRadioOverlayError(
			state,
			error instanceof Error ? error.message : 'Random station failed',
		);
		return null;
	}
}

export function renderRadioOverlay(
	fb: FrameBuffer,
	width: number,
	height: number,
	overlay: RadioOverlayState,
): void {
	if (!overlay.active) {
		return;
	}

	const stations = getRadioOverlayStations(overlay);
	const displayRows = buildDisplayRows(overlay);
	const boxH = Math.min(Math.max(10, Math.floor(height * 0.55)), height - 6);
	const boxY = Math.max(2, Math.floor((height - boxH) / 2));
	const boxW = Math.min(width - 4, 70);
	const boxX = Math.floor((width - boxW) / 2);

	fb.drawRect(boxX, boxY, boxW, boxH, null, null, 'single');
	fb.setText(boxX + 2, boxY, ' RADIO STREAMS ', null, null, {bold: true});

	if (overlay.phase === 'search') {
		fb.setText(
			boxX + 2,
			boxY + 2,
			truncate(`Search: ${overlay.searchQuery}_`, boxW - 4),
			null,
			null,
			{bold: true},
		);
		fb.setText(
			boxX + 2,
			boxY + 4,
			truncate('Type name · Enter search · Esc cancel', boxW - 4),
			null,
			null,
			{dim: true},
		);
		if (overlay.status) {
			fb.setText(
				boxX + 2,
				boxY + boxH - 2,
				truncate(overlay.status, boxW - 4),
				null,
				null,
				{dim: true},
			);
		}
		return;
	}

	if (stations.length === 0 && !overlay.loading) {
		fb.setText(boxX + 2, boxY + 2, 'No stations available', null, null, {
			dim: true,
		});
		if (overlay.status) {
			fb.setText(
				boxX + 2,
				boxY + boxH - 2,
				truncate(overlay.status, boxW - 4),
				null,
				null,
				{dim: true},
			);
		}
		return;
	}

	const maxLines = boxH - 4;
	const selectedRowIndex = displayRows.findIndex(
		row => row.kind === 'station' && row.flatIndex === overlay.selectedIndex,
	);
	const focusIndex = selectedRowIndex >= 0 ? selectedRowIndex : 0;
	const start = Math.max(
		0,
		Math.min(
			focusIndex - Math.floor(maxLines / 2),
			Math.max(0, displayRows.length - maxLines),
		),
	);
	const visible = displayRows.slice(start, start + maxLines);

	for (let i = 0; i < visible.length; i++) {
		const row = visible[i];
		if (!row) {
			continue;
		}

		if (row.kind === 'header') {
			fb.setText(
				boxX + 2,
				boxY + 2 + i,
				truncate(`── ${row.label} ──`, boxW - 4),
				null,
				null,
				{dim: true},
			);
			continue;
		}

		const isSelected = row.flatIndex === overlay.selectedIndex;
		const marker = isSelected ? '>' : ' ';
		const heart = isRadioFavorite(row.station.id) ? '♥ ' : '';
		const region = row.station.region ? ` · ${row.station.region}` : '';
		const line = truncate(
			`${marker} ${heart}${row.station.name}${region}`,
			boxW - 4,
		);
		fb.setText(
			boxX + 2,
			boxY + 2 + i,
			line,
			null,
			null,
			isSelected ? {bold: true} : {dim: true},
		);
	}

	if (overlay.status) {
		fb.setText(
			boxX + 2,
			boxY + boxH - 2,
			truncate(overlay.status, boxW - 4),
			null,
			null,
			{dim: true},
		);
	}
}
