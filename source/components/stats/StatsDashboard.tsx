import { Box, Text } from "ink";
import { useCallback, useState } from "react";

import { useKeyBinding } from "../../hooks/useKeyboard.ts";
import { useNavigation } from "../../hooks/useNavigation.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import {
  copyTextToClipboard,
  formatStatsShareCard,
  writeStatsShareFile,
} from "../../services/stats/stats-share.ts";
import { useStats } from "../../stores/stats.store.tsx";
import { resolveKeybinding } from "../../utils/keybinding-resolver.ts";
import ListeningTimeline from "./ListeningTimeline.tsx";
import StatsOverview from "./StatsOverview.tsx";
import TopArtistsList from "./TopArtistsList.tsx";
import TopTracksList from "./TopTracksList.tsx";

export default function StatsDashboard() {
  const { theme } = useTheme();
  const { stats } = useStats();
  const { dispatch } = useNavigation();
  const [status, setStatus] = useState<string | null>(null);

  useKeyBinding(resolveKeybinding("BACK"), () => {
    dispatch({ category: "GO_BACK" });
  });

  const shareToClipboard = useCallback(() => {
    void (async () => {
      const card = formatStatsShareCard(stats);
      const copied = await copyTextToClipboard(card);
      setStatus(
        copied
          ? "Share card copied to clipboard"
          : "Clipboard unavailable — press E to export to a file",
      );
    })();
  }, [stats]);

  const exportToFile = useCallback(() => {
    void (async () => {
      const card = formatStatsShareCard(stats);
      const filePath = await writeStatsShareFile(card);
      setStatus(`Exported share card to ${filePath}`);
    })();
  }, [stats]);

  useKeyBinding(["s"], shareToClipboard);
  useKeyBinding(["e"], exportToFile);

  return (
    <Box
      flexDirection="column"
      padding={1}
      gap={1}
    >
      <Box marginBottom={1}>
        <Text
          color={theme.colors.primary}
          bold
        >
          ♪ Listening Stats
        </Text>
        <Text color={theme.colors.dim}> — your listening at a glance</Text>
      </Box>

      <StatsOverview stats={stats} />

      <Box
        flexDirection="row"
        gap={2}
      >
        <Box flexDirection="column">
          <Text color={theme.colors.dim}>Unique Tracks: </Text>
          <Text
            color={theme.colors.text}
            bold
          >
            {stats.uniqueTracks.toLocaleString()}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.colors.dim}>Unique Artists: </Text>
          <Text
            color={theme.colors.text}
            bold
          >
            {stats.uniqueArtists.toLocaleString()}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={theme.colors.dim}>Longest Streak: </Text>
          <Text
            color={theme.colors.text}
            bold
          >
            {stats.longestStreak}d
          </Text>
        </Box>
        {stats.firstPlayDate && (
          <Box flexDirection="column">
            <Text color={theme.colors.dim}>First Play: </Text>
            <Text
              color={theme.colors.text}
              bold
            >
              {stats.firstPlayDate}
            </Text>
          </Box>
        )}
      </Box>

      <TopTracksList tracks={stats.topTracks} />
      <TopArtistsList artists={stats.topArtists} />
      <ListeningTimeline buckets={stats.listeningByDay} />

      {status ? (
        <Box marginTop={1}>
          <Text color={theme.colors.accent}>{status}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color={theme.colors.dim}>
          Esc back • O reopen • S share (clipboard) • E export file
        </Text>
      </Box>
    </Box>
  );
}
