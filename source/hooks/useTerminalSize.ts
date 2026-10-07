import {useWindowSize} from 'ink';

export function useTerminalSize(): {columns: number; rows: number} {
	const {columns, rows} = useWindowSize();

	return {columns, rows};
}
