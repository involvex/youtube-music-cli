import process from 'node:process';
import {ANSI} from './ansi-codes.ts';
import type {FrameBuffer} from './frame-buffer.ts';
import type {BrailleCanvas} from './braille-canvas.ts';

export interface RenderConfig {
	terminalWidth: number;
	terminalHeight: number;
	targetFps: number;
}

export class RenderLoop {
	private frameBuffer: FrameBuffer;
	private config: RenderConfig;
	private running = false;
	private frameHandle: ReturnType<typeof setTimeout> | null = null;
	private lastFrameTime = 0;
	private frameCount = 0;
	private fps = 0;
	private lastFpsUpdate = 0;

	constructor(frameBuffer: FrameBuffer, config: Partial<RenderConfig> = {}) {
		this.frameBuffer = frameBuffer;
		this.config = {
			terminalWidth: config.terminalWidth ?? process.stdout.columns ?? 120,
			terminalHeight: config.terminalHeight ?? process.stdout.rows ?? 30,
			targetFps: config.targetFps ?? 30,
		};
	}

	start(onFrame?: (deltaTime: number) => void): void {
		if (this.running) return;

		this.running = true;
		this.lastFrameTime = performance.now();
		this.lastFpsUpdate = this.lastFrameTime;

		this.loop(onFrame);
	}

	stop(): void {
		this.running = false;
		if (this.frameHandle) {
			clearTimeout(this.frameHandle);
			this.frameHandle = null;
		}
	}

	private loop(onFrame?: (deltaTime: number) => void): void {
		if (!this.running) return;

		const now = performance.now();
		const deltaTime = now - this.lastFrameTime;
		this.lastFrameTime = now;
		this.frameCount++;

		if (now - this.lastFpsUpdate >= 1000) {
			this.fps = this.frameCount;
			this.frameCount = 0;
			this.lastFpsUpdate = now;
		}

		if (onFrame) {
			onFrame(deltaTime);
		}

		this.render();

		const frameDelay = Math.max(0, 1000 / this.config.targetFps - deltaTime);
		this.frameHandle = setTimeout(() => this.loop(onFrame), frameDelay);
	}

	private render(): void {
		const rows: string[] = new Array(this.frameBuffer.height);

		for (let y = 0; y < this.frameBuffer.height; y++) {
			let row = '';

			for (let x = 0; x < this.frameBuffer.width; x++) {
				const cell = this.frameBuffer.getCell(x, y);
				if (!cell) continue;

				let cellStr = '';

				if (cell.bg) {
					cellStr += ANSI.bg(cell.bg[0]!, cell.bg[1]!, cell.bg[2]!);
				}

				if (cell.fg) {
					cellStr += ANSI.fg(cell.fg[0]!, cell.fg[1]!, cell.fg[2]!);
				}

				if (cell.bold) {
					cellStr += ANSI.BOLD;
				}

				if (cell.dim) {
					cellStr += ANSI.DIM;
				}

				cellStr += cell.char + ANSI.RESET;
				row += cellStr;
			}

			rows[y] = row;
		}

		let output = ANSI.hideCursor + '\x1B[H';

		for (let y = 0; y < rows.length; y++) {
			output += rows[y] ?? '';
			if (y < rows.length - 1) {
				output += '\n';
			}
		}

		this.writeOutput(output);
	}

	private writeOutput(output: string): void {
		const bunRuntime = globalThis as {
			Bun?: {write: (fd: unknown, data: string) => void};
			stdout?: unknown;
		};
		if (bunRuntime.Bun?.write && bunRuntime.stdout) {
			bunRuntime.Bun.write(bunRuntime.stdout, output);
			return;
		}

		process.stdout.write(output);
	}

	getFps(): number {
		return this.fps;
	}

	updateConfig(config: Partial<RenderConfig>): void {
		this.config = {...this.config, ...config};
	}

	resize(
		width: number,
		height: number,
		FrameBufferClass: new (w: number, h: number) => FrameBuffer,
	): void {
		this.config.terminalWidth = width;
		this.config.terminalHeight = height;
		this.frameBuffer = new FrameBufferClass(width, height);
	}
}

import {hideCursor, showCursor} from '../native/console.ts';

export function createRenderLoop(
	width: number,
	height: number,
	FrameBufferClass: new (w: number, h: number) => FrameBuffer,
	BrailleCanvasClass: new (fb: FrameBuffer) => BrailleCanvas,
): {loop: RenderLoop; frameBuffer: FrameBuffer; canvas: BrailleCanvas} {
	const frameBuffer = new FrameBufferClass(width, height);
	const canvas = new BrailleCanvasClass(frameBuffer);
	const loop = new RenderLoop(frameBuffer);

	return {loop, frameBuffer, canvas};
}

export async function withAltBuffer<T>(fn: () => T): Promise<T> {
	process.stdout.write(ANSI.enterAltBuffer);
	hideCursor();
	try {
		return fn();
	} finally {
		process.stdout.write(ANSI.exitAltBuffer);
		showCursor();
	}
}

export class InteractiveRenderLoop extends RenderLoop {
	private onInput?: (key: string) => void;
	private originalRawMode: boolean | null = null;

	constructor(frameBuffer: FrameBuffer, config: Partial<RenderConfig> = {}) {
		super(frameBuffer, config);
	}

	enableInput(handler: (key: string) => void): void {
		this.onInput = handler;
		this.setupInput();
	}

	disableInput(): void {
		this.onInput = undefined;
	}

	private setupInput(): void {
		if (!process.stdin.isTTY) return;

		this.originalRawMode = process.stdin.isRaw;
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');

		const handleInput = (data: string): void => {
			if (this.onInput) {
				this.onInput(data);
			}
		};

		process.stdin.on('data', handleInput);

		process.on('exit', () => {
			if (this.originalRawMode !== null) {
				process.stdin.setRawMode(this.originalRawMode);
			}
			showCursor();
		});
	}
}
