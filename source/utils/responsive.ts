import {useMemo} from 'react';
import {useTerminalSize} from '../hooks/useTerminalSize.ts';

// Breakpoints
export const BREAKPOINTS = {
	narrow: 80, // Small terminals
	medium: 100, // Standard terminals
	wide: 120, // Wide terminals
	xwide: 160, // Extra wide terminals
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

// Hook to get responsive values
export function useResponsive() {
	const {columns, rows} = useTerminalSize();

	const breakpoint: Breakpoint = useMemo(
		() =>
			columns >= BREAKPOINTS.xwide
				? 'xwide'
				: columns >= BREAKPOINTS.wide
					? 'wide'
					: columns >= BREAKPOINTS.medium
						? 'medium'
						: 'narrow',
		[columns],
	);

	return useMemo(
		() => ({
			columns,
			rows,
			breakpoint,
			// Width percentages as character counts
			getContentWidth: (percentage: number) =>
				Math.floor(columns * (percentage / 100)),
			// Responsive padding based on terminal size
			getPadding: () => (breakpoint === 'narrow' ? 0 : 1),
			// Truncate length based on terminal size
			getTruncateLength: (baseLength: number) => {
				const scale = Math.min(1, columns / 100);
				return Math.max(20, Math.floor(baseLength * scale));
			},
		}),
		[columns, rows, breakpoint],
	);
}
