import process from 'node:process';
import type {FrameBuffer} from './renderer/frame-buffer.ts';
import type {BrailleCanvas} from './renderer/braille-canvas.ts';
import {RenderLoop} from './renderer/render-loop.ts';
import {AudioCollector} from './visualizer/audio-collector.ts';
import {DiscoEngine} from './visualizer/disco-engine.ts';
import {DiscoParticleSystem} from './effects/particle-system.ts';
import {
	getTerminalInfo,
	clearScreen,
	hideCursor,
	showCursor,
	enterAltBuffer,
	exitAltBuffer,
} from './native/console.ts';
import {createTrayIcon, removeTrayIcon} from './native/tray.ts';
import type {RGB} from './renderer/ansi-codes.ts';

export interface ImmersiveOptions {
	width?: number;
	height?: number;
	targetFps?: number;
	showAlbumArt?: boolean;
	discoMode?: boolean;
	enableTray?: boolean;
	enableNotifications?: boolean;
	trackInfo?: {
		title: string;
		artist: string;
		album?: string;
		artwork?: string;
	};
	onTogglePlay?: () => void;
	onToggleDisco?: () => void;
	onVolumeUp?: () => void;
	onVolumeDown?: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
}

interface PlayerState {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isDiscoMode: boolean;
}

export class ImmersiveEngine {
	private frameBuffer: FrameBuffer | null = null;
	private canvas: BrailleCanvas | null = null;
	private renderLoop: RenderLoop | null = null;
	private audioCollector: AudioCollector | null = null;
	private discoEngine: DiscoEngine | null = null;
	private particleSystem: DiscoParticleSystem | null = null;

	private state: PlayerState;
	private options: ImmersiveOptions;
	private callbacks: ImmersiveOptions;
	private effectiveWidth: number;
	private effectiveHeight: number;
	private isRunning = false;
	private inputHandler: ((data: string) => void) | null = null;
	private exitHandler: (() => void) | null = null;
	private listenersRemoved = false;

	constructor(options: ImmersiveOptions) {
		this.options = options;
		this.callbacks = {
			onTogglePlay: options.onTogglePlay,
			onToggleDisco: options.onToggleDisco,
			onVolumeUp: options.onVolumeUp,
			onVolumeDown: options.onVolumeDown,
			onNext: options.onNext,
			onPrevious: options.onPrevious,
		};

		const terminalInfo = getTerminalInfo();
		this.effectiveWidth = options.width ?? terminalInfo.width;
		this.effectiveHeight = options.height ?? terminalInfo.height;

		this.state = {
			isPlaying: true,
			currentTime: 0,
			duration: 0,
			volume: 1,
			isDiscoMode: options.discoMode ?? false,
		};
	}

