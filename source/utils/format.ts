// Format utilities
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
	if (text.length <= maxLength) {
		return text;
	}

	return text.slice(0, maxLength - 3) + '...';
}
