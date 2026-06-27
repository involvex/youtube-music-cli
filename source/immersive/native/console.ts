import process from 'node:process';
import {enableProcessDpiAwareness, setNativeConsoleTitle} from './win32-ffi.ts';

export interface TerminalInfo {
	width: number;
	height: number;
	pixelWidth: number;
	pixelHeight: number;
}

let dpiAwarenessEnabled = false;

export function enableDpiAwareness(): void {
	if (dpiAwarenessEnabled || process.platform !== 'win32') {
		return;
	}

	dpiAwarenessEnabled = true;
	void enableProcessDpiAwareness();
}

export function getTerminalInfo(): TerminalInfo {
	const width = process.stdout.columns || 120;
	const height = process.stdout.rows || 30;

	return {
		width,
		height,
		pixelWidth: width * 10,
		pixelHeight: height * 20,
	};
}

export function onTerminalResize(handler: () => void): void {
	process.stdout.on('resize', handler);
}

export function setConsoleTitle(title: string): void {
	void setNativeConsoleTitle(title).then(success => {
		if (!success) {
			process.stdout.write(`\x1B]0;${title}\x07`);
		}
	});
}

export function clearScreen(): void {
	process.stdout.write('\x1B[2J\x1B[H');
}

export function hideCursor(): void {
	process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
	process.stdout.write('\x1B[?25h');
}

export function enterAltBuffer(): void {
	process.stdout.write('\x1B[?1049h');
}

export function exitAltBuffer(): void {
	process.stdout.write('\x1B[?1049l');
}

export function resetCursor(): void {
	process.stdout.write('\x1B[H');
}
