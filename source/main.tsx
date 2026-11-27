import { Box, Text } from "ink";
import { useEffect, useRef, useState } from "react";

import BootScreen from "./components/common/BootScreen.tsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.tsx";
import MainLayout from "./components/layouts/MainLayout.tsx";
import { ThemeProvider } from "./contexts/theme.context.tsx";
import { KeyboardManager, useKeyBinding } from "./hooks/useKeyboard.ts";
import { KeyboardBlockProvider } from "./hooks/useKeyboardBlocker.tsx";
import { useNavigation } from "./hooks/useNavigation.ts";
import { usePlayer } from "./hooks/usePlayer.ts";
import { useYouTubeMusic } from "./hooks/useYouTubeMusic.ts";
import { getConfigService } from "./services/config/config.service.ts";
import { getNotificationService } from "./services/notification/notification.service.ts";
import { loadPlayerState } from "./services/player-state/player-state.service.ts";
import { ChatProvider } from "./stores/chat.store.tsx";
import { FavoritesProvider } from "./stores/favorites.store.tsx";
import { HistoryProvider } from "./stores/history.store.tsx";
// Main application orchestrator
import { NavigationProvider } from "./stores/navigation.store.tsx";
import { PlayerProvider } from "./stores/player.store.tsx";
import { PluginsProvider } from "./stores/plugins.store.tsx";
import { StatsProvider } from "./stores/stats.store.tsx";
import type { Flags } from "./types/cli.types.ts";
import type { Track } from "./types/youtube-music.types.ts";
import { hasCliPlaybackLaunchIntent } from "./utils/cli-launch-intent.ts";
import { VIEW } from "./utils/constants.ts";
import { resolveKeybinding } from "./utils/keybinding-resolver.ts";

