// Keyboard input handling hook
import {useEffect, useCallback} from 'react';
import {useStdin} from 'ink';

type KeyHandler = (key: string, shift: boolean, ctrl: boolean) => void;

type KeyBindingMap = Record<string, KeyHandler>;

export function useKeyboard(bindings: KeyBindingMap): void {
	const {stdin, setRawMode} = useStdin();

	useEffect(() => {
		setRawMode(true);

		const handleData = (data: Buffer) => {
			// Parse key input
			const str = data.toString();

			// Handle special keys
			if (str === '\u0003') {
				// Ctrl+C - handle quit
				bindings['ctrl+c']?.('', false, true);
				return;
			}

			if (str === '\u001b[C') {
				// Arrow up
				bindings['up']?.('up', false, false);
				return;
			}

			if (str === '\u001b[B') {
				// Arrow down
				bindings['down']?.('down', false, false);
				return;
			}

			if (str === '\u001b[D') {
				// Arrow right
				bindings['right']?.('right', false, false);
				return;
			}

			if (str === '\u001b[A') {
				// Arrow left
				bindings['left']?.('left', false, false);
				return;
			}

			if (str.startsWith('\u001b')) {
				// Other escape sequences
				return;
			}

			// Regular keys
			const key = str.toLowerCase();
			const shift = str !== str.toLowerCase();
			const ctrl = str.length === 1 && str.charCodeAt(0) < 32;

			bindings[key]?.(key, shift, ctrl);
		};

		stdin.on('data', handleData);

		return () => {
			stdin.removeListener('data', handleData);
			setRawMode(false);
		};
	}, [stdin, setRawMode, bindings]);
}

export function useKeyBinding(
	keys: readonly string[],
	handler: () => void,
): void {
	const memoizedHandler = useCallback(handler, [handler]);

	useKeyboard({
		...Object.fromEntries(
			keys.flatMap(key => {
				const bindings = parseKeyBinding(key);
				return bindings.map(k => [k, memoizedHandler]);
			}),
		),
	});
}

function parseKeyBinding(binding: string): string[] {
	const keys: string[] = [];

	const parts = binding.split('+');

	if (parts.includes('shift') && parts.includes('right')) {
		keys.push('right');
	}

	if (parts.includes('shift') && parts.includes('left')) {
		keys.push('left');
	}

	if (parts.includes('ctrl') && parts.length > 1) {
		keys.push(`ctrl+${parts[parts.length - 1]}`);
	}

	if (parts.length === 1) {
		const key = parts[0]!.toLowerCase();
		if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
			keys.push(key);
		} else if (key.length === 1) {
			keys.push(key);
		}
	}

	return keys;
}
