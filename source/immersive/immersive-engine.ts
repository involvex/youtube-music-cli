import process from 'node:process';
import type {FrameBuffer} from './renderer/frame-buffer.ts';
import type {BrailleCanvas} from './renderer/braille-canvas.ts';
import {RenderLoop} from './renderer/render-loop.ts';
import {AudioCollector} from './visualizer/audio-collector.ts';
import {DiscoEngine} from './visualizer/disco-engine.ts';
import {DiscoParticleSystem} from './effects/particle-system.ts';
import {HybridAudioSource} from './visualizer/hybrid-audio.ts';
import {
	getTerminalInfo,
	clearScreen,
	hideCursor,
	showCursor,
	enterAltBuffer,
	exitAltBuffer,
	enableDpiAwareness,
	onTerminalResize,
} from './native/console.ts';
import {createTrayIcon, removeTrayIcon, updateTrayIcon} from './native/tray.ts';
import type {RGB} from './renderer/ansi-codes.ts';
import type {Track} from '../types/youtube-music.types.ts';
import {parseKeyName} from './input/key-parser.ts';
import {
	closeSearchOverlay,
	createSearchOverlayState,
	handleSearchInput,
	openSearchOverlay,
	type SearchOverlayState,
} from './ui/search-overlay.ts';
import {
	getUpcomingTracks,
	trackArtists,
	type ImmersivePlayerState,
} from './state/queue-state.ts';
import {
	buildProgressBar,
	buildVolumeBar,
	computeLayout,
	type ImmersiveLayout,
} from './ui/layout.ts';

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
	getState?: () => ImmersivePlayerState;
	onTogglePlay?: () => void;
	onToggleDisco?: () => void;
	onVolumeUp?: () => void;
	onVolumeDown?: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
	onSearch?: (
		query: string,
	) => Promise<{tracks: Track[]; message: string | null}>;
	onSearchPlay?: (tracks: Track[]) => Promise<void>;
	onAddToQueue?: (track: Track) => void;
}

export class ImmersiveEngine {
	private frameBuffer: FrameBuffer | null = null;
	private canvas: BrailleCanvas | null = null;
	private renderLoop: RenderLoop | null = null;
	private audioCollector: AudioCollector | null = null;
	private hybridAudio: HybridAudioSource | null = null;
	private discoEngine: DiscoEngine | null = null;
	private particleSystem: DiscoParticleSystem | null = null;
	private searchOverlay: SearchOverlayState = createSearchOverlayState();
	private lastSearchResults: Track[] = [];

	private options: ImmersiveOptions;
	private effectiveWidth: number;
	private effectiveHeight: number;
	private isRunning = false;
	private inputHandler: ((data: string) => void) | null = null;
	private exitHandler: (() => void) | null = null;
	private resizeHandler: (() => void) | null = null;
	private listenersRemoved = false;

	constructor(options: ImmersiveOptions) {
		this.options = options;

		enableDpiAwareness();
		const terminalInfo = getTerminalInfo();
		this.effectiveWidth = options.width ?? terminalInfo.width;
		this.effectiveHeight = options.height ?? terminalInfo.height;
	}

