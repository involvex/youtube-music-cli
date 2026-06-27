import process from 'node:process';
import {registerMediaHotkeys} from './win32-ffi.ts';

export interface GlobalHotkeyHandlers {
	onTogglePlay?: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
}

let unregisterFn: (() => Promise<void>) | null = null;

export function registerGlobalHotkeys(handlers: GlobalHotkeyHandlers): boolean {
	if (process.platform !== 'win32' || unregisterFn) {
		return false;
	}

	void registerMediaHotkeys(handlers).then(unregister => {
		unregisterFn = unregister;
	});

	return true;
}

export async function unregisterGlobalHotkeys(): Promise<void> {
	if (!unregisterFn) {
		return;
	}

	await unregisterFn();
	unregisterFn = null;
}

export {
	registerHotkey,
	unregisterHotkey,
	unregisterAllHotkeys,
	startHotkeyListener,
	stopHotkeyListener,
	getRegisteredHotkeyCount,
	parseHotkeyString,
	isValidVirtualKey,
	getKeyCode,
	getModifierFlags,
} from './hotkeys-stdin.ts';

export type {HotkeyConfig, ModifierKey, VirtualKey} from './hotkeys-stdin.ts';
