import type {FrameBuffer} from '../renderer/frame-buffer.ts';
import type {RadioStation} from '../../types/radio-station.types.ts';
import {getBuiltinStations} from '../../services/radio-stations/radio-stations.service.ts';
import {truncate} from '../../utils/format.ts';

export interface RadioOverlayState {
	active: boolean;
	selectedIndex: number;
	status: string | null;
}

export function createRadioOverlayState(): RadioOverlayState {
	return {
		active: false,
		selectedIndex: 0,
		status: null,
	};
}

export function openRadioOverlay(state: RadioOverlayState): void {
	const stations = getBuiltinStations();
	state.active = true;
	state.selectedIndex = 0;
	state.status = `${stations.length} stations`;
}

export function closeRadioOverlay(state: RadioOverlayState): void {
	state.active = false;
	state.selectedIndex = 0;
	state.status = null;
}

export function handleRadioOverlayInput(
	state: RadioOverlayState,
	key: string,
	stationCount: number,
): 'none' | 'close' | 'play' {
	if (key === 'escape' || key === 'q') {
		closeRadioOverlay(state);
		return 'close';
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
	const stations = getBuiltinStations();
	return stations[state.selectedIndex] ?? null;
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

	const stations = getBuiltinStations();
	const boxH = Math.min(Math.max(10, Math.floor(height * 0.55)), height - 6);
	const boxY = Math.max(2, Math.floor((height - boxH) / 2));
	const boxW = Math.min(width - 4, 62);
	const boxX = Math.floor((width - boxW) / 2);

	fb.drawRect(boxX, boxY, boxW, boxH, null, null, 'single');
	fb.setText(boxX + 2, boxY, ' RADIO STREAMS ', null, null, {bold: true});

	if (stations.length === 0) {
		fb.setText(boxX + 2, boxY + 2, 'No stations available', null, null, {
			dim: true,
		});
		return;
	}

	const maxLines = boxH - 4;
	const start = Math.max(
		0,
		Math.min(
			overlay.selectedIndex - Math.floor(maxLines / 2),
			Math.max(0, stations.length - maxLines),
		),
	);
	const visible = stations.slice(start, start + maxLines);

	for (let i = 0; i < visible.length; i++) {
		const station = visible[i];
		if (!station) {
			continue;
		}
		const index = start + i;
		const marker = index === overlay.selectedIndex ? '>' : ' ';
		const region = station.region ? ` · ${station.region}` : '';
		const line = truncate(`${marker} ${station.name}${region}`, boxW - 4);
		fb.setText(
			boxX + 2,
			boxY + 2 + i,
			line,
			null,
			null,
			index === overlay.selectedIndex ? {bold: true} : {dim: true},
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
