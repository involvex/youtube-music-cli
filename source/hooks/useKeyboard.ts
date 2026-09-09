// Keyboard input handling hook
import {useEffect, useRef} from 'react';
import {useInput} from 'ink';
import {logger} from '../services/logger/logger.service.ts';
import {useKeyboardBlockContext} from './useKeyboardBlocker.tsx';

type KeyHandler = () => void;
type RegistryEntry = {
	keys: readonly string[];
	handler: KeyHandler;
	bypassBlock?: boolean;
};

// Minimal shape of Ink's key object needed for matching. Kept structural so
// the matcher can be unit-tested without Ink.
export type KeyInfo = {
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	rightArrow?: boolean;
	return?: boolean;
	escape?: boolean;
	backspace?: boolean;
	delete?: boolean;
	tab?: boolean;
	pageUp?: boolean;
	pageDown?: boolean;
	home?: boolean;
	end?: boolean;
};

// Global registry for key handlers
const registry: Set<RegistryEntry> = new Set();

/** Test-only: clear the global registry between tests. */
export function resetKeyboardRegistryForTests(): void {
	registry.clear();
}

// Callback to navigate to home (registered by MainLayout)
let goHomeCallback: (() => void) | null = null;

/**
 * Register a callback to navigate to home (used for Ctrl+C in certain views)
 */
export function registerGoHomeCallback(callback: () => void): void {
	goHomeCallback = callback;
}

/**
 * Function to set the current view for Ctrl+C handling
 * This should be called by the app to track which view we're in
 */
let currentView: string = 'home';

export function setCurrentViewForCtrlC(view: string): void {
	currentView = view;
}

/** True when the keypress represents Escape, including a raw ESC byte that
 * some macOS terminals deliver without Ink setting key.escape. */
export function isEscapeKey(input: string, key: KeyInfo): boolean {
	return Boolean(key.escape) || input === '\x1b';
}

/**
 * Match a single keybinding string (e.g. 'escape', 'ctrl+a', 'shift+right',
 * '+', 'M') against an Ink keypress.
 *
 * Case convention: a single UPPERCASE letter binding (e.g. 'M') requires
 * Shift (it matches Shift+m / 'M'); a lowercase letter binding explicitly
 * does NOT match when Shift is held, so 'm' and 'M' are distinct bindings.
 */
