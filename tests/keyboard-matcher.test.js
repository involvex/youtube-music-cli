import {expect, test} from 'bun:test';
import {
	matchKeyBinding,
	isEscapeKey,
	resetKeyboardRegistryForTests,
} from '../source/hooks/useKeyboard.ts';

test('isEscapeKey covers Ink flag and raw ESC byte (macOS terminals)', () => {
	expect(isEscapeKey('', {escape: true})).toBe(true);
	expect(isEscapeKey('\x1b', {})).toBe(true);
	expect(isEscapeKey('a', {})).toBe(false);
	expect(isEscapeKey('', {})).toBe(false);
});

test('escape binding matches both Ink flag and raw byte', () => {
	expect(matchKeyBinding('escape', '', {escape: true})).toBe(true);
	expect(matchKeyBinding('escape', '\x1b', {})).toBe(true);
	expect(matchKeyBinding('escape', 'a', {})).toBe(false);
});

test('uppercase single-letter binding requires Shift (M vs m)', () => {
	// Shift+M matches 'M'
	expect(matchKeyBinding('M', 'M', {shift: true})).toBe(true);
	// lowercase m must NOT trigger the 'M' binding ...
	expect(matchKeyBinding('M', 'm', {})).toBe(false);
	// ... and uppercase M must NOT trigger the lowercase 'm' binding
	expect(matchKeyBinding('m', 'M', {shift: true})).toBe(false);
	expect(matchKeyBinding('m', 'm', {})).toBe(true);
});

test('ctrl+letter matches control codes', () => {
	// Ctrl+A arrives as SOH (0x01) with ctrl flag
	expect(matchKeyBinding('ctrl+a', '', {ctrl: true})).toBe(true);
	expect(matchKeyBinding('ctrl+a', 'a', {})).toBe(false);
});

test('volume symbols match', () => {
	expect(matchKeyBinding('=', '=', {})).toBe(true);
	expect(matchKeyBinding('+', '+', {})).toBe(true);
	expect(matchKeyBinding('-', '-', {})).toBe(true);
	// Shift+= produces '+' on many layouts
	expect(matchKeyBinding('+', '=', {shift: true})).toBe(true);
});

test('return does not match when Ctrl is held (Ctrl+M separation)', () => {
	expect(matchKeyBinding('return', '\r', {return: true})).toBe(true);
	expect(matchKeyBinding('enter', '\r', {return: true})).toBe(true);
	expect(matchKeyBinding('return', '', {return: true, ctrl: true})).toBe(false);
});

test('delete binding matches delete or backspace', () => {
	expect(matchKeyBinding('delete', '', {delete: true})).toBe(true);
	expect(matchKeyBinding('backspace', '', {backspace: true})).toBe(true);
});

test('shift+arrow combos match', () => {
	expect(
		matchKeyBinding('shift+right', '', {shift: true, rightArrow: true}),
	).toBe(true);
	expect(matchKeyBinding('shift+right', '', {rightArrow: true})).toBe(false);
});

test('registry reset helper exists for test isolation', () => {
	resetKeyboardRegistryForTests();
	expect(true).toBe(true);
});
