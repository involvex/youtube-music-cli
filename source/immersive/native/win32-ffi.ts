// Runtime-only Bun Win32 bindings. Type checking is intentionally disabled
// because @bun-win32 packages use syntax incompatible with erasableSyntaxOnly.

type User32Api = {
	SetProcessDPIAware: () => number;
	RegisterHotKey: (
		hWnd: bigint,
		id: number,
		modifiers: number,
		vk: number,
	) => number;
	UnregisterHotKey: (hWnd: bigint, id: number) => number;
	PeekMessageW: (
		msg: Uint8Array,
		hWnd: bigint,
		filterMin: number,
		filterMax: number,
		removeMsg: number,
	) => number;
};

type Kernel32Api = {
	SetConsoleTitleW: (title: Buffer) => number;
};

export function isBunWin32Runtime(): boolean {
	return (
		typeof process !== 'undefined' &&
		process.platform === 'win32' &&
		typeof (globalThis as {Bun?: unknown}).Bun !== 'undefined'
	);
}

export async function loadUser32Api(): Promise<User32Api | null> {
	if (!isBunWin32Runtime()) {
		return null;
	}

	try {
		const dynamicImport = new Function(
			'specifier',
			'return import(specifier)',
		) as (specifier: string) => Promise<{default: User32Api}>;
		const module = await dynamicImport('@bun-win32/user32');
		return module.default;
	} catch {
		return null;
	}
}

export async function loadKernel32Api(): Promise<Kernel32Api | null> {
	if (!isBunWin32Runtime()) {
		return null;
	}

	try {
		const dynamicImport = new Function(
			'specifier',
			'return import(specifier)',
		) as (specifier: string) => Promise<{default: Kernel32Api}>;
		const module = await dynamicImport('@bun-win32/kernel32');
		return module.default;
	} catch {
		return null;
	}
}

// DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 — pseudo-handle passed as intptr_t.
const DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4n;

export async function enableProcessDpiAwareness(): Promise<void> {
	if (!isBunWin32Runtime()) {
		return;
	}

	try {
		const {dlopen, FFIType} = await import('bun:ffi');
		const {SetProcessDpiAwarenessContext} = dlopen('user32', {
			SetProcessDpiAwarenessContext: {
				args: [FFIType.i64],
				returns: FFIType.i32,
			},
		}).symbols;

		if (
			SetProcessDpiAwarenessContext(
				DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
			) !== 0
		) {
			return;
		}
	} catch {
		// Fall through to legacy API.
	}

	try {
		const user32 = await loadUser32Api();
		user32?.SetProcessDPIAware();
	} catch {
		// DPI awareness is optional.
	}
}

export async function setNativeConsoleTitle(title: string): Promise<boolean> {
	const kernel32 = await loadKernel32Api();
	if (!kernel32) {
		return false;
	}

	const buffer = Buffer.from(`${title}\0`, 'utf16le');
	return kernel32.SetConsoleTitleW(buffer) !== 0;
}

export async function registerMediaHotkeys(handlers: {
	onTogglePlay?: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
}): Promise<() => Promise<void>> {
	const user32 = await loadUser32Api();
	if (!user32) {
		return async () => {};
	}

	const HOTKEY_PLAY_PAUSE = 1;
	const HOTKEY_NEXT = 2;
	const HOTKEY_PREVIOUS = 3;
	const MOD_ALT = 0x0001;

	user32.RegisterHotKey(0n, HOTKEY_PLAY_PAUSE, MOD_ALT, 0xb3);
	user32.RegisterHotKey(0n, HOTKEY_NEXT, MOD_ALT, 0xb0);
	user32.RegisterHotKey(0n, HOTKEY_PREVIOUS, MOD_ALT, 0xb1);

	const pollTimer = setInterval(() => {
		const msg = new Uint8Array(48);
		while (user32.PeekMessageW(msg, 0n, 0, 0, 1) !== 0) {
			const view = new DataView(msg.buffer);
			const messageId = view.getUint32(4, true);
			const hotkeyId = view.getUint32(8, true);

			if (messageId === 0x0312) {
				switch (hotkeyId) {
					case HOTKEY_PLAY_PAUSE:
						handlers.onTogglePlay?.();
						break;
					case HOTKEY_NEXT:
						handlers.onNext?.();
						break;
					case HOTKEY_PREVIOUS:
						handlers.onPrevious?.();
						break;
				}
			}
		}
	}, 100);

	return async () => {
		clearInterval(pollTimer);
		user32.UnregisterHotKey(0n, HOTKEY_PLAY_PAUSE);
		user32.UnregisterHotKey(0n, HOTKEY_NEXT);
		user32.UnregisterHotKey(0n, HOTKEY_PREVIOUS);
	};
}
