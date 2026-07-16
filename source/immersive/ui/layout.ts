export interface ImmersiveLayout {
	headerY: number;
	vizX: number;
	vizY: number;
	vizW: number;
	vizH: number;
	nowPlayingX: number;
	nowPlayingY: number;
	nowPlayingW: number;
	nowPlayingH: number;
	queueX: number;
	queueY: number;
	queueW: number;
	queueH: number;
	favoritesX: number;
	favoritesY: number;
	favoritesW: number;
	favoritesH: number;
	footerStartY: number;
	controlsY: number;
	splitQueue: boolean;
}

export const RECENT_FAVORITES_MAX = 8;

export function computeLayout(width: number, height: number): ImmersiveLayout {
	const headerRows = 1;
	const footerRows = 3;
	const margin = 2;
	const innerW = Math.max(20, width - margin * 2);
	const footerStartY = height - footerRows;
	const contentBottom = footerStartY - 1;
	const contentH = Math.max(10, contentBottom - headerRows);

	const splitQueue = innerW >= 72;
	const nowPlayingW = splitQueue ? Math.floor(innerW * 0.58) : innerW;
	const queueW = splitQueue ? innerW - nowPlayingW - 2 : innerW;

	const vizH = Math.max(
		6,
		Math.min(Math.floor(contentH * 0.36), contentH - 10),
	);
	const vizY = headerRows + 1;
	const nowPlayingY = vizY + vizH + 1;

	const minNowPlayingH = 8;
	const maxNowPlayingH = splitQueue
		? Math.min(11, Math.max(minNowPlayingH, contentBottom - nowPlayingY - 5))
		: Math.min(10, Math.max(minNowPlayingH, Math.floor(contentH * 0.26)));
	const nowPlayingH = Math.max(
		minNowPlayingH,
		Math.min(maxNowPlayingH, contentBottom - nowPlayingY - 2),
	);

	let queueX = margin;
	let queueY = nowPlayingY;
	let queueH = 0;
	const favoritesX = margin;
	const favoritesY = nowPlayingY + nowPlayingH + 1;
	const favoritesW = nowPlayingW;
	let favoritesH = 0;

	if (splitQueue) {
		queueX = margin + nowPlayingW + 2;
		queueY = nowPlayingY;
		queueH = Math.max(4, contentBottom - nowPlayingY + 1);
		favoritesH = Math.max(
			0,
			Math.min(RECENT_FAVORITES_MAX + 2, contentBottom - favoritesY + 1),
		);
	} else {
		favoritesH = Math.max(
			0,
			Math.min(RECENT_FAVORITES_MAX + 2, contentBottom - favoritesY + 1),
		);
		queueY = favoritesY + (favoritesH > 0 ? favoritesH + 1 : 0);
		queueH = Math.max(0, contentBottom - queueY + 1);
	}

	return {
		headerY: 0,
		vizX: margin,
		vizY,
		vizW: innerW,
		vizH,
		nowPlayingX: margin,
		nowPlayingY,
		nowPlayingW,
		nowPlayingH,
		queueX,
		queueY,
		queueW,
		queueH,
		favoritesX,
		favoritesY,
		favoritesW,
		favoritesH,
		footerStartY,
		controlsY: height - 1,
		splitQueue,
	};
}

export function buildProgressBar(
	ratio: number,
	width: number,
): {bar: string; filled: number} {
	const clamped = Math.max(0, Math.min(1, ratio));
	const filled = Math.round(clamped * width);
	const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
	return {bar, filled};
}

export function buildVolumeBar(volume: number, width: number): string {
	const ratio = Math.max(0, Math.min(100, volume)) / 100;
	const filled = Math.round(ratio * width);
	return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

export function buildModeStatusLine(state: {
	shuffle: boolean;
	repeat: 'off' | 'all' | 'one';
	isDiscoMode: boolean;
	autoplay: boolean;
	radioIsActive?: boolean;
	playbackMode?: 'youtube' | 'stream';
	currentStation?: {name: string} | null;
	explicitQueueLength?: number;
	queueIndex?: number;
}): string {
	if (state.playbackMode === 'stream' && state.currentStation) {
		return `LIVE · ${state.currentStation.name}`;
	}

	const shuffle = state.shuffle ? 'ON' : 'OFF';
	const repeat =
		state.repeat === 'all' ? 'ALL' : state.repeat === 'one' ? 'ONE' : 'OFF';
	const disco = state.isDiscoMode ? 'ON' : 'OFF';
	const autoplay = state.autoplay ? 'ON' : 'OFF';
	const radio = state.radioIsActive ? ' · Radio ON' : '';
	const inSimilarPhase =
		state.autoplay &&
		(state.explicitQueueLength ?? 0) > 0 &&
		state.queueIndex !== undefined &&
		state.queueIndex >= (state.explicitQueueLength ?? 0);
	const similar = inSimilarPhase ? ' · Similar' : '';
	return `Shuffle ${shuffle} · Repeat ${repeat} · Autoplay ${autoplay}${radio}${similar} · Disco ${disco}`;
}

export function buildPlayerShortcutLine(maxWidth: number): string {
	const required = [
		'[←→] Track',
		'[+/-]',
		'[Space] Play',
		'[Shift+S] Shuffle',
		'[R] Repeat',
		'[F] Fav',
		'[L] Library',
		'[I] Radio',
		'[,] Settings',
		'[/] Search',
		'[Q] Quit',
	];
	const optional = [
		'[Shift+A] Autoplay',
		'[P] Playlists',
		'[E] Favorites',
		'[D] Disco',
	];

	let line = required.join('  ');
	for (const segment of optional) {
		const candidate = `${line}  ${segment}`;
		if (candidate.length > maxWidth) {
			break;
		}
		line = candidate;
	}

	if (line.length > maxWidth) {
		return `${line.slice(0, Math.max(0, maxWidth - 3))}...`;
	}

	return line;
}