	async start(): Promise<void> {
		if (this.isRunning) return;
		this.isRunning = true;
		this.listenersRemoved = false;

		if (process.platform !== 'win32') {
			console.error('Immersive mode is only supported on Windows.');
			process.exit(1);
		}

		enterAltBuffer();
		hideCursor();
		clearScreen();

		let Fb: typeof import('./renderer/frame-buffer.ts').FrameBuffer;
		let Bc: typeof import('./renderer/braille-canvas.ts').BrailleCanvas;
		let Rl: typeof import('./renderer/render-loop.ts').RenderLoop;
		let Ac: typeof import('./visualizer/audio-collector.ts').AudioCollector;
		let De: typeof import('./visualizer/disco-engine.ts').DiscoEngine;
		let Dps: typeof import('./effects/particle-system.ts').DiscoParticleSystem;

		try {
			const frameBufferModule = await import('./renderer/frame-buffer.ts');
			const brailleCanvasModule = await import('./renderer/braille-canvas.ts');
			const renderLoopModule = await import('./renderer/render-loop.ts');
			const audioCollectorModule =
				await import('./visualizer/audio-collector.ts');
			const discoEngineModule = await import('./visualizer/disco-engine.ts');
			const particleSystemModule = await import('./effects/particle-system.ts');

			Fb = frameBufferModule.FrameBuffer;
			Bc = brailleCanvasModule.BrailleCanvas;
			Rl = renderLoopModule.RenderLoop;
			Ac = audioCollectorModule.AudioCollector;
			De = discoEngineModule.DiscoEngine;
			Dps = particleSystemModule.DiscoParticleSystem;
		} catch (error) {
			this.isRunning = false;
			showCursor();
			exitAltBuffer();
			console.error(
				`Failed to load immersive mode modules: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}

		const fb = new Fb(this.effectiveWidth, this.effectiveHeight);
		const canvas = new Bc(fb);
		const loop = new Rl(fb, {targetFps: this.options.targetFps ?? 30});
		const audio = new Ac(256);
		const disco = new De({enabled: this.state.isDiscoMode});
		const particles = new Dps({
			spawnRate: 10,
			colors: [
				[255, 100, 100],
				[100, 255, 100],
				[100, 100, 255],
				[255, 255, 100],
				[255, 100, 255],
				[100, 255, 255],
			],
		});

		this.frameBuffer = fb;
		this.canvas = canvas;
		this.renderLoop = loop;
		this.audioCollector = audio;
		this.discoEngine = disco;
		this.particleSystem = particles;

		if (this.options.enableTray && this.options.trackInfo) {
			createTrayIcon({
				id: 'youtube-music-cli',
				icon: '',
				tooltip: `${this.options.trackInfo.title} - ${this.options.trackInfo.artist}`,
			});
		}

		this.setupInput();

		loop.start(deltaTime => {
			if (!fb || !canvas || !audio || !disco || !particles) return;

			const {width: tw, height: th} = getTerminalInfo();

			if (tw !== this.effectiveWidth || th !== this.effectiveHeight) {
				this.effectiveWidth = tw;
				this.effectiveHeight = th;
				fb.width = tw;
				fb.height = th;
				fb.cells = Array.from({length: th}, () =>
					Array.from({length: tw}, () => ({
						char: ' ',
						fg: null,
						bg: null,
					})),
				);
			}

			particles.update(deltaTime);

			const time = performance.now();
			const simulatedAudio = audio.generateSimulatedData(time);
			const bands = audio.getFrequencyBands(simulatedAudio);

			disco.update(deltaTime);
			const {background, accent, intensity} = disco.processAudio(bands);

			fb.clear();

			renderBackground(fb, tw, th, background, accent, intensity);
			renderVisualizer(fb, canvas, audio, tw, th, accent, intensity);
			renderTrackInfo(fb, tw, th, this.options.trackInfo, this.state);
			renderControls(fb, tw, th);

			if (this.state.isDiscoMode) {
				for (const particle of particles.getParticles()) {
					const screenX = (particle.x / 100) * tw;
					const screenY = (particle.y / 100) * th;
					canvas.setPixel(
						Math.floor(screenX),
						Math.floor(screenY),
						particle.color,
					);
				}

				if (intensity > 0.7) {
					particles.spawnBurst(
						tw / 2,
						th - 5,
						Math.floor(intensity * 5),
						accent,
					);
				}
			}
		});
	}

	private setupInput(): void {
		if (!process.stdin.isTTY || this.inputHandler) return;

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');

		this.inputHandler = (data: string): void => {
			const keyName = parseKeyName(data);
			if (!keyName) return;

			if (keyName === 'Ctrl+C') {
				this.stop();
				process.exit(0);
				return;
			}

			switch (keyName) {
				case ' ':
					this.state.isPlaying = !this.state.isPlaying;
					this.callbacks.onTogglePlay?.();
					break;
				case 'd':
				case 'D':
					this.state.isDiscoMode = !this.state.isDiscoMode;
					this.callbacks.onToggleDisco?.();
					break;
				case 'up':
					this.state.volume = Math.min(1, this.state.volume + 0.1);
					this.callbacks.onVolumeUp?.();
					break;
				case 'down':
					this.state.volume = Math.max(0, this.state.volume - 0.1);
					this.callbacks.onVolumeDown?.();
					break;
				case 'right':
					this.callbacks.onNext?.();
					break;
				case 'left':
					this.callbacks.onPrevious?.();
					break;
				case 'q':
				case 'Q':
				case 'escape':
					process.exit(0);
					break;
			}
		};

		process.stdin.on('data', this.inputHandler);

		if (!this.exitHandler) {
			this.exitHandler = () => {
				this.stop();
			};
			process.on('exit', this.exitHandler);
		}
	}

	stop(): void {
		if (this.isRunning) {
			this.isRunning = false;
			this.renderLoop?.stop();
			this.renderLoop = null;
			this.frameBuffer = null;
			this.canvas = null;

			if (this.inputHandler && !this.listenersRemoved) {
				process.stdin.off('data', this.inputHandler);
				this.listenersRemoved = true;
			}

			showCursor();
			exitAltBuffer();

			if (this.options.enableTray) {
				removeTrayIcon();
			}
		}
	}
}

function parseKeyName(data: string): string | null {
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

	if (data.length === 1 && data >= 'a' && data <= 'z') {
		return data.toLowerCase();
	}

	if (data.length === 1 && data >= 'A' && data <= 'Z') {
		return data.toLowerCase();
	}

	if (data === 'q' || data === 'Q') {
		return 'q';
	}

	if (data === 'd' || data === 'D') {
		return 'd';
	}

	return null;
}

function renderBackground(
	fb: FrameBuffer,
	_width: number,
	_height: number,
	_background: RGB,
	_accent: RGB,
	_intensity: number,
): void {
	fb.verticalGradient(0, 0, _width, _height, _background, [
		Math.round((_background[0] ?? 0) * 0.5),
		Math.round((_background[1] ?? 0) * 0.5),
		Math.round((_background[2] ?? 0) * 0.5),
	]);

	const barCount = 5;
	const barWidth = Math.floor(_width / barCount) - 2;

	for (let i = 0; i < barCount; i++) {
		const x = i * (barWidth + 2) + 1;
		const barHeight = Math.floor(2 + Math.random() * 4 * _intensity);

		fb.drawRect(x, 0, barWidth, barHeight + 2, _accent, null, 'round');
	}
}

function renderVisualizer(
	_fb: FrameBuffer,
	_canvas: BrailleCanvas,
	_audio: AudioCollector,
	_width: number,
	_height: number,
	_accent: RGB,
	_intensity: number,
): void {
	const vizHeight = Math.floor(_height * 0.4);
	const vizY = Math.floor(_height * 0.3);

	const time = performance.now();
	const data = _audio.generateSimulatedData(time);
	const bands = _audio.getFrequencyBands(data);

	const barCount = 20;
	const barWidth = Math.floor(_width / barCount) - 1;

	for (let i = 0; i < barCount; i++) {
		const freqIndex = Math.floor((i / barCount) * data.length);
		const value = data[freqIndex] ?? 0;
		const barHeight = Math.floor(value * vizHeight);

		const hue = (i / barCount) * 60 + bands.bass * 30;
		const color: RGB = hslToRgb(hue / 360, 0.8, 0.5 + _intensity * 0.2);

		_canvas.drawRect(
			i * (barWidth + 1) + Math.floor((_width - barCount * (barWidth + 1)) / 2),
			vizY + vizHeight - barHeight,
			barWidth,
			barHeight,
			color,
			true,
		);
	}
}

function renderTrackInfo(
	_fb: FrameBuffer,
	_width: number,
	_height: number,
	_trackInfo?: {
		title: string;
		artist: string;
		album?: string;
		artwork?: string;
	},
	_state?: PlayerState,
): void {
	if (!_trackInfo) return;

	const infoY = Math.floor(_height * 0.7);

	const truncatedTitle = truncateText(_trackInfo.title, _width - 4);
	const truncatedArtist = truncateText(_trackInfo.artist, _width - 4);

	_fb.setText(
		Math.floor((_width - truncatedTitle.length) / 2),
		infoY,
		truncatedTitle,
		null,
		null,
		{bold: true},
	);
	_fb.setText(
		Math.floor((_width - truncatedArtist.length) / 2),
		infoY + 1,
		truncatedArtist,
		null,
		null,
		{dim: true},
	);

	if (_state) {
		const statusText = _state.isPlaying ? '[ PLAYING ]' : '[ PAUSED ]';
		_fb.setText(
			Math.floor((_width - statusText.length) / 2),
			infoY + 3,
			statusText,
			null,
			null,
			{bold: true},
		);
	}
}

function renderControls(
	_fb: FrameBuffer,
	_width: number,
	_height: number,
): void {
	const controlsY = _height - 3;

	const controls = [
		'[←] Prev',
		'[SPACE] Play/Pause',
		'[D] Disco',
		'[↑↓] Volume',
		'[→] Next',
		'[Q] Quit',
	];

	let x = 2;
	for (const control of controls) {
		_fb.setText(x, controlsY, control, null, null, {dim: true});
		x += control.length + 2;
	}
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + '...';
}

function hslToRgb(h: number, s: number, l: number): RGB {
	let r: number;
	let g: number;
	let b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p: number, q: number, t: number): number => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
