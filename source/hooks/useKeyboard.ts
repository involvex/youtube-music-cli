// Keyboard input handling hook
import {useCallback, useEffect} from 'react';
import {useInput} from 'ink';

type KeyHandler = () => void;
type RegistryEntry = {
	keys: readonly string[];
	handler: KeyHandler;
};

// Global registry for key handlers
const registry: Set<RegistryEntry> = new Set();

/**
 * Hook to bind keyboard shortcuts.
 * This uses a centralized manager to avoid multiple useInput calls and memory leaks.
 */
export function useKeyBinding(
	keys: readonly string[],
	handler: () => void,
): void {
	const memoizedHandler = useCallback(handler, [handler]);

	useEffect(() => {
		const entry: RegistryEntry = {keys, handler: memoizedHandler};
		registry.add(entry);

		return () => {
			registry.delete(entry);
		};
	}, [keys, memoizedHandler]);
}

/**
 * Global Keyboard Manager Component
 * This should be rendered once at the root of the app.
 */
export function KeyboardManager() {
	useInput((input, key) => {
		// Global quit handling
		if (key.ctrl && input === 'c') {
			process.exit(0);
		}

		// Manual screen refresh (useful if terminal gets messy)
		if (key.ctrl && input === 'l') {
			process.stdout.write('\x1Bc');
			return;
		}

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

						if (hasCtrl && !key.ctrl) return false;
						if (hasMeta && !key.meta) return false;
						if (hasShift && !key.shift) return false;

						// Check the actual key
						if (mainKey === 'up' && key.upArrow) return true;
						if (mainKey === 'down' && key.downArrow) return true;
						if (mainKey === 'left' && key.leftArrow) return true;
						if (mainKey === 'right' && key.rightArrow) return true;

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
