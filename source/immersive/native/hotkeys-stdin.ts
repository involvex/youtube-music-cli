import process from 'node:process';
import * as readline from 'node:readline';

export interface HotkeyConfig {
	key: string;
	modifiers: ('ctrl' | 'alt' | 'shift' | 'win')[];
	action: () => void;
}

const registeredHotkeys = new Map<string, HotkeyConfig>();
let isListening = false;
let listenerReadline: readline.Interface | null = null;

export function registerHotkey(config: HotkeyConfig): string {
	registeredHotkeys.set(config.key.toLowerCase(), config);
	return config.key;
}

export function unregisterHotkey(key: string): boolean {
	return registeredHotkeys.delete(key.toLowerCase());
}

export function unregisterAllHotkeys(): void {
	registeredHotkeys.clear();
}

export function startHotkeyListener(
	onHotkey: (config: HotkeyConfig) => void,
): boolean {
	if (process.platform !== 'win32') {
		return false;
	}

	if (isListening) {
		return true;
	}

	isListening = true;

	listenerReadline = readline.createInterface({
		input: process.stdin,
		escapeCodeTimeout: 100,
	});

	listenerReadline.on('keypress', (_string, key) => {
		if (!key) return;

		let keyName = key.name?.toLowerCase() ?? '';

		if (key.ctrl && keyName === 'c') {
			isListening = false;
			listenerReadline?.close();
			return;
		}

		if (keyName === 'escape') {
			keyName = 'esc';
		}

		const config = registeredHotkeys.get(keyName);
		if (config) {
			config.action();
			onHotkey(config);
		}
	});

	return true;
}

export function stopHotkeyListener(): void {
	if (listenerReadline) {
		listenerReadline.close();
	}

	isListening = false;
	listenerReadline = null;
	unregisterAllHotkeys();
}

export function getRegisteredHotkeyCount(): number {
	return registeredHotkeys.size;
}

export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'win';
export type VirtualKey =
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'I'
	| 'J'
	| 'K'
	| 'L'
	| 'M'
	| 'N'
	| 'O'
	| 'P'
	| 'Q'
	| 'R'
	| 'S'
	| 'T'
	| 'U'
	| 'V'
	| 'W'
	| 'X'
	| 'Y'
	| 'Z'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| 'F1'
	| 'F2'
	| 'F3'
	| 'F4'
	| 'F5'
	| 'F6'
	| 'F7'
	| 'F8'
	| 'F9'
	| 'F10'
	| 'F11'
	| 'F12'
	| 'SPACE'
	| 'ENTER'
	| 'ESCAPE'
	| 'TAB'
	| 'UP'
	| 'DOWN'
	| 'LEFT'
	| 'RIGHT';

export function parseHotkeyString(hotkeyStr: string): {
	modifiers: ModifierKey[];
	key: VirtualKey;
} | null {
	const parts = hotkeyStr.toUpperCase().split('+');
	if (parts.length === 0) return null;

	const modifiers: ModifierKey[] = [];
	let key: VirtualKey | null = null;

	const modifierSet = new Set(['CTRL', 'ALT', 'SHIFT', 'WIN']);

	for (const part of parts) {
		const trimmed = part.trim();
		if (modifierSet.has(trimmed)) {
			const mod = trimmed.toLowerCase() as ModifierKey;
			modifiers.push(mod);
		} else {
			key = trimmed as VirtualKey;
		}
	}

	if (!key) return null;

	return {modifiers, key};
}

export function isValidVirtualKey(key: string): key is VirtualKey {
	const validKeys: VirtualKey[] = [
		'A',
		'B',
		'C',
		'D',
		'E',
		'F',
		'G',
		'H',
		'I',
		'J',
		'K',
		'L',
		'M',
		'N',
		'O',
		'P',
		'Q',
		'R',
		'S',
		'T',
		'U',
		'V',
		'W',
		'X',
		'Y',
		'Z',
		'0',
		'1',
		'2',
		'3',
		'4',
		'5',
		'6',
		'7',
		'8',
		'9',
		'F1',
		'F2',
		'F3',
		'F4',
		'F5',
		'F6',
		'F7',
		'F8',
		'F9',
		'F10',
		'F11',
		'F12',
		'SPACE',
		'ENTER',
		'ESCAPE',
		'TAB',
		'UP',
		'DOWN',
		'LEFT',
		'RIGHT',
	];

	return validKeys.includes(key as VirtualKey);
}

export function getKeyCode(key: VirtualKey): number {
	const keyCodes: Record<VirtualKey, number> = {
		A: 0x41,
		B: 0x42,
		C: 0x43,
		D: 0x44,
		E: 0x45,
		F: 0x46,
		G: 0x47,
		H: 0x48,
		I: 0x49,
		J: 0x4a,
		K: 0x4b,
		L: 0x4c,
		M: 0x4d,
		N: 0x4e,
		O: 0x4f,
		P: 0x50,
		Q: 0x51,
		R: 0x52,
		S: 0x53,
		T: 0x54,
		U: 0x55,
		V: 0x56,
		W: 0x57,
		X: 0x58,
		Y: 0x59,
		Z: 0x5a,
		'0': 0x30,
		'1': 0x31,
		'2': 0x32,
		'3': 0x33,
		'4': 0x34,
		'5': 0x35,
		'6': 0x36,
		'7': 0x37,
		'8': 0x38,
		'9': 0x39,
		F1: 0x70,
		F2: 0x71,
		F3: 0x72,
		F4: 0x73,
		F5: 0x74,
		F6: 0x75,
		F7: 0x76,
		F8: 0x77,
		F9: 0x78,
		F10: 0x79,
		F11: 0x7a,
		F12: 0x7b,
		SPACE: 0x20,
		ENTER: 0x0d,
		ESCAPE: 0x1b,
		TAB: 0x09,
		UP: 0x26,
		DOWN: 0x28,
		LEFT: 0x25,
		RIGHT: 0x27,
	};

	return keyCodes[key] ?? 0;
}

export function getModifierFlags(modifiers: ModifierKey[]): number {
	let flags = 0;

	for (const mod of modifiers) {
		switch (mod) {
			case 'ctrl':
				flags |= 0x02;
				break;
			case 'alt':
				flags |= 0x01;
				break;
			case 'shift':
				flags |= 0x04;
				break;
			case 'win':
				flags |= 0x08;
				break;
		}
	}

	return flags;
}
