/**
 * Accumulates mpv IPC socket chunks into newline-delimited JSON lines.
 */
export function drainMpvIpcLines(
	buffer: string,
	chunk: string,
): {remainder: string; lines: string[]} {
	let remainder = buffer + chunk;
	const lines: string[] = [];
	let newlineIndex = remainder.indexOf('\n');
	while (newlineIndex !== -1) {
		const line = remainder.slice(0, newlineIndex);
		remainder = remainder.slice(newlineIndex + 1);
		if (line.trim().length > 0) {
			lines.push(line);
		}
		newlineIndex = remainder.indexOf('\n');
	}
	return {remainder, lines};
}
