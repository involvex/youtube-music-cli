import { Box, Text } from "ink";
import { useCallback, useEffect, useState } from "react";

import { useKeyBinding } from "../../hooks/useKeyboard.ts";
import { useNavigation } from "../../hooks/useNavigation.ts";
import { usePlayer } from "../../hooks/usePlayer.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import {
  findMaterializedPlaylist,
  listDefinitions,
  refreshAll,
  refreshOne,
} from "../../services/smart-playlist/smart-playlist.service.ts";
import type { SmartPlaylistDefinition } from "../../types/smart-playlist.types.ts";
import { VIEW } from "../../utils/constants.ts";
import { truncate } from "../../utils/format.ts";
import { resolveKeybinding } from "../../utils/keybinding-resolver.ts";

export default function SmartPlaylistList() {
  const { theme } = useTheme();
  const { play, setQueue } = usePlayer();
  const { dispatch } = useNavigation();
  const [definitions, setDefinitions] = useState<SmartPlaylistDefinition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reload = useCallback(async () => {
    const defs = await listDefinitions();
    setDefinitions(defs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listDefinitions()
      .then(defs => {
        if (!cancelled) {
          setDefinitions(defs);
        }
      })
      .catch(() => {
        // Keep empty list; user can retry with refresh
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const navigateUp = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);

  const navigateDown = useCallback(() => {
    setSelectedIndex(prev =>
      Math.min(definitions.length === 0 ? 0 : definitions.length - 1, prev + 1),
    );
  }, [definitions.length]);

  const playSelected = useCallback(() => {
    const definition = definitions[selectedIndex];
    if (!definition) return;
    const playlist = findMaterializedPlaylist(definition.id);
    if (!playlist || playlist.tracks.length === 0) {
      setStatus("No tracks yet — press r to refresh from history.");
      return;
    }
    setQueue([...playlist.tracks]);
    const first = playlist.tracks[0];
    if (!first) return;
    play(first);
    setStatus(`Playing "${playlist.name}" (${playlist.tracks.length} tracks)`);
  }, [definitions, play, selectedIndex, setQueue]);

  const refreshSelected = useCallback(() => {
    const definition = definitions[selectedIndex];
    if (!definition || isRefreshing) return;
    setIsRefreshing(true);
    setStatus(`Refreshing "${definition.name}"...`);
    void refreshOne(definition.id)
      .then(result => {
        setStatus(
          `Updated "${result.definition.name}" (${result.trackCount} tracks)`,
        );
        return reload();
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Refresh failed");
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [definitions, isRefreshing, reload, selectedIndex]);

  const refreshEverything = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setStatus("Refreshing all smart playlists...");
    void refreshAll()
      .then(results => {
        setStatus(`Refreshed ${results.length} smart playlists`);
        return reload();
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Refresh failed");
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [isRefreshing, reload]);

  useKeyBinding(resolveKeybinding("UP"), navigateUp);
  useKeyBinding(resolveKeybinding("DOWN"), navigateDown);
  useKeyBinding(resolveKeybinding("SELECT"), playSelected);
  useKeyBinding(["r"], refreshSelected);
  useKeyBinding(["R", "shift+r"], refreshEverything);
  useKeyBinding(resolveKeybinding("BACK"), () => {
    dispatch({ category: "NAVIGATE", view: VIEW.HOME });
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text
          bold
          color={theme.colors.primary}
        >
          Smart Playlists ({definitions.length})
        </Text>
      </Box>
      {definitions.length === 0 ? (
        <Text color={theme.colors.dim}>Loading smart playlists...</Text>
      ) : (
        definitions.map((definition, index) => {
          const playlist = findMaterializedPlaylist(definition.id);
          const trackCount = playlist?.tracks.length ?? 0;
          const selected = index === selectedIndex;
          const label = `${definition.name} · ${trackCount} tracks${
            definition.lastGeneratedAt
              ? ` · ${definition.lastGeneratedAt.slice(0, 10)}`
              : ""
          }`;
          return (
            <Box
              key={definition.id}
              paddingX={1}
            >
              <Text
                backgroundColor={selected ? theme.colors.primary : undefined}
                color={selected ? theme.colors.background : theme.colors.text}
                bold={selected}
              >
                {truncate(label, 72)}
              </Text>
            </Box>
          );
        })
      )}
      {status ? (
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>{status}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color={theme.colors.dim}>
          Enter play · r refresh · Shift+R refresh all · Esc back
        </Text>
      </Box>
    </Box>
  );
}
