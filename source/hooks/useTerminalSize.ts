import useStdoutDimensions from 'ink-use-stdout-dimensions';

export function useTerminalSize() {
	const [columns, rows] = useStdoutDimensions();
	return {columns, rows};
}
