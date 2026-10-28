import {expect, test} from 'bun:test';
import {
	BOOT_TAGLINE,
	YMC_ART_COMPACT,
	YMC_ART_FULL,
	resolveBootArt,
} from '../source/utils/boot-art.ts';

test('resolveBootArt uses full pixelfont wordmark on wide terminals', () => {
	const lines = resolveBootArt(80);
	expect(lines).toEqual([...YMC_ART_FULL]);
	expect(lines[0]).toContain('█');
});

test('resolveBootArt uses compact YMC on medium terminals', () => {
	const lines = resolveBootArt(24);
	expect(lines).toEqual([...YMC_ART_COMPACT]);
});

test('resolveBootArt falls back to plain text on tiny terminals', () => {
	expect(resolveBootArt(10)).toEqual(['YMC']);
});

test('boot tagline is set', () => {
	expect(BOOT_TAGLINE.length).toBeGreaterThan(0);
});
