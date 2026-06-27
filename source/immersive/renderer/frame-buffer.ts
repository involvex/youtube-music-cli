import type {RGB} from './ansi-codes.ts';

export type Cell = {
	char: string;
	fg: RGB | null;
	bg: RGB | null;
	bold?: boolean;
	dim?: boolean;
	italic?: boolean;
	underline?: boolean;
};

export class FrameBuffer {
	width: number;
	height: number;
	cells: Cell[][];

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.cells = Array.from({length: height}, () =>
			Array.from({length: width}, () => ({
				char: ' ',
				fg: null,
				bg: null,
			})),
		);
	}

	clear(): void {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				this.cells[y]![x] = {char: ' ', fg: null, bg: null};
			}
		}
	}

	setCell(x: number, y: number, cell: Cell): void {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.cells[y]![x] = cell;
		}
	}

	getCell(x: number, y: number): Cell | null {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			return this.cells[y]![x] ?? null;
		}
		return null;
	}

	setText(
		x: number,
		y: number,
		text: string,
		fg?: RGB | null,
		bg?: RGB | null,
		options?: {bold?: boolean; dim?: boolean},
	): void {
		for (let i = 0; i < text.length; i++) {
			this.setCell(x + i, y, {
				char: text[i] ?? ' ',
				fg: fg ?? null,
				bg: bg ?? null,
				bold: options?.bold,
				dim: options?.dim,
			});
		}
	}

	drawRect(
		x: number,
		y: number,
		width: number,
		height: number,
		borderColor: RGB | null,
		fillColor: RGB | null,
		borderStyle: 'single' | 'double' | 'round' = 'single',
	): void {
		const singleChars = {
			topLeft: '┌',
			topRight: '┐',
			bottomLeft: '└',
			bottomRight: '┘',
			horizontal: '─',
			vertical: '│',
		};
		const doubleChars = {
			topLeft: '+',
			topRight: '+',
			bottomLeft: '+',
			bottomRight: '+',
			horizontal: '=',
			vertical: '#',
		};
		const roundChars = {
			topLeft: '(',
			topRight: ')',
			bottomLeft: '(',
			bottomRight: ')',
			horizontal: '-',
			vertical: '|',
		};

		const chars =
			borderStyle === 'double'
				? doubleChars
				: borderStyle === 'round'
					? roundChars
					: singleChars;

		for (let dy = 0; dy < height; dy++) {
			for (let dx = 0; dx < width; dx++) {
				let char = ' ';

				if (dy === 0 && dx === 0) {
					char = chars.topLeft;
				} else if (dy === 0 && dx === width - 1) {
					char = chars.topRight;
				} else if (dy === height - 1 && dx === 0) {
					char = chars.bottomLeft;
				} else if (dy === height - 1 && dx === width - 1) {
					char = chars.bottomRight;
				} else if (dy === 0 || dy === height - 1) {
					char = chars.horizontal;
				} else if (dx === 0 || dx === width - 1) {
					char = chars.vertical;
				}

				const isBorder =
					dy === 0 || dy === height - 1 || dx === 0 || dx === width - 1;

				this.setCell(x + dx, y + dy, {
					char,
					fg: isBorder ? borderColor : null,
					bg: isBorder ? null : fillColor,
				});
			}
		}
	}

	verticalGradient(
		x: number,
		y: number,
		width: number,
		height: number,
		topColor: RGB,
		bottomColor: RGB,
	): void {
		for (let dy = 0; dy < height; dy++) {
			const t = dy / Math.max(1, height - 1);
			const r = Math.round(topColor[0] * (1 - t) + bottomColor[0] * t);
			const g = Math.round(topColor[1] * (1 - t) + bottomColor[1] * t);
			const b = Math.round(topColor[2] * (1 - t) + bottomColor[2] * t);

			for (let dx = 0; dx < width; dx++) {
				this.setCell(x + dx, y + dy, {
					char: ' ',
					fg: null,
					bg: [r, g, b],
				});
			}
		}
	}

	horizontalGradient(
		x: number,
		y: number,
		width: number,
		height: number,
		leftColor: RGB,
		rightColor: RGB,
	): void {
		for (let dx = 0; dx < width; dx++) {
			const t = dx / Math.max(1, width - 1);
			const r = Math.round(leftColor[0] * (1 - t) + rightColor[0] * t);
			const g = Math.round(leftColor[1] * (1 - t) + rightColor[1] * t);
			const b = Math.round(leftColor[2] * (1 - t) + rightColor[2] * t);

			for (let dy = 0; dy < height; dy++) {
				this.setCell(x + dx, y + dy, {
					char: ' ',
					fg: null,
					bg: [r, g, b],
				});
			}
		}
	}
}
