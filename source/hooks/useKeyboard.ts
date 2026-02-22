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

// Global registry for key handlers
const registry: Set<RegistryEntry> = new Set();

/**
 * Hook to bind keyboard shortcuts.
 * This uses a centralized manager to avoid multiple useInput calls and memory leaks.
 * Uses a ref-based approach to always call the latest handler without stale closures.
 */
export function useKeyBinding(
	keys: readonly string[],
	handler: () => void,
	options?: {bypassBlock?: boolean},
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const entry: RegistryEntry = {
			keys,
			handler: () => handlerRef.current(),
			bypassBlock: options?.bypassBlock,
		};
		registry.add(entry);

		return () => {
			registry.delete(entry);
		};
	}, [keys, options?.bypassBlock]); // keys and bypassBlock are deps; handlerRef is a stable ref
}

/**
 * Global Keyboard Manager Component
 * This should be rendered once at the root of the app.
 */
export function KeyboardManager() {
	const {blockCount} = useKeyboardBlockContext();
	useInput((input, key) => {
		if (blockCount > 0) {
			// When keyboard input is blocked (e.g., within a focused text input),
			// check if any entry has bypassBlock flag and matches this key.
			for (const entry of registry) {
				if (entry.bypassBlock) {
					for (const binding of entry.keys) {
						const lowerBinding = binding.toLowerCase();

						// Check for ESC key (most common bypass case)
						if (lowerBinding === 'escape' && key.escape) {
							entry.handler();
							return;
						}

						// Handle other bypass keys
						const isMatch =
							((lowerBinding === 'return' || lowerBinding === 'enter') &&
								key.return) ||
							(lowerBinding === 'backspace' && key.backspace) ||
							(lowerBinding === 'tab' && key.tab) ||
							(lowerBinding === 'up' && key.upArrow) ||
							(lowerBinding === 'down' && key.downArrow) ||
							(lowerBinding === 'left' && key.leftArrow) ||
							(lowerBinding === 'right' && key.rightArrow) ||
							(lowerBinding === 'pageup' && key.pageUp) ||
							(lowerBinding === 'pagedown' && key.pageDown) ||
							(() => {
								const parts = lowerBinding.split('+');
								const hasCtrl = parts.includes('ctrl');
								const hasMeta = parts.includes('meta') || parts.includes('alt');
								const hasShift = parts.includes('shift');
								const mainKey = parts[parts.length - 1];

								if (hasCtrl && !key.ctrl) return false;
								if (hasMeta && !key.meta) return false;
								if (hasShift && !key.shift) return false;

								// Check arrow keys
								if (mainKey === 'up' && key.upArrow) return true;
								if (mainKey === 'down' && key.downArrow) return true;
								if (mainKey === 'left' && key.leftArrow) return true;
								if (mainKey === 'right' && key.rightArrow) return true;

								// Handle '=' and '+'
								if (mainKey === '=' && input === '=') return true;
								if (mainKey === '+' && input === '+') return true;
								if (mainKey === '+' && key.shift && input === '=') return true;

								return (
									input.toLowerCase() === mainKey && !key.ctrl && !key.meta
								);
							})();

						if (isMatch) {
							entry.handler();
							return;
						}
					}
				}
			}
			// If no bypass handler matched, skip all global shortcuts
			return;
		}

		// Debug logging for key presses (helps diagnose binding issues)
		if (input || key.ctrl || key.meta || key.shift) {
			logger.debug('KeyboardManager', 'Key pressed', {
				input,
				ctrl: key.ctrl,
				meta: key.meta,
				shift: key.shift,
				upArrow: key.upArrow,
				downArrow: key.downArrow,
				leftArrow: key.leftArrow,
				rightArrow: key.rightArrow,
			});
		}

		// Global quit handling
		if (key.ctrl && input === 'c') {
			// Exit cleanly without clearing screen (let Ink handle cleanup)
			process.exit(0);
		}

		// Note: Ctrl+L refresh removed to fix scroll-to-top issue
		// Direct ANSI escapes bypass Ink's rendering and cause scrolling problems

		// Dispatch to all registered handlers
		for (const entry of registry) {
			const {keys, handler} = entry;

			for (const binding of keys) {
				const lowerBinding = binding.toLowerCase();

				// Handle special keys
				const isMatch =
					(lowerBinding === 'escape' && key.escape) ||
					((lowerBinding === 'return' || lowerBinding === 'enter') &&
						key.return) ||
					(lowerBinding === 'backspace' && key.backspace) ||
					(lowerBinding === 'tab' && key.tab) ||
					(lowerBinding === 'up' && key.upArrow) ||
					(lowerBinding === 'down' && key.downArrow) ||
					(lowerBinding === 'left' && key.leftArrow) ||
					(lowerBinding === 'right' && key.rightArrow) ||
					(lowerBinding === 'pageup' && key.pageUp) ||
					(lowerBinding === 'pagedown' && key.pageDown) ||
					// Handle combinations
					(() => {
						const parts = lowerBinding.split('+');
						const hasCtrl = parts.includes('ctrl');
						const hasMeta = parts.includes('meta') || parts.includes('alt');
						const hasShift = parts.includes('shift');
						const mainKey = parts[parts.length - 1];
						const uppercaseShiftInput =
							input.length === 1 &&
							input === input.toUpperCase() &&
							input.toLowerCase() === mainKey;

						if (hasCtrl && !key.ctrl) return false;
						if (hasMeta && !key.meta) return false;
						if (hasShift && !key.shift && !uppercaseShiftInput) return false;
						// Block lowercase-only bindings when shift is active or the input is
						// an uppercase letter (which implies Shift was held).
						// Example: the 'p' (Plugins) binding must not fire when the user
						// presses Shift+P, which should only trigger 'shift+p' (Playlists).
						// Note: `input !== input.toLowerCase()` is true only for uppercase
						// alphabetical characters, avoiding false positives on symbols/digits.
						if (
							!hasShift &&
							(key.shift ||
								(input.length === 1 && input !== input.toLowerCase()))
						)
							return false;

						// Check the actual key
						if (mainKey === 'up' && key.upArrow) return true;
						if (mainKey === 'down' && key.downArrow) return true;
						if (mainKey === 'left' && key.leftArrow) return true;
						if (mainKey === 'right' && key.rightArrow) return true;

						// Handle '=' and '+' specially (+ is shift+=)
						if (mainKey === '=' && input === '=') return true;
						if (mainKey === '+' && input === '+') return true;
						if (mainKey === '+' && key.shift && input === '=') return true; // shift+= produces '+'

						return input.toLowerCase() === mainKey && !key.ctrl && !key.meta;
					})();

				if (isMatch) {
					handler();
					// We don't break here because multiple handlers might want to react
					// but usually only one does.
				}
			}
		}
	});

	return null;
}