	setDiscoMode(enabled: boolean): void {
		this.discoEngine?.setEnabled(enabled);
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

		const state = this.options.getState?.();
		const fb = new Fb(this.effectiveWidth, this.effectiveHeight);
		const canvas = new Bc(fb);
		const loop = new Rl(fb, {targetFps: this.options.targetFps ?? 30});
		const audio = new Ac(256);
		const hybrid = new HybridAudioSource(audio.getFrequencyBinCount());
		const disco = new De({
			enabled: state?.isDiscoMode ?? this.options.discoMode,
		});
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
		this.hybridAudio = hybrid;
		this.discoEngine = disco;
		this.particleSystem = particles;

		if (this.options.enableTray) {
			const trackInfo = this.resolveTrackInfo(state);
			createTrayIcon({
				id: 'youtube-music-cli',
				icon: '',
				tooltip: trackInfo
					? `${trackInfo.title} - ${trackInfo.artist}`
					: 'YouTube Music CLI',
			});
		}

		this.setupInput();
		this.setupResize(fb);

		loop.start(deltaTime => {
			if (!fb || !canvas || !audio || !disco || !particles || !hybrid) return;

			const playerState = this.options.getState?.();
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
				canvas.resize(tw, th);
			}

			particles.update(deltaTime);

			if (playerState) {
				hybrid.update(
					{
						currentTime: playerState.currentTime,
						duration: playerState.duration,
						isPlaying: playerState.isPlaying,
						volume: playerState.volume,
					},
					deltaTime,
				);
			}

			const rawAudio = hybrid.generateSamples();
			const bands = audio.getFrequencyBands(audio.processAudioData(rawAudio));

			disco.update(deltaTime);
			const {background, accent, intensity} = disco.processAudio(bands);

			fb.clear();
			canvas.clearMask();

			const layout = computeLayout(tw, th);
			const accentColor: RGB = accent;

			renderBackground(fb, tw, th, background, accentColor, intensity);
			renderHeader(fb, tw, layout, playerState, accentColor);
			renderVisualizerFrame(fb, layout, accentColor);
			renderVisualizer(
				canvas,
				audio,
				rawAudio,
				layout,
				accentColor,
				intensity,
				playerState?.isPlaying ?? false,
			);
			renderNowPlaying(fb, layout, playerState, accentColor);
			renderQueuePanel(fb, layout, playerState, accentColor);
			renderControls(fb, tw, th, this.searchOverlay.active);
			renderSearchOverlay(fb, tw, th, this.searchOverlay);

			const isDisco =
				playerState?.isDiscoMode ?? this.options.discoMode ?? false;
			if (isDisco) {
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

	private resolveTrackInfo(state?: ImmersivePlayerState): {
		title: string;
		artist: string;
	} | null {
		if (state?.currentTrack) {
			return {
				title: state.currentTrack.title,
				artist: trackArtists(state.currentTrack),
			};
		}

		if (this.options.trackInfo) {
			return {
				title: this.options.trackInfo.title,
				artist: this.options.trackInfo.artist,
			};
		}

		return null;
	}

	private setupResize(fb: FrameBuffer): void {
		this.resizeHandler = () => {
			const {width, height} = getTerminalInfo();
			this.effectiveWidth = width;
			this.effectiveHeight = height;
			fb.width = width;
			fb.height = height;
			fb.cells = Array.from({length: height}, () =>
				Array.from({length: width}, () => ({
					char: ' ',
					fg: null,
					bg: null,
				})),
			);
			this.canvas?.resize(width, height);
		};
		onTerminalResize(this.resizeHandler);
	}

	private setupInput(): void {
		if (!process.stdin.isTTY || this.inputHandler) return;

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');

		this.inputHandler = (data: string): void => {
			const keyName = parseKeyName(data);
			if (!keyName) return;

			if (this.searchOverlay.active) {
				void this.handleSearchKey(keyName);
				return;
			}

			if (keyName === 'Ctrl+C') {
				this.stop();
				process.exit(0);
				return;
			}

			switch (keyName) {
				case ' ':
					this.options.onTogglePlay?.();
					break;
				case 'd':
					this.options.onToggleDisco?.();
					break;
				case 'up':
					this.options.onVolumeUp?.();
					break;
				case 'down':
					this.options.onVolumeDown?.();
					break;
				case 'right':
					this.options.onNext?.();
					break;
				case 'left':
					this.options.onPrevious?.();
					break;
				case '/':
				case 's':
					openSearchOverlay(this.searchOverlay);
					break;
				case 'a':
					if (this.lastSearchResults[0]) {
						this.options.onAddToQueue?.(this.lastSearchResults[0]);
					}
					break;
				case 'q':
				case 'escape':
					this.stop();
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

	private async handleSearchKey(key: string): Promise<void> {
		const action = handleSearchInput(this.searchOverlay, key);
		if (action === 'cancel') {
			return;
		}

		if (action !== 'submit' || !this.options.onSearch) {
			return;
		}

		const query = this.searchOverlay.query.trim();
		this.searchOverlay.status = 'Searching...';

		try {
			const result = await this.options.onSearch(query);
			this.lastSearchResults = result.tracks;

			if (result.tracks.length === 0) {
				this.searchOverlay.status = result.message ?? 'No tracks found';
				return;
			}

			if (this.options.onSearchPlay) {
				await this.options.onSearchPlay(result.tracks);
			}

			const track = result.tracks[0];
			if (track && this.options.enableTray) {
				updateTrayIcon(`${track.title} - ${trackArtists(track)}`);
			}

			closeSearchOverlay(this.searchOverlay);
		} catch (error) {
			this.searchOverlay.status =
				error instanceof Error ? error.message : 'Search failed';
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

			if (this.resizeHandler) {
				process.stdout.off('resize', this.resizeHandler);
				this.resizeHandler = null;
			}

			showCursor();
			exitAltBuffer();

			if (this.options.enableTray) {
				removeTrayIcon();
			}
		}
	}
}

function renderBackground(
	fb: FrameBuffer,
	width: number,
	height: number,
	background: RGB,
	accent: RGB,
	intensity: number,
): void {
	const top: RGB = [
		Math.round((background[0] ?? 0) * 0.35),
		Math.round((background[1] ?? 0) * 0.35),
		Math.round((background[2] ?? 0) * 0.35),
	];
	const bottom: RGB = [
		Math.round((background[0] ?? 0) * 0.12),
		Math.round((background[1] ?? 0) * 0.12),
		Math.round((background[2] ?? 0) * 0.12),
	];

	fb.verticalGradient(0, 0, width, height, top, bottom);

	if (intensity > 0.35) {
		const glowY = Math.floor(height * 0.15);
		const glowW = Math.floor(width * (0.2 + intensity * 0.3));
		const glowX = Math.floor((width - glowW) / 2);
		fb.horizontalGradient(
			glowX,
			glowY,
			glowW,
			1,
			[0, 0, 0],
			[
				Math.round(accent[0] * intensity),
				Math.round(accent[1] * intensity),
				Math.round(accent[2] * intensity),
			],
		);
	}
}

function renderHeader(
	fb: FrameBuffer,
	width: number,
	layout: ImmersiveLayout,
	state: ImmersivePlayerState | undefined,
	accent: RGB,
): void {
	const title = '♫  YOUTUBE MUSIC';
	fb.setText(2, layout.headerY, title, accent, null, {bold: true});

	if (state?.currentTrack && state.queue.length > 0) {
		const position = `Track ${state.queueIndex + 1}/${state.queue.length}`;
		fb.setText(
			Math.max(2, width - position.length - 2),
			layout.headerY,
			position,
			null,
			null,
			{dim: true},
		);
	}

	const lineY = layout.headerY + 1;
	fb.setText(1, lineY, '─'.repeat(Math.max(0, width - 2)), null, null, {
		dim: true,
	});
}

function renderVisualizerFrame(
	fb: FrameBuffer,
	layout: ImmersiveLayout,
	accent: RGB,
): void {
	fb.drawRect(
		layout.vizX,
		layout.vizY,
		layout.vizW,
		layout.vizH,
		accent,
		null,
		'single',
	);

	const label = ' SPECTRUM ';
	const labelX = layout.vizX + 2;
	if (labelX + label.length < layout.vizX + layout.vizW - 1) {
		fb.setText(labelX, layout.vizY, label, accent, null, {dim: true});
	}
}

function renderVisualizer(
	canvas: BrailleCanvas,
	audio: AudioCollector,
	data: Float32Array,
	layout: ImmersiveLayout,
	accent: RGB,
	intensity: number,
	isPlaying: boolean,
): void {
	const padX = 2;
	const padY = 1;
	const innerW = Math.max(4, layout.vizW - padX * 2);
	const innerH = Math.max(3, layout.vizH - padY * 2);

	const originX = (layout.vizX + padX) * 2;
	const originY = (layout.vizY + padY) * 4;
	const pixelW = innerW * 2;
	const pixelH = innerH * 4;

	const barCount = Math.min(40, Math.max(12, Math.floor(innerW / 2)));
	const gap = 1;
	const barWidthPx = Math.max(
		2,
		Math.floor((pixelW - gap * (barCount - 1)) / barCount),
	);
	const bands = audio.getFrequencyBands(data);
	const idleFloor = isPlaying ? 0.06 : 0.12;

	for (let i = 0; i < barCount; i++) {
		const freqIndex = Math.floor((i / barCount) * data.length);
		const value = Math.max(idleFloor, data[freqIndex] ?? idleFloor);
		const barHeightPx = Math.max(
			4,
			Math.floor(value * pixelH * (isPlaying ? 0.92 : 0.55)),
		);

		const hue = (i / barCount) * 50 + bands.bass * 40 + intensity * 20;
		const color: RGB = hslToRgb(hue / 360, 0.75, 0.45 + intensity * 0.25);

		const x =
			originX +
			i * (barWidthPx + gap) +
			Math.floor((pixelW - barCount * (barWidthPx + gap)) / 2);
		const y = originY + pixelH - barHeightPx;

		canvas.drawRect(x, y, barWidthPx, barHeightPx, color, true);

		if (barHeightPx > 8) {
			const peakColor: RGB = [
				Math.min(255, color[0] + 40),
				Math.min(255, color[1] + 40),
				Math.min(255, color[2] + 40),
			];
			canvas.drawRect(x, y, barWidthPx, 2, peakColor, true);
		}
	}

	if (!isPlaying) {
		const centerX = originX + Math.floor(pixelW / 2);
		const centerY = originY + Math.floor(pixelH / 2);
		canvas.drawCircle(centerX, centerY, 6, accent, false);
		canvas.drawRect(centerX - 2, centerY - 4, 2, 8, accent, true);
		canvas.drawRect(centerX + 1, centerY - 4, 2, 8, accent, true);
	}
}

function renderNowPlaying(
	fb: FrameBuffer,
	layout: ImmersiveLayout,
	state: ImmersivePlayerState | undefined,
	accent: RGB,
): void {
	fb.drawRect(
		layout.nowPlayingX,
		layout.nowPlayingY,
		layout.nowPlayingW,
		layout.nowPlayingH,
		accent,
		null,
		'single',
	);

	const innerX = layout.nowPlayingX + 2;
	let y = layout.nowPlayingY + 1;

	if (!state?.currentTrack) {
		const idleText = 'Press / to search  •  Space to play';
		fb.setText(innerX, y + 2, idleText, null, null, {dim: true});
		return;
	}

	const maxTextW = layout.nowPlayingW - 4;
	const title = truncateText(state.currentTrack.title, maxTextW);
	const artist = truncateText(trackArtists(state.currentTrack), maxTextW);

	fb.setText(innerX, y, 'NOW PLAYING', accent, null, {dim: true});
	y += 1;
	fb.setText(innerX, y, title, null, null, {bold: true});
	y += 1;
	fb.setText(innerX, y, artist, null, null, {dim: true});
	y += 1;

	const statusText = state.isPlaying ? '▶  PLAYING' : '⏸  PAUSED';
	fb.setText(innerX, y, statusText, accent, null, {bold: true});
	y += 1;

	const duration = resolveDuration(state);
	const progressW = Math.max(10, layout.nowPlayingW - 4);
	const ratio = duration > 0 ? state.currentTime / duration : 0;
	const {bar} = buildProgressBar(ratio, progressW);
	fb.setText(innerX, y, bar, null, null);
	y += 1;

	if (duration > 0) {
		const timeText = `${formatTime(state.currentTime)} / ${formatTime(duration)}`;
		fb.setText(innerX, y, timeText, null, null, {dim: true});
	} else {
		fb.setText(innerX, y, 'Press Space to start playback', null, null, {
			dim: true,
		});
	}
	y += 1;

	const volBarW = Math.min(16, progressW - 10);
	const volumeLine = `Vol ${buildVolumeBar(state.volume, volBarW)} ${Math.round(state.volume)}%`;
	fb.setText(innerX, y, truncateText(volumeLine, maxTextW), null, null, {
		dim: true,
	});
}

function renderQueuePanel(
	fb: FrameBuffer,
	layout: ImmersiveLayout,
	state: ImmersivePlayerState | undefined,
	accent: RGB,
): void {
	if (!state || state.queue.length === 0) {
		return;
	}

	fb.drawRect(
		layout.queueX,
		layout.queueY,
		layout.queueW,
		layout.queueH,
		accent,
		null,
		'single',
	);

	const innerX = layout.queueX + 2;
	let y = layout.queueY + 1;
	fb.setText(innerX, y, 'UP NEXT', accent, null, {bold: true});
	y += 1;

	const maxLines = Math.max(1, layout.queueH - 3);
	const upcoming = getUpcomingTracks(state, maxLines);
	for (let i = 0; i < upcoming.length; i++) {
		const track = upcoming[i];
		if (!track) continue;
		const line = truncateText(`${i + 1}. ${track.title}`, layout.queueW - 4);
		fb.setText(innerX, y + i, line, null, null, {dim: true});
	}
}

function resolveDuration(state: ImmersivePlayerState): number {
	if (state.duration > 0) {
		return state.duration;
	}
	return state.currentTrack?.duration ?? 0;
}

function renderControls(
	fb: FrameBuffer,
	width: number,
	height: number,
	searchActive: boolean,
): void {
	const separatorY = height - 3;
	fb.setText(1, separatorY, '─'.repeat(Math.max(0, width - 2)), null, null, {
		dim: true,
	});

	const controlsY = height - 2;
	const controls = searchActive
		? '[Enter] Search   [Esc] Cancel   [Backspace] Delete'
		: '[←→] Track   [Space] Play/Pause   [↑↓] Volume   [D] Disco   [/] Search   [Q] Quit';

	const x = Math.max(2, Math.floor((width - controls.length) / 2));
	fb.setText(x, controlsY, truncateText(controls, width - 4), null, null, {
		dim: true,
	});
}

function renderSearchOverlay(
	fb: FrameBuffer,
	width: number,
	height: number,
	overlay: SearchOverlayState,
): void {
	if (!overlay.active) {
		return;
	}

	const boxY = height - 6;
	const prompt = `Search: ${overlay.query}_`;
	fb.setText(2, boxY, truncateText(prompt, width - 4), null, null, {
		bold: true,
	});

	if (overlay.status) {
		fb.setText(
			2,
			boxY + 1,
			truncateText(overlay.status, width - 4),
			null,
			null,
			{
				dim: true,
			},
		);
	}
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + '...';
}

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
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

export {parseKeyName} from './input/key-parser.ts';