function Initializer({
  flags,
  isBooted,
}: {
  flags?: Flags;
  isBooted: boolean;
}) {
  const { dispatch } = useNavigation();
  const { play, dispatch: playerDispatch, startRadio } = usePlayer();
  const { getTrack, getPlaylist } = useYouTubeMusic();
  const didResumeRef = useRef(false);
  const didLaunchRef = useRef(false);

  useKeyBinding(resolveKeybinding("FAVORITES_VIEW"), () => {
    dispatch({ category: "NAVIGATE", view: VIEW.FAVORITES });
  });

  useKeyBinding(resolveKeybinding("AI_CHAT"), () => {
    const config = getConfigService();
    if (!config.getLLMEnabled()) {
      getNotificationService().notify(
        "AI Assistant is OFF",
        "Enable it in Settings to use this key",
      );
      return;
    }

    dispatch({ category: "NAVIGATE", view: VIEW.AI_CHAT });
  });

  useKeyBinding(resolveKeybinding("AI_RECOMMENDATIONS"), () => {
    const config = getConfigService();
    if (!config.getLLMEnabled()) {
      getNotificationService().notify(
        "AI Assistant is OFF",
        "Enable it in Settings to use this key",
      );
      return;
    }

    dispatch({ category: "NAVIGATE", view: VIEW.AI_RECOMMENDATIONS });
  });

  useEffect(() => {
    void (async () => {
      try {
        const { getAuthService } =
          await import("./services/auth/auth.service.ts");
        const authService = getAuthService();
        if (authService.getStatus().loggedIn) {
          // Client will be created with auth when first used
        }
      } catch {
        // Non-fatal
      }
    })();
  }, []);

  useEffect(() => {
    void import("./services/smart-playlist/smart-playlist-boot.ts").then(
      ({ maybeRefreshSmartPlaylistsOnLaunch }) => {
        maybeRefreshSmartPlaylistsOnLaunch();
      },
    );
  }, []);

  useEffect(() => {
    if (!isBooted || didLaunchRef.current) {
      return;
    }

    // Check for background playback state on startup
    const config = getConfigService();
    const backgroundState = config.getBackgroundPlaybackState();

    if (backgroundState.enabled && !hasCliPlaybackLaunchIntent(flags)) {
      const notification = getNotificationService();
      notification.setEnabled(true);
      void notification.notify(
        "Background Playback Active",
        "Press Shift+R to resume control",
      );
    }

    if (flags?.showSuggestions) {
      didLaunchRef.current = true;
      dispatch({ category: "NAVIGATE", view: VIEW.SUGGESTIONS });
    } else if (flags?.radioSeed) {
      didLaunchRef.current = true;
      const seed = flags.radioSeed;
      void startRadio(seed).then(success => {
        if (!success) {
          getNotificationService().notify(
            seed.name || "Radio",
            "No tracks found to start radio",
          );
        }
      });
    } else if (flags?.searchQuery) {
      didLaunchRef.current = true;
      dispatch({ category: "NAVIGATE", view: VIEW.SEARCH });
      dispatch({ category: "SET_SEARCH_QUERY", query: flags.searchQuery });
    } else if (flags?.playTrack) {
      didLaunchRef.current = true;
      void getTrack(flags.playTrack).then(track => {
        if (track) {
          play(track);
        } else {
          getNotificationService().notify(
            "Play failed",
            `Track not found: ${flags.playTrack}`,
          );
        }
      });
    } else if (flags?.playPlaylist) {
      didLaunchRef.current = true;
      dispatch({ category: "NAVIGATE", view: VIEW.PLAYLISTS });
      void getPlaylist(flags.playPlaylist).then(playlist => {
        if (playlist) {
          dispatch({ category: "SET_SELECTED_PLAYLIST", index: 0 });
        }
      });
    }
  }, [isBooted, flags, dispatch, play, getTrack, getPlaylist, startRadio]);

  useEffect(() => {
    if (!flags?.continue || didResumeRef.current) {
      return;
    }

    didResumeRef.current = true;

    void loadPlayerState().then(persistedState => {
      const hasTrack = Boolean(persistedState?.currentTrack);
      const hasStation = Boolean(persistedState?.currentStation);

      if (!persistedState || (!hasTrack && !hasStation)) {
        getNotificationService().notify(
          "No previous playback to resume",
          "Play a track, radio station, or live stream first",
        );
        return;
      }

      playerDispatch({
        category: "RESTORE_STATE",
        currentTrack: persistedState.currentTrack,
        queue: persistedState.queue,
        queuePosition: persistedState.queuePosition,
        progress: persistedState.progress,
        volume: persistedState.volume,
        shuffle: persistedState.shuffle,
        repeat: persistedState.repeat,
        autoplay: persistedState.autoplay ?? true,
        startPlayback: true,
        playbackMode: persistedState.playbackMode ?? "youtube",
        currentStation: persistedState.currentStation ?? null,
        radioIsActive: persistedState.radioIsActive ?? false,
        radioSeed: persistedState.radioSeed ?? null,
      });

      getNotificationService().notify(
        "Resuming playback",
        hasTrack
          ? (persistedState.currentTrack?.title ?? "Unknown")
          : (persistedState.currentStation?.name ?? "Unknown station"),
      );
    });
  }, [flags?.continue, playerDispatch]);

  return null;
}

