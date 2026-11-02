/** Split a user mpv-extra-args string into argv tokens (supports quotes). */
export function parseMpvExtraArgs(input: string | undefined | null): string[] {
	if (!input) {
		return [];
	}

	const trimmed = input.trim();
	if (!trimmed) {
		return [];
	}

	const tokens: string[] = [];
	let current = '';
	let quote: '"' | "'" | null = null;

	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i]!;

		if (quote) {
			if (ch === quote) {
				quote = null;
			} else {
				current += ch;
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			quote = ch;
			continue;
		}

		if (/\s/.test(ch)) {
			if (current.length > 0) {
				tokens.push(current);
				current = '';
			}
			continue;
		}

		current += ch;
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

function isDeniedMpvExtraArg(arg: string): boolean {
	const lower = arg.toLowerCase();
	if (
		lower === '--input-ipc-server' ||
		lower.startsWith('--input-ipc-server=')
	) {
		return true;
	}

	if (lower === '--idle' || lower === '--idle=no' || lower === '--no-idle') {
		return true;
	}

	return false;
}

/**
 * Parse and filter user mpv extra args. Drops flags that would break YMC IPC.
 */
export function sanitizeMpvExtraArgs(input: string | undefined | null): {
	args: string[];
	stripped: string[];
} {
	const parsed = parseMpvExtraArgs(input);
	const args: string[] = [];
	const stripped: string[] = [];

	for (let i = 0; i < parsed.length; i++) {
		const arg = parsed[i]!;
		const lower = arg.toLowerCase();

		if (isDeniedMpvExtraArg(arg)) {
			stripped.push(arg);
			// Bare forms take a separate value token (`--idle no`, `--input-ipc-server PATH`).
			if (
				(lower === '--input-ipc-server' || lower === '--idle') &&
				i + 1 < parsed.length &&
				!parsed[i + 1]!.startsWith('-')
			) {
				stripped.push(parsed[i + 1]!);
				i++;
			}
			continue;
		}

		args.push(arg);
	}

	return {args, stripped};
}
