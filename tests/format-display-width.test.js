import {describe, expect, test} from 'bun:test';
import stringWidth from 'string-width';
import {
	formatIconLabel,
	truncate,
	truncateToWidth,
} from '../source/utils/format.ts';
import {
	NETWORK_STATUS_OFFLINE_LABEL,
	NETWORK_STATUS_ONLINE_LABEL,
	formatNetworkStatusLabel,
	formatNetworkStatusSuffix,
} from '../source/utils/network-status-label.ts';
import {ICONS} from '../source/utils/icons.ts';

describe('truncateToWidth', () => {
	test('leaves short ASCII unchanged', () => {
		expect(truncateToWidth('hello', 10)).toBe('hello');
	});

	test('truncates by display width with emoji in title', () => {
		const title = '🕒 Recently Played track name';
		const result = truncateToWidth(title, 12);
		expect(stringWidth(result)).toBeLessThanOrEqual(12);
		expect(result.endsWith('...')).toBe(true);
	});

	test('truncate() matches truncateToWidth()', () => {
		const text = 'Test 🎵 mix';
		expect(truncate(text, 8)).toBe(truncateToWidth(text, 8));
	});
});

describe('network status labels', () => {
	test('labels are single-width prefixes', () => {
		expect(stringWidth(NETWORK_STATUS_OFFLINE_LABEL)).toBe(
			stringWidth('○ Offline'),
		);
		expect(stringWidth(NETWORK_STATUS_ONLINE_LABEL)).toBe(
			stringWidth('! Online'),
		);
	});

	test('section headings share the same icon column width', () => {
		const recent = formatIconLabel(ICONS.CLOCK, 'Recently Played');
		const favorites = formatIconLabel(ICONS.HEART, 'Recent Favorites');
		const recentPrefix = recent.slice(0, recent.indexOf('Recently'));
		const favoritesPrefix = favorites.slice(0, favorites.indexOf('Recent'));
		expect(stringWidth(recentPrefix)).toBe(stringWidth(favoritesPrefix));
		expect(stringWidth(recentPrefix)).toBe(3);
	});

	test('formatNetworkStatusSuffix adds leading space', () => {
		expect(formatNetworkStatusSuffix(false)).toBe(
			` ${NETWORK_STATUS_ONLINE_LABEL}`,
		);
		expect(formatNetworkStatusLabel(true)).toBe(NETWORK_STATUS_OFFLINE_LABEL);
	});
});
