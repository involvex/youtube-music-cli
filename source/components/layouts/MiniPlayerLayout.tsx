// Mini player layout - compact single-line player
import { Box, Text } from "ink";

import { usePlayer } from "../../hooks/usePlayer.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import { formatTime } from "../../utils/format.ts";
import { ICONS } from "../../utils/icons.ts";

export default function MiniPlayerLayout() {
  const { theme } = useTheme();
  const { state } = usePlayer();

  const track = state.currentTrack;
  const artist = track?.artists?.map(a => a.name).join(", ") ?? "Unknown";
  const title = track?.title ?? "No track playing";
  const progress = formatTime(state.progress);
  const duration = formatTime(state.duration);
  const playIcon = state.isPlaying ? ICONS.PLAY : ICONS.PAUSE;
  const vol = `${state.volume}%`;
  const speed =
    (state.speed ?? 1.0) !== 1.0 ? ` ${(state.speed ?? 1.0).toFixed(2)}x` : "";

  return (
    <Box
      flexDirection="row"
      paddingX={1}
      gap={1}
    >
      <Text color={state.isPlaying ? theme.colors.success : theme.colors.dim}>
        {playIcon}
      </Text>
      <Text
        bold
        color={theme.colors.primary}
      >
        {title}
      </Text>
      <Text color={theme.colors.dim}>—</Text>
      <Text color={theme.colors.secondary}>{artist}</Text>
      <Text color={theme.colors.dim}>|</Text>
      <Text color={theme.colors.text}>
        {progress}/{duration}
      </Text>
      <Text color={theme.colors.dim}>|</Text>
      <Text color={theme.colors.text}>vol:{vol}</Text>
      {speed && <Text color={theme.colors.accent}>{speed}</Text>}
      {state.isLoading && <Text color={theme.colors.accent}>Loading...</Text>}
    </Box>
  );
}
