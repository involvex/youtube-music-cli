/**
 * Format a download progress line for TUI / immersive status.
 */
export function formatDownloadProgress(info: {
	current: number;
	total: number;
	track: {title: string};
	phase: 'start' | 'done' | 'skip' | 'fail';
	error?: string;
}): string {
	const title = info.track.title || 'Unknown';
	const prefix = `[${info.current}/${info.total}]`;
	switch (info.phase) {
		case 'start':
			return `${prefix} Downloading: ${title}`;
		case 'done':
			return `${prefix} Saved: ${title}`;
		case 'skip':
			return `${prefix} Skipped (exists): ${title}`;
		case 'fail':
			return `${prefix} Failed: ${title}${info.error ? ` — ${info.error}` : ''}`;
	}
}
