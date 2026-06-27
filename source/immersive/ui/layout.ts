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
	controlsY: number;
}

export function computeLayout(width: number, height: number): ImmersiveLayout {
	const headerRows = 1;
	const footerRows = 2;
	const margin = 2;
	const innerW = Math.max(20, width - margin * 2);
	const contentH = Math.max(12, height - headerRows - footerRows);

	const vizH = Math.max(7, Math.floor(contentH * 0.4));
	const nowPlayingH = 7;
	const queueH = Math.max(4, contentH - vizH - nowPlayingH - 2);

	const splitQueue = innerW >= 72;
	const nowPlayingW = splitQueue ? Math.floor(innerW * 0.58) : innerW;
	const queueW = splitQueue ? innerW - nowPlayingW - 2 : innerW;

	const vizY = headerRows + 1;
	const nowPlayingY = vizY + vizH + 1;
	const queueY = splitQueue ? nowPlayingY : nowPlayingY + nowPlayingH + 1;

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
		queueX: splitQueue ? margin + nowPlayingW + 2 : margin,
		queueY: splitQueue ? nowPlayingY : queueY,
		queueW,
		queueH,
		controlsY: height - 1,
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