export function matchKeyBinding(
	binding: string,
	input: string,
	key: KeyInfo,
): boolean {
	const lowerBinding = binding.toLowerCase();

	// A. Special keys (highest precedence). Skip Enter/Return when Ctrl is
	// held so Ctrl+M (ASCII CR) can bind separately.
	if (lowerBinding === 'escape' && isEscapeKey(input, key)) return true;
	if (
		(lowerBinding === 'return' || lowerBinding === 'enter') &&
		key.return &&
		!key.ctrl
	)
		return true;
	if (lowerBinding === 'tab' && key.tab) return true;
	if (lowerBinding === 'backspace' && (key.backspace || key.delete))
		return true;
	if (lowerBinding === 'delete' && (key.delete || key.backspace)) return true;
	if (lowerBinding === 'up' && key.upArrow) return true;
	if (lowerBinding === 'down' && key.downArrow) return true;
	if (lowerBinding === 'left' && key.leftArrow) return true;
	if (lowerBinding === 'right' && key.rightArrow) return true;
	if (lowerBinding === 'pageup' && key.pageUp) return true;
	if (lowerBinding === 'pagedown' && key.pageDown) return true;
	if (lowerBinding === 'home' && key.home) return true;
	if (lowerBinding === 'end' && key.end) return true;

	// B. Combination and character keys
	const parts = lowerBinding.split('+');
	const hasCtrl = parts.includes('ctrl');
	const hasMeta = parts.includes('meta') || parts.includes('alt');
	const hasShift = parts.includes('shift');

	// Robust main key detection (handles '+' correctly)
	let mainKey = '';
	if (lowerBinding === '+') {
		mainKey = '+';
	} else if (lowerBinding.endsWith('++')) {
		mainKey = '+';
	} else if (lowerBinding.endsWith('+') && parts.length > 1) {
		mainKey = '+';
	} else {
		mainKey = parts[parts.length - 1]!;
	}

	if (hasCtrl && !key.ctrl) return false;
	if (hasMeta && !key.meta) return false;

	const isLetter = /^[a-z]$/.test(mainKey);
	// A single uppercase letter binding (e.g. 'M') implies Shift.
	const bindingImpliesShift =
		binding.length === 1 &&
		mainKey !== binding &&
		binding === binding.toUpperCase() &&
		isLetter;

	if (hasShift || bindingImpliesShift) {
		const shiftActive =
			key.shift || (input.length === 1 && input !== input.toLowerCase());
		if (!shiftActive) return false;
	} else if (
		isLetter &&
		(key.shift || (input.length === 1 && input !== input.toLowerCase()))
	) {
		// Block 'p' if user typed 'P' (lowercase binding, Shift held)
		return false;
	}

	// Arrow keys, optionally with modifiers (e.g. shift+right for seek)
	if (mainKey === 'up' && key.upArrow) return true;
	if (mainKey === 'down' && key.downArrow) return true;
	if (mainKey === 'left' && key.leftArrow) return true;
	if (mainKey === 'right' && key.rightArrow) return true;

	// Ctrl+letter control codes (SOH–SUB)
	if (hasCtrl && isLetter && input.length === 1) {
		const charCode = input.charCodeAt(0);
		if (charCode >= 1 && charCode <= 26) {
			const derived = String.fromCharCode(charCode + 64);
			if (derived.toLowerCase() === mainKey) return true;
		}
	}

	// Ctrl+symbol (e.g. ctrl+,) when terminal reports key.ctrl
	if (
		hasCtrl &&
		key.ctrl &&
		input.length === 1 &&
		input.toLowerCase() === mainKey
	) {
		return true;
	}

	// Symbol/char match
	const inputLower = input.toLowerCase();
	const isSymbolMatch =
		(mainKey === '=' && input === '=') ||
		(mainKey === '+' && input === '+') ||
		(mainKey === '+' && key.shift && input === '=') ||
		(mainKey === '-' && input === '-') ||
		(mainKey === ']' && input === ']') ||
		(mainKey === '[' && input === '[');

	if (isSymbolMatch || (inputLower === mainKey && !key.ctrl && !key.meta)) {
		return true;
	}

	return false;
}

/**
 * Hook to bind keyboard shortcuts.
 * This uses a centralized manager to avoid multiple useInput calls and memory leaks.
 * Uses a ref-based approach to always call the latest handler without stale closures.
 *
 * Dispatch is LIFO: the most recently registered handler for a key wins, so a
 * focused child view overrides global bindings, and the global fallback in
 * MainLayout only fires when nothing more specific handled the key.
 */
export function useKeyBinding(
	keys: readonly string[],
	handler: () => void,
	options?: {bypassBlock?: boolean},
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	const bypassBlock = options?.bypassBlock ?? false;
	// Serialize for the effect deps: inline arrays (e.g. ['M']) get a new
	// identity every render, but equal content must not churn the registry.
	const keysFingerprint = JSON.stringify([...keys]);

	useEffect(() => {
		// An empty key list disables the binding without occupying a slot.
		if (keys.length === 0) {
			return;
		}

		const entry: RegistryEntry = {
			keys,
			handler: () => handlerRef.current(),
			bypassBlock,
		};

		// Log registration of volume down key for debugging
		if (keys.includes('-') || keys.some(k => k.includes('-'))) {
			logger.debug('KeyboardManager', 'Registered keybinding for "-"', {
				keys,
				bypassBlock,
				stack: new Error().stack,
			});
		}

		registry.add(entry);

		return () => {
			registry.delete(entry);
			if (keys.includes('-') || keys.some(k => k.includes('-'))) {
				logger.debug('KeyboardManager', 'Unregistered keybinding for "-"', {
					keys,
				});
			}
		};
		// keys is intentionally represented by keysFingerprint above: inline
		// arrays get a new identity every render, but equal content must not
		// churn the registry.
	}, [keysFingerprint, bypassBlock]);
}

/** Snapshot of the registry in dispatch (LIFO) order. */
function dispatchOrder(): RegistryEntry[] {
	return [...registry].reverse();
}

/**
 * Global Keyboard Manager Component
 * This should be rendered once at the root of the app.
 */
