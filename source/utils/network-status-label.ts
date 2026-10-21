// Terminal-safe network status labels (single-width BMP; no emoji).

export const NETWORK_STATUS_OFFLINE_LABEL = '○ Offline';
export const NETWORK_STATUS_ONLINE_LABEL = '! Online';

export function formatNetworkStatusLabel(isOffline: boolean): string {
	return isOffline ? NETWORK_STATUS_OFFLINE_LABEL : NETWORK_STATUS_ONLINE_LABEL;
}

/** Leading space + label, for titles and headers. */
export function formatNetworkStatusSuffix(isOffline: boolean): string {
	return ` ${formatNetworkStatusLabel(isOffline)}`;
}

/** Parentheses wrapper, for inline hints (e.g. search limit row). */
export function formatNetworkStatusParentheses(isOffline: boolean): string {
	return `(${formatNetworkStatusLabel(isOffline)})`;
}
