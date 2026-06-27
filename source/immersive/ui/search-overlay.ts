export interface SearchOverlayState {
	active: boolean;
	query: string;
	status: string | null;
}

export function createSearchOverlayState(): SearchOverlayState {
	return {
		active: false,
		query: '',
		status: null,
	};
}

export function openSearchOverlay(state: SearchOverlayState): void {
	state.active = true;
	state.query = '';
	state.status = null;
}

export function closeSearchOverlay(state: SearchOverlayState): void {
	state.active = false;
	state.query = '';
	state.status = null;
}

export function handleSearchInput(
	state: SearchOverlayState,
	key: string,
): 'submit' | 'cancel' | 'none' {
	if (key === 'escape') {
		closeSearchOverlay(state);
		return 'cancel';
	}

	if (key === 'enter') {
		if (state.query.trim().length > 0) {
			return 'submit';
		}
		return 'none';
	}

	if (key === 'backspace') {
		state.query = state.query.slice(0, -1);
		return 'none';
	}

	if (key.length === 1 && key >= ' ' && key <= '~') {
		if (state.query.length < 80) {
			state.query += key;
		}
	}

	return 'none';
}