export function KeyboardManager() {
	const {blockCount} = useKeyboardBlockContext();

	useEffect(() => {
		// Explicitly disable various terminal mouse reporting modes to prevent
		// interference from mouse clicks/scrolls being misinterpreted as keyboard input.
		// Standard, VT200, Any-event, SGR, and URXVT modes.
		process.stdout.write(
			'\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1015l',
		);
	}, []);

	useInput((input, key) => {
		// 1. Filter out mouse sequences and other non-keyboard input.
		// Special keys recognized by Ink (Arrows, Return, etc.) are allowed even if they start with \x1b.
		const isKnownSpecialKey =
			key.upArrow ||
			key.downArrow ||
			key.leftArrow ||
			key.rightArrow ||
			key.return ||
			isEscapeKey(input, key) ||
			key.backspace ||
			key.delete ||
			key.tab ||
			key.pageUp ||
			key.pageDown ||
			key.home ||
			key.end;

		// Ignore ANSI sequences that Ink didn't recognize as special keys.
		if (input.startsWith('\x1b') && !isKnownSpecialKey) {
			return;
		}

		// Ignore multi-character input that isn't recognized (likely mouse chunks or paste).
		if (input.length > 1 && !isKnownSpecialKey) {
			return;
		}

		if (blockCount > 0) {
			// When keyboard input is blocked (e.g., within a focused text input),
			// check if any entry has bypassBlock flag and matches this key.
			// First check for Ctrl+C special case - go to home in search view
			if (key.ctrl && input === 'c') {
				if (currentView === 'search') {
					if (goHomeCallback) {
						goHomeCallback();
					}

					return;
				}

				// In other views, quit the app
				process.exit(0);
			}

			// Escape always bypasses the block so users can leave/close text
			// inputs with the same key everywhere (macOS reliability: this
			// covers both key.escape and a raw ESC byte).
			const pressedEscape = isEscapeKey(input, key);

			for (const entry of dispatchOrder()) {
				// Non-bypass entries stay silent while blocked, except for
				// Escape which is always allowed through.
				if (!entry.bypassBlock && !pressedEscape) {
					continue;
				}

				for (const binding of entry.keys) {
					if (!matchKeyBinding(binding, input, key)) {
						continue;
					}

					// A non-bypass entry only fires while blocked when the
					// pressed key itself is Escape; other matches on that
					// entry must wait until the input is no longer focused.
					if (
						!entry.bypassBlock &&
						binding.toLowerCase() !== 'escape' &&
						pressedEscape
					) {
						continue;
					}

					logger.debug('KeyboardManager', 'Bypass block: handler triggered', {
						binding,
						input,
						key: {ctrl: key.ctrl, shift: key.shift, meta: key.meta},
					});
					entry.handler();
					return;
				}
			}
			return;
		}

		// Debug logging for key presses - ENHANCED for volume investigation
		if (input || key.ctrl || key.meta || key.shift) {
			const isVolumeKey = input === '+' || input === '=' || input === '-';
			logger.debug('KeyboardManager', 'Key pressed', {
				input,
				ctrl: key.ctrl,
				meta: key.meta,
				shift: key.shift,
				upArrow: key.upArrow,
				downArrow: key.downArrow,
				leftArrow: key.leftArrow,
				rightArrow: key.rightArrow,
				isVolumeKey,
				blockCount,
			});
		}

		// Dispatch to registered handlers (LIFO: focused view wins)
		for (const entry of dispatchOrder()) {
			const {keys, handler} = entry;

			for (const binding of keys) {
				if (!matchKeyBinding(binding, input, key)) {
					continue;
				}

				// Enhanced logging for volume keys
				const mainKey =
					binding.toLowerCase() === '+'
						? '+'
						: binding.toLowerCase().split('+').pop();
				if (mainKey === '-' || mainKey === '+' || mainKey === '=') {
					logger.debug('KeyboardManager', 'Volume key handler triggered', {
						binding,
						mainKey,
						input,
						keyShifts: {ctrl: key.ctrl, meta: key.meta, shift: key.shift},
						stack: new Error().stack,
						registrySize: registry.size,
					});
				}

				handler();
				return; // STOP: prevent double-dispatch
			}
		}
	});

	return null;
}
