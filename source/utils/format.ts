// Format utilities
import stringWidth from 'string-width';

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
	if (!seconds || seconds < 0) {
		return '0:00';
	}

	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);

	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
	if (num >= 1_000_000) {
		return `${(num / 1_000_000).toFixed(1)}M`;
	}

	if (num >= 1_000) {
		return `${(num / 1_000).toFixed(1)}K`;
	}

	return num.toString();
}

export function truncate(text: string, maxLength: number): string {
	return truncateToWidth(text, maxLength);
}

export function truncateToWidth(text: string, maxWidth: number): string {
	if (maxWidth <= 0) {
		return '';
	}

	if (stringWidth(text) <= maxWidth) {
		return text;
	}

	const ellipsis = '...';
	const ellipsisWidth = stringWidth(ellipsis);
	const target = Math.max(0, maxWidth - ellipsisWidth);
	let width = 0;
	let result = '';

	for (const char of text) {
		const charWidth = stringWidth(char);
		if (width + charWidth > target) {
			break;
		}

		result += char;
		width += charWidth;
	}

	return result + ellipsis;
}

/** Icon column + label for Ink rows (fixed display-width icon column). */
export function formatIconLabel(
	icon: string,
	label: string,
	iconColumnWidth = 2,
): string {
	const iconWidth = stringWidth(icon);
	const pad =
		iconWidth < iconColumnWidth ? ' '.repeat(iconColumnWidth - iconWidth) : '';

	return `${icon}${pad} ${label}`;
}