function HeadlessLayout({ flags }: { flags?: Flags }) {
  const {
    play,
    pause,
    resume,
    next,
    previous,
    playStream,
    dispatch,
    startRadio,
  } = usePlayer();
  const { getTrack, getPlaylist, search } = useYouTubeMusic();
  const didResumeRef = useRef(false);

  useEffect(() => {
    void (async () => {
      if (flags?.radioSeed) {
        const success = await startRadio(flags.radioSeed);
        if (!success) {
          console.error(
            `No tracks found for ${flags.radioSeed.name || "radio"}`,
          );
          process.exitCode = 1;
          return;
        }
        console.log(`Started ${flags.radioSeed.name || "radio"}`);
        return;
      }

      if (flags?.playTrack) {
        const track = await getTrack(flags.playTrack);
        if (!track) {
          console.error(`Track not found: ${flags.playTrack}`);
          process.exitCode = 1;
          return;
        }

        play(track);
        console.log(`Playing: ${track.title}`);
        return;
      }

      if (flags?.searchQuery) {
        const response = await search(flags.searchQuery, {
          type: "songs",
          limit: 1,
        });
        const songResult = response?.results.find(
          result => result.type === "song",
        );
        if (!songResult) {
          console.error(`No playable tracks found for: "${flags.searchQuery}"`);
          process.exitCode = 1;
          return;
        }

        const track = songResult.data as Track;
        play(track, { clearQueue: true });
        console.log(`Playing: ${track.title}`);
        return;
      }

      if (flags?.playPlaylist) {
        const playlist = await getPlaylist(flags.playPlaylist);
        const firstTrack = playlist?.tracks[0];
        if (!firstTrack) {
          console.error(
            `No playable tracks found in playlist: ${flags.playPlaylist}`,
          );
          process.exitCode = 1;
          return;
        }

        play(firstTrack, { clearQueue: true });
        console.log(`Playing playlist "${playlist.name}": ${firstTrack.title}`);
        return;
      }

      if (flags?.action === "pause") pause();
      if (flags?.action === "resume") resume();
      if (flags?.action === "next") next();
      if (flags?.action === "previous") previous();

      if (flags?.continue) {
        if (didResumeRef.current) {
          return;
        }
        didResumeRef.current = true;

        const persistedState = await loadPlayerState();
        if (persistedState?.currentStation) {
          const station = persistedState.currentStation;
          playStream(station);
          console.log(`Resuming stream: ${station.name}`);
          return;
        }

        if (!persistedState?.currentTrack) {
          console.error("No previous playback to resume");
          process.exitCode = 1;
          return;
        }

        const track = persistedState.currentTrack;
        const queue =
          persistedState.queue.length > 0 ? persistedState.queue : [track];

        dispatch({
          category: "RESTORE_STATE",
          currentTrack: track,
          queue,
          queuePosition: persistedState.queuePosition,
          progress: persistedState.progress,
          volume: persistedState.volume,
          shuffle: persistedState.shuffle,
          repeat: persistedState.repeat,
          autoplay: persistedState.autoplay ?? true,
          startPlayback: true,
          explicitQueueLength: persistedState.explicitQueueLength,
          playbackMode: persistedState.playbackMode ?? "youtube",
          currentStation: null,
          radioIsActive: persistedState.radioIsActive ?? false,
          radioSeed: persistedState.radioSeed ?? null,
        });

        console.log(`Resuming: ${track.title}`);
      }
    })();
  }, [
    flags,
    play,
    playStream,
    pause,
    resume,
    next,
    previous,
    dispatch,
    getTrack,
    getPlaylist,
    search,
    startRadio,
  ]);

  return (
    <Box padding={1}>
      <Text color="green">Headless mode active.</Text>
    </Box>
  );
}

export default function Main({ flags }: { flags?: Flags }) {
  const [isBooted, setIsBooted] = useState(false);
  const skipMediaRestore = hasCliPlaybackLaunchIntent(flags);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PlayerProvider skipMediaRestore={skipMediaRestore}>
          <FavoritesProvider>
            <HistoryProvider>
              <StatsProvider>
                <NavigationProvider>
                  <ChatProvider>
                    <PluginsProvider>
                      <KeyboardBlockProvider>
                        <Box flexDirection="column">
                          <KeyboardManager />
                          {flags?.headless ? (
                            <HeadlessLayout flags={flags} />
                          ) : (
                            <>
                              <Initializer
                                flags={flags}
                                isBooted={isBooted}
                              />
                              {isBooted ? (
                                <MainLayout />
                              ) : (
                                <BootScreen
                                  onBooted={() => setIsBooted(true)}
                                />
                              )}
                            </>
                          )}
                        </Box>
                      </KeyboardBlockProvider>
                    </PluginsProvider>
                  </ChatProvider>
                </NavigationProvider>
              </StatsProvider>
            </HistoryProvider>
          </FavoritesProvider>
        </PlayerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
