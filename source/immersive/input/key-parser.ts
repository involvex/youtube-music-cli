export function parseKeyName(data: string): string | null {
	const codes: Record<string, string> = {
		'\x1B[A': 'up',
		'\x1B[B': 'down',
		'\x1B[C': 'right',
		'\x1B[D': 'left',
		'\x1B': 'escape',
	};

	if (codes[data]) {
		return codes[data]!;
	}

	if (data === ' ') {
		return ' ';
	}

	if (data === '\x03') {
		return 'Ctrl+C';
	}

	if (data === '\r' || data === '\n') {
		return 'enter';
	}

	if (data === '\x7F' || data === '\b') {
		return 'backspace';
	}

	if (data.length === 1 && data >= 'a' && data <= 'z') {
		return data;
	}

	if (data.length === 1 && data >= 'A' && data <= 'Z') {
		return data.toLowerCase();
	}

	if (data === '/' || data === '?') {
		return '/';
	}

	return null;
}
