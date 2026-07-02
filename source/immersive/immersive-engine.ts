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
import {
	createTrayIcon,
	resolveTrayIconPath,
	removeTrayIcon,
	setTrayActionHandler,
} from './native/tray.ts';
import type {RGB} from './renderer/ansi-codes.ts';
import type {
	Playlist,
	SearchResult,
	Track,
} from '../types/youtube-music.types.ts';
import {StdinKeyBuffer} from './input/stdin-buffer.ts';
import {formatSearchResultLine} from './actions/playback-actions.ts';
import {
	buildSearchHeaderLine,
	closeSearchOverlay,
	createSearchOverlayState,
	formatSearchTypeLabel,
	handleFilterEditInput,
	handleSearchQueryInput,
	handleSearchQueryMetaKey,
	handleSearchResultsInput,
	handleSearchResultsMetaKey,
	openSearchOverlay,
	setSearchResults,
	type SearchOverlayState,
} from './ui/search-overlay.ts';
import {
	closeLibraryOverlay,
	createLibraryOverlayState,
	formatFavoriteLine,
	formatPlaylistLine,
	handleLibraryFavoritesInput,
	handleLibraryMenuInput,
	handleLibraryPlaylistEditInput,
	handleLibraryPlaylistInput,
	handleLibraryAddToPlaylistInput,
	LIBRARY_MENU_ITEMS,
	openAddToPlaylistPicker,
	openFavoritesPicker,
	openLibraryMenu,
	openPlaylistEdit,
	openPlaylistPicker,
	closeAddToPlaylistPicker,
	closePlaylistEdit,
	formatPlaylistTrackLine,
	type LibraryOverlayState,
} from './ui/library-overlay.ts';
import {
	createSettingsOverlayState,
	handleSettingsInput,
	handleSettingsTextEditInput,
	beginSettingsTextEdit,
	getSelectedTextField,
	openSettingsOverlay,
	type SettingsOverlayState,
	type SettingsRow,
} from './ui/settings-overlay.ts';
import type {SettingsTextField} from './settings/settings-items.ts';
import {
	getUpcomingTracks,
	trackArtists,
	type ImmersivePlayerState,
} from './state/queue-state.ts';
import {
	buildModeStatusLine,
	buildPlayerShortcutLine,
	buildProgressBar,
	buildVolumeBar,
	computeLayout,
	RECENT_FAVORITES_MAX,
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
	isFavorite?: (videoId: string) => boolean;
	onTogglePlay?: () => void;
	onToggleDisco?: () => void;
	onVolumeUp?: () => void;
	onVolumeDown?: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
	onToggleFavoriteCurrent?: () => void | Promise<void>;
	onSearch?: (options: {
		query: string;
		type: SearchOverlayState['searchType'];
		limit: number;
	}) => Promise<{results: SearchResult[]; message: string | null}>;
	onPlaySearchResult?: (result: SearchResult) => Promise<void>;
	onCreateMix?: (result: SearchResult) => Promise<string | null>;
	onToggleFavoriteSearchResult?: (
		result: SearchResult,
	) => Promise<string | null>;
	onDownloadSearchResult?: (result: SearchResult) => Promise<string | null>;
	onRemoveFavoriteTrack?: (track: Track) => Promise<string | null>;
	onAddTrackToPlaylist?: (
		playlistId: string,
		track: Track,
	) => Promise<string | null>;
	onRemoveTrackFromPlaylist?: (
		playlistId: string,
		trackIndex: number,
	) => Promise<string | null>;
	onAddCurrentTrackToPlaylist?: (playlistId: string) => Promise<string | null>;
	getSavedPlaylists?: () => Playlist[];
	getFavoriteTracks?: () => Track[];
	getRecentFavorites?: () => Track[];
	onPlaySavedPlaylist?: (playlist: Playlist) => Promise<void>;
	onPlayFavoriteTrack?: (track: Track) => Promise<void>;
	onPlayAllFavorites?: () => Promise<string | null>;
	onPlayRandomFavorite?: () => Promise<string | null>;
	onToggleShuffle?: () => void;
	onToggleRepeat?: () => void;
	onToggleAutoplay?: () => void;
	getSettingsRows?: () => SettingsRow[];
	getSettingsTextDraft?: (field: SettingsTextField) => string;
	onSettingsCycle?: (index: number) => string | null;
	onSettingsTextSave?: (
		field: SettingsTextField,
		value: string,
	) => string | null;
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
	private libraryOverlay: LibraryOverlayState = createLibraryOverlayState();
	private settingsOverlay: SettingsOverlayState = createSettingsOverlayState();

	private options: ImmersiveOptions;
	private effectiveWidth: number;
	private effectiveHeight: number;
	private isRunning = false;
	private inputHandler: ((data: string) => void) | null = null;
	private stdinKeyBuffer: StdinKeyBuffer | null = null;
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
			setTrayActionHandler(action => {
				if (action === 'settings') {
					openSettingsOverlay(this.settingsOverlay);
					return;
				}
				if (action === 'exit') {
					this.stop();
					process.exit(0);
				}
			});
			createTrayIcon({
				id: 'youtube-music-cli',
				icon: resolveTrayIconPath() ?? '',
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
			renderNowPlaying(
				fb,
				layout,
				playerState,
				accentColor,
				this.options.isFavorite,
			);
			renderQueuePanel(fb, layout, playerState, accentColor);
			renderRecentFavoritesPanel(
				fb,
				layout,
				accentColor,
				this.options.getRecentFavorites?.() ?? [],
			);
			renderControls(
				fb,
				tw,
				th,
				playerState,
				this.searchOverlay,
				this.libraryOverlay,
				this.settingsOverlay,
			);
			renderSearchOverlay(fb, tw, th, this.searchOverlay);
			renderLibraryOverlay(
				fb,
				tw,
				th,
				this.libraryOverlay,
				this.options.getSavedPlaylists?.() ?? [],
				this.options.getFavoriteTracks?.() ?? [],
			);
			renderSettingsOverlay(
				fb,
				tw,
				th,
				this.settingsOverlay,
				this.options.getSettingsRows?.() ?? [],
			);

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

		this.stdinKeyBuffer = new StdinKeyBuffer(keyName => {
			this.routeKey(keyName);
		});

		this.inputHandler = (data: string): void => {
			this.stdinKeyBuffer?.push(data);
		};

		process.stdin.on('data', this.inputHandler);

		if (!this.exitHandler) {
			this.exitHandler = () => {
				this.stop();
			};
			process.on('exit', this.exitHandler);
		}
	}

	private routeKey(keyName: string): void {
		if (this.libraryOverlay.active) {
			void this.handleLibraryKey(keyName);
			return;
		}

		if (this.searchOverlay.active) {
			void this.handleSearchKey(keyName);
			return;
		}

		if (this.settingsOverlay.active) {
			this.handleSettingsKey(keyName);
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
			case 'f':
				void this.options.onToggleFavoriteCurrent?.();
				break;
			case 'l':
				openLibraryMenu(this.libraryOverlay);
				break;
			case 'p':
				openPlaylistPicker(this.libraryOverlay);
				break;
			case 'e':
				void this.runLibraryAction(() => this.options.onPlayAllFavorites?.());
				break;
			case 'Shift+S':
				this.options.onToggleShuffle?.();
				break;
			case 'Shift+A':
				this.options.onToggleAutoplay?.();
				break;
			case 'r':
				this.options.onToggleRepeat?.();
				break;
			case 'Ctrl+,':
			case ',':
				openSettingsOverlay(this.settingsOverlay);
				break;
			// KEYBINDINGS.VOLUME_UP / VOLUME_DOWN (constants.ts): = and + map to '+'
			case '+':
				this.options.onVolumeUp?.();
				break;
			case '-':
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
			case 'q':
			case 'escape':
				this.stop();
				process.exit(0);
				break;
		}
	}

	private async runLibraryAction(
		action: () => Promise<string | null | undefined> | undefined,
	): Promise<void> {
		try {
			const message = await action();
			if (message) {
				this.libraryOverlay.status = message;
				openLibraryMenu(this.libraryOverlay);
				return;
			}
			closeLibraryOverlay(this.libraryOverlay);
		} catch (error) {
			this.libraryOverlay.status =
				error instanceof Error ? error.message : 'Action failed';
			openLibraryMenu(this.libraryOverlay);
		}
	}

	private async handleLibraryKey(key: string): Promise<void> {
		if (this.libraryOverlay.view === 'menu') {
			const action = handleLibraryMenuInput(this.libraryOverlay, key);
			if (action === 'close') {
				return;
			}
			if (action !== 'menu_select') {
				return;
			}

			switch (this.libraryOverlay.selectedIndex) {
				case 0:
					this.libraryOverlay.view = 'playlists';
					this.libraryOverlay.selectedIndex = 0;
					this.libraryOverlay.status = null;
					break;
				case 1:
					openFavoritesPicker(this.libraryOverlay);
					break;
				case 2:
					await this.runLibraryAction(() =>
						this.options.onPlayAllFavorites?.(),
					);
					break;
				case 3:
					await this.runLibraryAction(() =>
						this.options.onPlayRandomFavorite?.(),
					);
					break;
				case 4:
					closeLibraryOverlay(this.libraryOverlay);
					break;
			}
			return;
		}

		if (this.libraryOverlay.view === 'favorites') {
			const favorites = this.options.getFavoriteTracks?.() ?? [];
			const action = handleLibraryFavoritesInput(
				this.libraryOverlay,
				key,
				favorites.length,
			);

			if (action === 'back_to_menu') {
				return;
			}

			if (action === 'none') {
				return;
			}

			const track = favorites[this.libraryOverlay.selectedIndex];
			if (!track) {
				this.libraryOverlay.status = 'No favorites yet — press F while playing';
				return;
			}

			if (action === 'remove_favorite') {
				try {
					const message = await this.options.onRemoveFavoriteTrack?.(track);
					const updated = this.options.getFavoriteTracks?.() ?? [];
					this.libraryOverlay.selectedIndex = Math.min(
						this.libraryOverlay.selectedIndex,
						Math.max(0, updated.length - 1),
					);
					this.libraryOverlay.status = message ?? 'Removed from favorites';
				} catch (error) {
					this.libraryOverlay.status =
						error instanceof Error
							? error.message
							: 'Failed to remove favorite';
				}
				return;
			}

			if (action === 'pick_add_to_playlist') {
				openAddToPlaylistPicker(this.libraryOverlay, track, {
					returnView: 'favorites',
				});
				return;
			}

			if (action !== 'play_favorite') {
				return;
			}

			try {
				await this.options.onPlayFavoriteTrack?.(track);
				closeLibraryOverlay(this.libraryOverlay);
			} catch (error) {
				this.libraryOverlay.status =
					error instanceof Error ? error.message : 'Failed to play favorite';
			}
			return;
		}

		if (this.libraryOverlay.view === 'add_to_playlist') {
			const playlists = this.options.getSavedPlaylists?.() ?? [];
			const action = handleLibraryAddToPlaylistInput(
				this.libraryOverlay,
				key,
				playlists.length,
			);

			if (action === 'cancel_add_to_playlist') {
				return;
			}

			if (action === 'none') {
				return;
			}

			const track = this.libraryOverlay.pendingTrack;
			const playlist = playlists[this.libraryOverlay.selectedIndex];
			if (!track || !playlist) {
				this.libraryOverlay.status = 'No saved playlists';
				return;
			}

			try {
				const message = await this.options.onAddTrackToPlaylist?.(
					playlist.playlistId,
					track,
				);
				const statusMessage = message ?? `Added to "${playlist.name}"`;
				if (this.searchOverlay.active) {
					this.searchOverlay.status = statusMessage;
				} else {
					this.libraryOverlay.status = statusMessage;
				}
				closeAddToPlaylistPicker(this.libraryOverlay);
			} catch (error) {
				this.libraryOverlay.status =
					error instanceof Error ? error.message : 'Failed to add to playlist';
			}
			return;
		}

		if (this.libraryOverlay.view === 'playlist_edit') {
			const playlists = this.options.getSavedPlaylists?.() ?? [];
			const playlist = playlists.find(
				item => item.playlistId === this.libraryOverlay.editingPlaylistId,
			);
			const tracks = playlist?.tracks ?? [];
			const action = handleLibraryPlaylistEditInput(
				this.libraryOverlay,
				key,
				tracks.length,
			);

			if (action === 'back_to_menu') {
				return;
			}

			if (action === 'none') {
				return;
			}

			if (!playlist) {
				closePlaylistEdit(this.libraryOverlay);
				this.libraryOverlay.status = 'Playlist not found';
				return;
			}

			if (action === 'remove_playlist_track') {
				try {
					const message = await this.options.onRemoveTrackFromPlaylist?.(
						playlist.playlistId,
						this.libraryOverlay.selectedIndex,
					);
					const updated = this.options.getSavedPlaylists?.() ?? [];
					const updatedPlaylist = updated.find(
						item => item.playlistId === playlist.playlistId,
					);
					const trackCount = updatedPlaylist?.tracks.length ?? 0;
					this.libraryOverlay.selectedIndex = Math.min(
						this.libraryOverlay.selectedIndex,
						Math.max(0, trackCount - 1),
					);
					this.libraryOverlay.status = message ?? 'Track removed';
				} catch (error) {
					this.libraryOverlay.status =
						error instanceof Error ? error.message : 'Failed to remove track';
				}
				return;
			}

			if (action === 'add_current_to_playlist') {
				try {
					const message = await this.options.onAddCurrentTrackToPlaylist?.(
						playlist.playlistId,
					);
					this.libraryOverlay.status = message ?? 'Track added';
				} catch (error) {
					this.libraryOverlay.status =
						error instanceof Error ? error.message : 'Failed to add track';
				}
			}
			return;
		}

		const playlists = this.options.getSavedPlaylists?.() ?? [];
		const action = handleLibraryPlaylistInput(
			this.libraryOverlay,
			key,
			playlists.length,
		);

		if (action === 'back_to_menu') {
			return;
		}

		if (action === 'none') {
			return;
		}

		const playlist = playlists[this.libraryOverlay.selectedIndex];
		if (!playlist) {
			this.libraryOverlay.status = 'No saved playlists';
			return;
		}

		if (action === 'edit_playlist') {
			openPlaylistEdit(this.libraryOverlay, playlist.playlistId);
			return;
		}

		if (action !== 'play_playlist') {
			return;
		}

		try {
			await this.options.onPlaySavedPlaylist?.(playlist);
			closeLibraryOverlay(this.libraryOverlay);
		} catch (error) {
			this.libraryOverlay.status =
				error instanceof Error ? error.message : 'Failed to play playlist';
		}
	}

	private handleSettingsKey(key: string): void {
		if (this.settingsOverlay.textEdit) {
			const editAction = handleSettingsTextEditInput(this.settingsOverlay, key);
			if (editAction === 'save') {
				const field = this.settingsOverlay.textEdit;
				if (field) {
					const message = this.options.onSettingsTextSave?.(
						field,
						this.settingsOverlay.textDraft,
					);
					if (message) {
						this.settingsOverlay.status = message;
						return;
					}
					this.settingsOverlay.textEdit = null;
					this.settingsOverlay.textDraft = '';
					this.settingsOverlay.status = 'Saved';
				}
			}
			return;
		}

		const rows = this.options.getSettingsRows?.() ?? [];
		const action = handleSettingsInput(this.settingsOverlay, key, rows.length);

		if (action === 'cycle' || action === 'navigate') {
			const message = this.options.onSettingsCycle?.(
				this.settingsOverlay.selectedIndex,
			);
			if (message) {
				this.settingsOverlay.status = message;
			}
			return;
		}

		if (action === 'begin_text') {
			const field = getSelectedTextField(this.settingsOverlay);
			if (field) {
				const draft = this.options.getSettingsTextDraft?.(field) ?? '';
				beginSettingsTextEdit(this.settingsOverlay, field, draft);
			}
		}
	}

	private async handleSearchKey(key: string): Promise<void> {
		if (this.searchOverlay.filterEdit) {
			handleFilterEditInput(this.searchOverlay, key);
			return;
		}

		if (this.searchOverlay.phase === 'query') {
			if (handleSearchQueryMetaKey(this.searchOverlay, key)) {
				return;
			}

			const action = handleSearchQueryInput(this.searchOverlay, key);
			if (action === 'cancel') {
				return;
			}

			if (action !== 'submit' || !this.options.onSearch) {
				return;
			}

			const query = this.searchOverlay.query.trim();
			this.searchOverlay.status = 'Searching...';

			try {
				const result = await this.options.onSearch({
					query,
					type: this.searchOverlay.searchType,
					limit: this.searchOverlay.searchLimit,
				});
				if (result.results.length === 0) {
					this.searchOverlay.status = result.message ?? 'No results found';
					return;
				}

				setSearchResults(this.searchOverlay, result.results);
				this.searchOverlay.status = buildSearchHeaderLine(this.searchOverlay);
			} catch (error) {
				this.searchOverlay.status =
					error instanceof Error ? error.message : 'Search failed';
			}

			return;
		}

		if (handleSearchResultsMetaKey(this.searchOverlay, key)) {
			return;
		}

		const action = handleSearchResultsInput(this.searchOverlay, key);
		const selected =
			this.searchOverlay.results[this.searchOverlay.selectedIndex];
		if (!selected && action !== 'back' && action !== 'none') {
			return;
		}

		if (action === 'back') {
			return;
		}

		if (action === 'none') {
			return;
		}

		if (action === 'favorite' && selected) {
			try {
				const message =
					await this.options.onToggleFavoriteSearchResult?.(selected);
				if (message) {
					this.searchOverlay.status = message;
				}
			} catch (error) {
				this.searchOverlay.status =
					error instanceof Error ? error.message : 'Favorite failed';
			}
			return;
		}

		if (action === 'download' && selected) {
			this.searchOverlay.status = 'Starting download...';
			try {
				const message = await this.options.onDownloadSearchResult?.(selected);
				this.searchOverlay.status = message ?? 'Download finished';
			} catch (error) {
				this.searchOverlay.status =
					error instanceof Error ? error.message : 'Download failed';
			}
			return;
		}

		if (action === 'mix' && selected) {
			this.searchOverlay.status = 'Creating mix...';
			try {
				const message = await this.options.onCreateMix?.(selected);
				if (message?.startsWith('Mix "')) {
					closeSearchOverlay(this.searchOverlay);
					return;
				}
				this.searchOverlay.status = message ?? 'Mix failed';
			} catch (error) {
				this.searchOverlay.status =
					error instanceof Error ? error.message : 'Mix failed';
			}
			return;
		}

		if (action === 'add_to_playlist' && selected) {
			if (selected.type !== 'song') {
				this.searchOverlay.status = 'Only songs can be added to playlists';
				return;
			}

			const track = selected.data as Track;
			openAddToPlaylistPicker(this.libraryOverlay, track, {
				returnToSearch: true,
			});
			return;
		}

		if (action === 'play' && selected) {
			try {
				await this.options.onPlaySearchResult?.(selected);
				closeSearchOverlay(this.searchOverlay);
			} catch (error) {
				this.searchOverlay.status =
					error instanceof Error ? error.message : 'Playback failed';
			}
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

			this.stdinKeyBuffer?.dispose();
			this.stdinKeyBuffer = null;

			if (this.resizeHandler) {
				process.stdout.off('resize', this.resizeHandler);
				this.resizeHandler = null;
			}

			showCursor();
			exitAltBuffer();

			if (this.options.enableTray) {
				setTrayActionHandler(null);
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
	isFavorite?: (videoId: string) => boolean,
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
	const favorited =
		state.currentTrack && isFavorite?.(state.currentTrack.videoId);
	const heart = favorited ? '♥ ' : '';
	const title = truncateText(`${heart}${state.currentTrack.title}`, maxTextW);
	const artist = truncateText(trackArtists(state.currentTrack), maxTextW);
	const innerH = layout.nowPlayingH - 2;
	const showVolume = innerH >= 7;
	const showTime = innerH >= 6;
	const showProgress = innerH >= 5;

	fb.setText(innerX, y, 'NOW PLAYING', accent, null, {dim: true});
	y += 1;
	fb.setText(innerX, y, title, null, null, {bold: true});
	y += 1;
	fb.setText(innerX, y, artist, null, null, {dim: true});
	y += 1;

	const statusText = state.isPlaying ? '▶  PLAYING' : '⏸  PAUSED';
	const modeTags: string[] = [];
	if (state.shuffle) {
		modeTags.push('SHF');
	}
	if (state.repeat !== 'off') {
		modeTags.push(state.repeat === 'all' ? 'RPT ALL' : 'RPT ONE');
	}
	const statusSuffix = modeTags.length > 0 ? `  ${modeTags.join(' ')}` : '';
	fb.setText(
		innerX,
		y,
		truncateText(`${statusText}${statusSuffix}`, maxTextW),
		accent,
		null,
		{bold: true},
	);
	y += 1;

	if (showProgress) {
		const duration = resolveDuration(state);
		const progressW = Math.max(10, layout.nowPlayingW - 4);
		const ratio = duration > 0 ? state.currentTime / duration : 0;
		const {bar} = buildProgressBar(ratio, progressW);
		fb.setText(innerX, y, bar, null, null);
		y += 1;

		if (showTime) {
			if (duration > 0) {
				const timeText = `${formatTime(state.currentTime)} / ${formatTime(duration)}`;
				fb.setText(innerX, y, timeText, null, null, {dim: true});
			} else {
				fb.setText(innerX, y, 'Press Space to start playback', null, null, {
					dim: true,
				});
			}
			y += 1;
		}
	}

	if (showVolume) {
		const progressW = Math.max(10, layout.nowPlayingW - 4);
		const volBarW = Math.min(18, progressW - 12);
		const volumeLine = `[+/-] ${buildVolumeBar(state.volume, volBarW)} ${Math.round(state.volume)}%`;
		fb.setText(innerX, y, truncateText(volumeLine, maxTextW), null, null, {
			dim: true,
		});
	}
}

function renderQueuePanel(
	fb: FrameBuffer,
	layout: ImmersiveLayout,
	state: ImmersivePlayerState | undefined,
	accent: RGB,
): void {
	if (!state || state.queue.length === 0 || layout.queueH < 4) {
		return;
	}

	if (!layout.splitQueue && layout.favoritesH > 0) {
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

function renderRecentFavoritesPanel(
	fb: FrameBuffer,
	layout: ImmersiveLayout,
	accent: RGB,
	favorites: Track[],
): void {
	if (layout.favoritesH < 3 || favorites.length === 0) {
		return;
	}

	const recent = favorites.slice(0, RECENT_FAVORITES_MAX);
	fb.drawRect(
		layout.favoritesX,
		layout.favoritesY,
		layout.favoritesW,
		layout.favoritesH,
		accent,
		null,
		'single',
	);

	const innerX = layout.favoritesX + 2;
	let y = layout.favoritesY + 1;
	fb.setText(innerX, y, 'RECENT FAVORITES', accent, null, {bold: true});
	y += 1;

	const maxLines = Math.max(1, layout.favoritesH - 3);
	const visible = recent.slice(0, maxLines);
	for (let i = 0; i < visible.length; i++) {
		const track = visible[i];
		if (!track) continue;
		const line = truncateText(
			`${i + 1}. ${formatFavoriteLine(track, layout.favoritesW - 6)}`,
			layout.favoritesW - 4,
		);
		fb.setText(innerX, y + i, line, null, null, {dim: true});
	}
}

function layoutFooterY(height: number, offset: number): number {
	return height - 3 + offset;
}

function renderControls(
	fb: FrameBuffer,
	width: number,
	height: number,
	playerState: ImmersivePlayerState | undefined,
	searchOverlay: SearchOverlayState,
	libraryOverlay: LibraryOverlayState,
	settingsOverlay: SettingsOverlayState,
): void {
	const separatorY = layoutFooterY(height, 0);
	const modeY = layoutFooterY(height, 1);
	const controlsY = layoutFooterY(height, 2);

	fb.setText(1, separatorY, '─'.repeat(Math.max(0, width - 2)), null, null, {
		dim: true,
	});

	let modeLine = '';
	let controls = '';

	if (searchOverlay.active) {
		if (searchOverlay.filterEdit) {
			controls = '[Enter] Save filter   [Esc] Cancel   [Backspace] Delete';
		} else if (searchOverlay.phase === 'query') {
			controls =
				'[Tab] Type   [Ctrl+A] Artist   [Ctrl+L] Album   [+/−] Limit   [Enter] Search   [Esc] Cancel';
		} else {
			controls =
				'[↑↓] Select   [Enter] Play   [A] Playlist   [Shift+D] Download   [M] Mix   [F] Favorite   [Ctrl+A/L] Filter   [Esc] Back';
		}
	} else if (libraryOverlay.active) {
		if (libraryOverlay.view === 'menu') {
			controls = '[↑↓] Navigate   [Enter] Select   [Esc] Close';
		} else if (libraryOverlay.view === 'favorites') {
			controls =
				'[↑↓] Select   [Enter] Play   [A] Add to playlist   [F] Remove   [Esc] Back';
		} else if (libraryOverlay.view === 'playlist_edit') {
			controls =
				'[↑↓] Select track   [A] Add current   [D] Remove   [Esc] Back';
		} else if (libraryOverlay.view === 'add_to_playlist') {
			controls = '[↑↓] Select playlist   [Enter] Add   [Esc] Cancel';
		} else {
			controls = '[↑↓] Select   [Enter] Play   [E] Edit   [Esc] Back';
		}
	} else if (settingsOverlay.active) {
		controls = '[↑↓] Navigate   [Enter] Cycle   [Esc] Close';
	} else if (playerState) {
		modeLine = buildModeStatusLine(playerState);
		controls = buildPlayerShortcutLine(width - 4);
	} else {
		controls = buildPlayerShortcutLine(width - 4);
	}

	if (modeLine) {
		const modeX = Math.max(2, Math.floor((width - modeLine.length) / 2));
		fb.setText(modeX, modeY, truncateText(modeLine, width - 4), null, null, {
			dim: true,
		});
	}

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

	const boxH = Math.min(Math.max(10, Math.floor(height * 0.55)), height - 6);
	const boxY = Math.max(2, Math.floor((height - boxH) / 2));
	const boxW = Math.min(width - 4, 90);
	const boxX = Math.floor((width - boxW) / 2);

	fb.drawRect(boxX, boxY, boxW, boxH, null, null, 'single');
	fb.setText(boxX + 2, boxY, ' SEARCH ', null, null, {bold: true});

	if (overlay.phase === 'query') {
		if (overlay.filterEdit) {
			const prompt = `Filter ${overlay.filterEdit}: ${overlay.filterDraft}_`;
			fb.setText(
				boxX + 2,
				boxY + 2,
				truncateText(prompt, boxW - 4),
				null,
				null,
			);
		} else {
			const prompt = `Query: ${overlay.query}_`;
			fb.setText(
				boxX + 2,
				boxY + 2,
				truncateText(prompt, boxW - 4),
				null,
				null,
			);
			const meta = `${formatSearchTypeLabel(overlay.searchType)} · limit ${overlay.searchLimit}`;
			fb.setText(boxX + 2, boxY + 3, truncateText(meta, boxW - 4), null, null, {
				dim: true,
			});
		}

		if (overlay.status) {
			fb.setText(
				boxX + 2,
				boxY + 4,
				truncateText(overlay.status, boxW - 4),
				null,
				null,
				{dim: true},
			);
		}

		return;
	}

	const header = buildSearchHeaderLine(overlay);
	fb.setText(boxX + 2, boxY + 1, truncateText(header, boxW - 4), null, null, {
		dim: true,
	});

	const listTop = boxY + 2;
	const maxLines = boxH - 5;
	const start = Math.max(
		0,
		Math.min(
			overlay.selectedIndex - Math.floor(maxLines / 2),
			Math.max(0, overlay.results.length - maxLines),
		),
	);
	const visible = overlay.results.slice(start, start + maxLines);

	for (let i = 0; i < visible.length; i++) {
		const result = visible[i];
		if (!result) continue;
		const index = start + i;
		const marker = index === overlay.selectedIndex ? '>' : ' ';
		const line = truncateText(
			`${marker} ${formatSearchResultLine(result, boxW - 6)}`,
			boxW - 4,
		);
		fb.setText(
			boxX + 2,
			listTop + i,
			line,
			null,
			null,
			index === overlay.selectedIndex ? {bold: true} : {dim: true},
		);
	}

	if (overlay.status) {
		fb.setText(
			boxX + 2,
			boxY + boxH - 2,
			truncateText(overlay.status, boxW - 4),
			null,
			null,
			{dim: true},
		);
	}
}

function renderLibraryOverlay(
	fb: FrameBuffer,
	width: number,
	height: number,
	overlay: LibraryOverlayState,
	playlists: Playlist[],
	favorites: Track[],
): void {
	if (!overlay.active) {
		return;
	}

	const boxH = Math.min(Math.max(8, Math.floor(height * 0.4)), height - 6);
	const boxY = Math.max(2, Math.floor((height - boxH) / 2));
	const boxW = Math.min(width - 4, 60);
	const boxX = Math.floor((width - boxW) / 2);

	fb.drawRect(boxX, boxY, boxW, boxH, null, null, 'single');

	if (overlay.view === 'menu') {
		fb.setText(boxX + 2, boxY, ' LIBRARY ', null, null, {bold: true});
		for (let i = 0; i < LIBRARY_MENU_ITEMS.length; i++) {
			const item = LIBRARY_MENU_ITEMS[i]!;
			const marker = i === overlay.selectedIndex ? '>' : ' ';
			fb.setText(
				boxX + 2,
				boxY + 2 + i,
				truncateText(`${marker} ${item}`, boxW - 4),
				null,
				null,
				i === overlay.selectedIndex ? {bold: true} : {dim: true},
			);
		}
	} else if (overlay.view === 'favorites') {
		fb.setText(boxX + 2, boxY, ' FAVORITES ', null, null, {bold: true});
		if (favorites.length === 0) {
			fb.setText(
				boxX + 2,
				boxY + 2,
				'No favorites yet — press F while playing',
				null,
				null,
				{dim: true},
			);
		} else {
			const maxLines = boxH - 4;
			const start = Math.max(
				0,
				Math.min(
					overlay.selectedIndex - Math.floor(maxLines / 2),
					Math.max(0, favorites.length - maxLines),
				),
			);
			const visible = favorites.slice(start, start + maxLines);
			for (let i = 0; i < visible.length; i++) {
				const track = visible[i];
				if (!track) continue;
				const index = start + i;
				const marker = index === overlay.selectedIndex ? '>' : ' ';
				const line = truncateText(
					`${marker} ${formatFavoriteLine(track, boxW - 8)}`,
					boxW - 4,
				);
				fb.setText(
					boxX + 2,
					boxY + 2 + i,
					line,
					null,
					null,
					index === overlay.selectedIndex ? {bold: true} : {dim: true},
				);
			}
		}
	} else if (overlay.view === 'playlist_edit') {
		const playlist = playlists.find(
			item => item.playlistId === overlay.editingPlaylistId,
		);
		const title = playlist ? ` EDIT: ${playlist.name} ` : ' EDIT PLAYLIST ';
		fb.setText(boxX + 2, boxY, truncateText(title, boxW - 4), null, null, {
			bold: true,
		});
		const tracks = playlist?.tracks ?? [];
		if (tracks.length === 0) {
			fb.setText(
				boxX + 2,
				boxY + 2,
				'No tracks — press A to add current track',
				null,
				null,
				{dim: true},
			);
		} else {
			const maxLines = boxH - 4;
			const start = Math.max(
				0,
				Math.min(
					overlay.selectedIndex - Math.floor(maxLines / 2),
					Math.max(0, tracks.length - maxLines),
				),
			);
			const visible = tracks.slice(start, start + maxLines);
			for (let i = 0; i < visible.length; i++) {
				const track = visible[i];
				if (!track) continue;
				const index = start + i;
				const marker = index === overlay.selectedIndex ? '>' : ' ';
				const line = truncateText(
					`${marker} ${formatPlaylistTrackLine(track, boxW - 8)}`,
					boxW - 4,
				);
				fb.setText(
					boxX + 2,
					boxY + 2 + i,
					line,
					null,
					null,
					index === overlay.selectedIndex ? {bold: true} : {dim: true},
				);
			}
		}
	} else if (overlay.view === 'add_to_playlist') {
		fb.setText(boxX + 2, boxY, ' ADD TO PLAYLIST ', null, null, {bold: true});
		const trackTitle = overlay.pendingTrack?.title ?? 'Selected track';
		fb.setText(
			boxX + 2,
			boxY + 1,
			truncateText(trackTitle, boxW - 4),
			null,
			null,
			{dim: true},
		);
		if (playlists.length === 0) {
			fb.setText(boxX + 2, boxY + 3, 'No saved playlists', null, null, {
				dim: true,
			});
		} else {
			const maxLines = boxH - 5;
			const start = Math.max(
				0,
				Math.min(
					overlay.selectedIndex - Math.floor(maxLines / 2),
					Math.max(0, playlists.length - maxLines),
				),
			);
			const visible = playlists.slice(start, start + maxLines);
			for (let i = 0; i < visible.length; i++) {
				const playlist = visible[i];
				if (!playlist) continue;
				const index = start + i;
				const marker = index === overlay.selectedIndex ? '>' : ' ';
				const line = truncateText(
					`${marker} ${formatPlaylistLine(playlist, boxW - 8)}`,
					boxW - 4,
				);
				fb.setText(
					boxX + 2,
					boxY + 3 + i,
					line,
					null,
					null,
					index === overlay.selectedIndex ? {bold: true} : {dim: true},
				);
			}
		}
	} else {
		fb.setText(boxX + 2, boxY, ' PLAYLISTS ', null, null, {bold: true});
		if (playlists.length === 0) {
			fb.setText(boxX + 2, boxY + 2, 'No saved playlists', null, null, {
				dim: true,
			});
		} else {
			const maxLines = boxH - 4;
			const start = Math.max(
				0,
				Math.min(
					overlay.selectedIndex - Math.floor(maxLines / 2),
					Math.max(0, playlists.length - maxLines),
				),
			);
			const visible = playlists.slice(start, start + maxLines);
			for (let i = 0; i < visible.length; i++) {
				const playlist = visible[i];
				if (!playlist) continue;
				const index = start + i;
				const marker = index === overlay.selectedIndex ? '>' : ' ';
				const line = truncateText(
					`${marker} ${formatPlaylistLine(playlist, boxW - 8)}`,
					boxW - 4,
				);
				fb.setText(
					boxX + 2,
					boxY + 2 + i,
					line,
					null,
					null,
					index === overlay.selectedIndex ? {bold: true} : {dim: true},
				);
			}
		}
	}

	if (overlay.status) {
		fb.setText(
			boxX + 2,
			boxY + boxH - 2,
			truncateText(overlay.status, boxW - 4),
			null,
			null,
			{dim: true},
		);
	}
}

function renderSettingsOverlay(
	fb: FrameBuffer,
	width: number,
	height: number,
	overlay: SettingsOverlayState,
	rows: SettingsRow[],
): void {
	if (!overlay.active) {
		return;
	}

	const boxH = Math.min(Math.max(14, Math.floor(height * 0.72)), height - 4);
	const boxY = Math.max(1, Math.floor((height - boxH) / 2));
	const boxW = Math.min(width - 4, 64);
	const boxX = Math.floor((width - boxW) / 2);

	fb.drawRect(boxX, boxY, boxW, boxH, null, null, 'single');
	fb.setText(boxX + 2, boxY, ' SETTINGS ', null, null, {bold: true});

	if (overlay.textEdit) {
		const row = rows[overlay.selectedIndex];
		const label = row?.label ?? overlay.textEdit;
		fb.setText(
			boxX + 2,
			boxY + 2,
			truncateText(`${label}: ${overlay.textDraft}`, boxW - 4),
			null,
			null,
			{bold: true},
		);
		fb.setText(
			boxX + 2,
			boxY + boxH - 3,
			'Enter save · Esc cancel',
			null,
			null,
			{dim: true},
		);
		if (overlay.status) {
			fb.setText(
				boxX + 2,
				boxY + boxH - 2,
				truncateText(overlay.status, boxW - 4),
				null,
				null,
				{dim: true},
			);
		}
		return;
	}

	if (rows.length === 0) {
		fb.setText(boxX + 2, boxY + 2, 'No settings available', null, null, {
			dim: true,
		});
		return;
	}

	const listTop = boxY + 2;
	const footerRows = 2;
	const maxLines = Math.max(1, boxH - footerRows - 3);
	const start = Math.max(
		0,
		Math.min(
			overlay.selectedIndex - Math.floor(maxLines / 2),
			Math.max(0, rows.length - maxLines),
		),
	);
	const visible = rows.slice(start, start + maxLines);

	for (let i = 0; i < visible.length; i++) {
		const row = visible[i];
		if (!row) continue;
		const index = start + i;
		const marker = index === overlay.selectedIndex ? '>' : ' ';
		const line = truncateText(`${marker} ${row.label}: ${row.value}`, boxW - 4);
		fb.setText(
			boxX + 2,
			listTop + i,
			line,
			null,
			null,
			index === overlay.selectedIndex ? {bold: true} : {dim: true},
		);
	}

	fb.setText(
		boxX + 2,
		boxY + boxH - 3,
		'Enter cycle/edit · Esc close',
		null,
		null,
		{dim: true},
	);

	if (overlay.status) {
		fb.setText(
			boxX + 2,
			boxY + boxH - 2,
			truncateText(overlay.status, boxW - 4),
			null,
			null,
			{dim: true},
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
