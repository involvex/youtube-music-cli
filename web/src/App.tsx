import {useCallback, useEffect, useState} from 'react';
import {Heart} from 'lucide-react';
import {useWebSocket} from './hooks/useWebSocket';
import {useMediaSession} from './hooks/useMediaSession';
import {useMirrorAudio} from './hooks/useMirrorAudio';
import {
	usePlayerStore,
	type PlayerStore,
	setExternalDispatch,
} from './hooks/usePlayerState';
import AppShell from './components/shell/AppShell';
import type {AppView} from './components/shell/Nav';
import NowPlaying from './components/player/NowPlaying';
import LiveView from './components/live/LiveView';
import FavoritesView from './components/favorites/FavoritesView';
import ProgressBar from './components/ProgressBar';
import MiniPlayerView from './components/mini/MiniPlayerView';
import type {
	ServerMessage,
	ClientMessage,
	Artist,
	Track,
	RadioStation,
	SearchResult,
	Config,
} from './types';

function App() {
	const setState = usePlayerStore((state: PlayerStore) => state.setState);
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [_config, setConfig] = useState<Config | null>(null);
	const [currentView, setCurrentView] = useState<AppView>('player');
	const [liveStations, setLiveStations] = useState<RadioStation[]>([]);
	const [radioResults, setRadioResults] = useState<RadioStation[]>([]);
	const [isSearchingRadio, setIsSearchingRadio] = useState(false);
	const [favorites, setFavorites] = useState<Track[]>([]);

	const currentTrack = usePlayerStore(
		(state: PlayerStore) => state.currentTrack,
	);
	const isPlaying = usePlayerStore((state: PlayerStore) => state.isPlaying);
	const progress = usePlayerStore((state: PlayerStore) => state.progress);
	const duration = usePlayerStore((state: PlayerStore) => state.duration);
	const queue = usePlayerStore((state: PlayerStore) => state.queue);
	const queuePosition = usePlayerStore(
		(state: PlayerStore) => state.queuePosition,
	);
	const shuffle = usePlayerStore((state: PlayerStore) => state.shuffle);
	const repeat = usePlayerStore((state: PlayerStore) => state.repeat);
	const autoplay = usePlayerStore((state: PlayerStore) => state.autoplay);
	const isLoading = usePlayerStore((state: PlayerStore) => state.isLoading);
	const volume = usePlayerStore((state: PlayerStore) => state.volume);
	const playbackMode = usePlayerStore(
		(state: PlayerStore) => state.playbackMode,
	);
	const currentStation = usePlayerStore(
		(state: PlayerStore) => state.currentStation ?? null,
	);
	const streamNowPlaying = usePlayerStore(
		(state: PlayerStore) => state.streamNowPlaying ?? null,
	);

	const {send, isConnected, isConnecting} = useWebSocket(
		`ws://${window.location.host}/ws`,
		{
			onMessage: (message: ServerMessage) => {
				if (message.type === 'state-update' && message.state) {
					setState(message.state);
				} else if (message.type === 'search-results' && message.results) {
					setSearchResults(message.results);
					setCurrentView('search');
				} else if (message.type === 'config-update' && message.config) {
					setConfig(prev => ({...prev, ...message.config}) as Config);
				} else if (message.type === 'live-streams-list' && message.stations) {
					setLiveStations(message.stations);
				} else if (
					message.type === 'radio-search-results' &&
					message.stations
				) {
					setIsSearchingRadio(false);
					setRadioResults(message.stations);
				} else if (message.type === 'favorites-list' && message.tracks) {
					setFavorites(message.tracks);
				}
			},
		},
	);

	useEffect(() => {
		setExternalDispatch((action: ClientMessage['action']) => {
			if (action) {
				send({type: 'command', action});
			}
		});
	}, [send]);

	useEffect(() => {
		if (isConnected) {
			send({type: 'favorites-request'});
		}
	}, [isConnected, send]);

	useEffect(() => {
		const playIcon = isPlaying ? '▶ ' : '⏸ ';
		if (playbackMode === 'stream' && currentStation) {
			const label = streamNowPlaying?.title || currentStation.name;
			document.title = `${playIcon}${label} — Radio | ymc`;
		} else if (currentTrack) {
			const artists = currentTrack.artists
				.map((a: Artist) => a.name)
				.join(', ');
			document.title = `${playIcon}${currentTrack.title} — ${artists} | ymc`;
		} else {
			document.title = 'ymc';
		}
	}, [currentTrack, isPlaying, playbackMode, currentStation, streamNowPlaying]);

	const sendCommand = useCallback(
		(action: ClientMessage['action']) => {
			if (action) {
				send({type: 'command', action});
			}
		},
		[send],
	);

	const handlePlayPause = useCallback(() => {
		const playing = usePlayerStore.getState().isPlaying;
		setState({isPlaying: !playing});
		sendCommand({category: playing ? 'PAUSE' : 'RESUME'});
	}, [sendCommand, setState]);

	const {isBrowserMuted, toggleBrowserMute} = useMirrorAudio({
		isPlaying,
		progress,
		currentTrack,
		currentStation,
		playbackMode,
	});

	const isMiniRoute =
		typeof window !== 'undefined' &&
		(window.location.pathname === '/mini' ||
			window.location.pathname === '/mini/' ||
			new URLSearchParams(window.location.search).has('mini'));

	useMediaSession({
		currentTrack,
		isPlaying,
		playbackMode,
		duration,
		progress,
		currentStation,
		streamNowPlaying,
		onPlay: useCallback(() => {
			setState({isPlaying: true});
			sendCommand({category: 'RESUME'});
		}, [sendCommand, setState]),
		onPause: useCallback(() => {
			setState({isPlaying: false});
			sendCommand({category: 'PAUSE'});
		}, [sendCommand, setState]),
		onNext: useCallback(() => sendCommand({category: 'NEXT'}), [sendCommand]),
		onPrevious: useCallback(
			() => sendCommand({category: 'PREVIOUS'}),
			[sendCommand],
		),
		onSeek: useCallback(
			(position: number) => sendCommand({category: 'SEEK', position}),
			[sendCommand],
		),
	});

	const handleSearch = (
		query: string,
		searchType: 'all' | 'songs' | 'artists' | 'albums' | 'playlists',
	) => {
		send({type: 'search-request', query, searchType});
	};

	const handleConfigUpdate = (key: string, value: unknown) => {
		send({type: 'config-update', config: {[key]: value} as Partial<Config>});
	};

	const handleRequestLiveStreams = () => {
		send({type: 'live-streams-request'});
	};

	const handleSearchRadio = (query: string, countrycode?: string) => {
		setIsSearchingRadio(true);
		send({type: 'radio-search-request', query, countrycode});
	};

	const handlePlayStation = (station: RadioStation) => {
		sendCommand({category: 'PLAY_STREAM', station});
	};

	const handleRequestFavorites = () => {
		send({type: 'favorites-request'});
	};

	const handleToggleFavorite = (track: Track) => {
		send({type: 'favorites-toggle', track});
	};

	const handlePlayRandomFavorite = () => {
		if (favorites.length === 0) {
			return;
		}
		const start = Math.floor(Math.random() * favorites.length);
		const rotated = [...favorites.slice(start), ...favorites.slice(0, start)];
		const first = rotated[0];
		if (!first) {
			return;
		}
		sendCommand({category: 'SET_QUEUE', queue: rotated});
		sendCommand({category: 'PLAY', track: first});
	};

	const isCurrentFavorite = Boolean(
		currentTrack &&
		favorites.some(track => track.videoId === currentTrack.videoId),
	);

	const transport = {
		isPlaying,
		isLoading,
		shuffle,
		repeat,
		autoplay,
		isBrowserMuted,
		onPlayPause: handlePlayPause,
		onNext: useCallback(() => sendCommand({category: 'NEXT'}), [sendCommand]),
		onPrevious: useCallback(
			() => sendCommand({category: 'PREVIOUS'}),
			[sendCommand],
		),
		onToggleShuffle: useCallback(
			() => sendCommand({category: 'TOGGLE_SHUFFLE'}),
			[sendCommand],
		),
		onToggleRepeat: useCallback(
			() => sendCommand({category: 'TOGGLE_REPEAT'}),
			[sendCommand],
		),
		onToggleAutoplay: useCallback(
			() => sendCommand({category: 'TOGGLE_AUTOPLAY'}),
			[sendCommand],
		),
		onToggleBrowserMute: toggleBrowserMute,
	};

	if (isMiniRoute) {
		return (
			<MiniPlayerView
				track={currentTrack}
				isPlaying={isPlaying}
				isLoading={isLoading}
				autoplay={autoplay}
				progress={progress}
				duration={duration}
				playbackMode={playbackMode}
				station={currentStation}
				streamNowPlaying={streamNowPlaying}
				isFavorite={isCurrentFavorite}
				isConnected={isConnected}
				transport={transport}
				onSeek={position => sendCommand({category: 'SEEK', position})}
				onToggleFavorite={
					currentTrack ? () => handleToggleFavorite(currentTrack) : undefined
				}
			/>
		);
	}

	return (
		<AppShell
			currentView={currentView}
			onNavigate={setCurrentView}
			isConnected={isConnected}
			isConnecting={isConnecting}
			volume={volume}
			onVolumeChange={v => {
				sendCommand({category: 'SET_VOLUME', volume: v});
				handleConfigUpdate('volume', v);
			}}
			queue={queue}
			queuePosition={queuePosition}
			onSelectTrack={index =>
				sendCommand({category: 'SET_QUEUE_POSITION', position: index})
			}
			onRemoveTrack={index =>
				sendCommand({category: 'REMOVE_FROM_QUEUE', index})
			}
			transport={transport}
		>
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				{playbackMode === 'stream' && currentStation
					? `${isPlaying ? 'Playing' : 'Paused'}: ${currentStation.name}`
					: currentTrack
						? `${isPlaying ? 'Playing' : 'Paused'}: ${currentTrack.title}`
						: ''}
			</div>

			{(currentView === 'player' || currentView === 'queue') && (
				<>
					{currentTrack || (playbackMode === 'stream' && currentStation) ? (
						<>
							<NowPlaying
								track={currentTrack}
								isPlaying={isPlaying}
								autoplay={autoplay}
								playbackMode={playbackMode}
								station={currentStation}
								streamNowPlaying={streamNowPlaying}
								isFavorite={isCurrentFavorite}
								isConnected={isConnected}
								onToggleFavorite={
									currentTrack
										? () => handleToggleFavorite(currentTrack)
										: undefined
								}
							/>
							{playbackMode !== 'stream' && (
								<ProgressBar
									progress={progress}
									duration={duration}
									onSeek={position => sendCommand({category: 'SEEK', position})}
								/>
							)}
						</>
					) : (
						<div className="empty-state">
							<p>No track playing. Search for music to get started.</p>
							<button type="button" onClick={() => setCurrentView('search')}>
								Go to Search
							</button>
						</div>
					)}
				</>
			)}

			{currentView === 'live' && (
				<LiveView
					liveStations={liveStations}
					radioResults={radioResults}
					isConnected={isConnected}
					isSearching={isSearchingRadio}
					currentStation={playbackMode === 'stream' ? currentStation : null}
					isStationPlaying={playbackMode === 'stream' && isPlaying}
					onPlayStation={handlePlayStation}
					onRequestLiveStreams={handleRequestLiveStreams}
					onSearchRadio={handleSearchRadio}
				/>
			)}

			{currentView === 'favorites' && (
				<FavoritesView
					favorites={favorites}
					isConnected={isConnected}
					currentTrack={currentTrack}
					isPlaying={isPlaying}
					onRequestFavorites={handleRequestFavorites}
					onToggleFavorite={handleToggleFavorite}
					onPlayTrack={track => sendCommand({category: 'PLAY', track})}
					onPlayRandom={handlePlayRandomFavorite}
					onAddCurrent={() => {
						if (currentTrack) {
							handleToggleFavorite(currentTrack);
						}
					}}
				/>
			)}

			{currentView === 'search' && (
				<div className="view-panel">
					<h2>Search</h2>
					<form
						className="search-form"
						onSubmit={e => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							const query = formData.get('query') as string;
							const searchType = formData.get('type') as
								'all' | 'songs' | 'artists' | 'albums' | 'playlists';
							if (query.trim()) {
								handleSearch(query, searchType);
							}
						}}
					>
						<select name="type" defaultValue="all" aria-label="Search type">
							<option value="all">All</option>
							<option value="songs">Songs</option>
							<option value="artists">Artists</option>
							<option value="albums">Albums</option>
							<option value="playlists">Playlists</option>
						</select>
						<input
							type="text"
							name="query"
							placeholder="Search for music..."
							disabled={!isConnected}
							aria-label="Search query"
						/>
						<button type="submit" disabled={!isConnected}>
							Search
						</button>
					</form>

					{searchResults.length > 0 ? (
						searchResults.map((result, index) => {
							if (result.type !== 'song') return null;
							const track = result.data as Track;
							return (
								<div key={`${result.type}-${index}`} className="result-row">
									<img
										src={`https://img.youtube.com/vi/${track.videoId}/default.jpg`}
										alt=""
										onError={e => {
											(e.currentTarget as HTMLImageElement).style.display =
												'none';
										}}
									/>
									<div className="result-row__meta">
										<div className="result-row__title">{track.title}</div>
										<div className="result-row__artist">
											{track.artists.map(a => a.name).join(', ')}
										</div>
									</div>
									<div className="result-actions">
										<button
											type="button"
											onClick={() => sendCommand({category: 'PLAY', track})}
										>
											Play
										</button>
										<button
											type="button"
											className="secondary"
											onClick={() =>
												sendCommand({category: 'ADD_TO_QUEUE', track})
											}
										>
											+ Queue
										</button>
										<button
											type="button"
											className={`secondary heart-btn${
												favorites.some(f => f.videoId === track.videoId)
													? ' heart-btn--active'
													: ''
											}`}
											aria-label={
												favorites.some(f => f.videoId === track.videoId)
													? 'Remove from favorites'
													: 'Add to favorites'
											}
											aria-pressed={favorites.some(
												f => f.videoId === track.videoId,
											)}
											disabled={!isConnected}
											onClick={() => handleToggleFavorite(track)}
										>
											<Heart
												size={16}
												fill={
													favorites.some(f => f.videoId === track.videoId)
														? 'currentColor'
														: 'none'
												}
												aria-hidden
											/>
										</button>
									</div>
								</div>
							);
						})
					) : (
						<p className="empty-state">
							No results yet. Search for something above.
						</p>
					)}
				</div>
			)}

			{currentView === 'settings' && (
				<div className="view-panel">
					<h2>Settings</h2>
					<div className="settings-field">
						<label htmlFor="settings-volume">Volume: {volume}%</label>
						<input
							id="settings-volume"
							type="range"
							min={0}
							max={100}
							value={volume}
							onChange={e => {
								const v = parseInt(e.target.value, 10);
								sendCommand({category: 'SET_VOLUME', volume: v});
								handleConfigUpdate('volume', v);
							}}
							disabled={!isConnected}
						/>
					</div>
					<div className="settings-field">
						<label htmlFor="settings-repeat">Repeat Mode</label>
						<select
							id="settings-repeat"
							value={repeat}
							onChange={() => sendCommand({category: 'TOGGLE_REPEAT'})}
							disabled={!isConnected}
						>
							<option value="off">Off</option>
							<option value="all">All</option>
							<option value="one">One</option>
						</select>
					</div>
					<div className="settings-field">
						<label className="inline">
							<input
								type="checkbox"
								checked={shuffle}
								onChange={() => sendCommand({category: 'TOGGLE_SHUFFLE'})}
								disabled={!isConnected}
							/>
							<span>Shuffle</span>
						</label>
					</div>
					<div className="settings-field">
						<label className="inline">
							<input
								type="checkbox"
								checked={autoplay}
								onChange={() => sendCommand({category: 'TOGGLE_AUTOPLAY'})}
								disabled={!isConnected}
							/>
							<span>
								Autoplay / Radio — queue related songs when the queue runs out
							</span>
						</label>
					</div>
				</div>
			)}
		</AppShell>
	);
}

export default App;
