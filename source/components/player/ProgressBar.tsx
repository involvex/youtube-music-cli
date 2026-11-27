// Progress bar component
import { Box, Text } from "ink";

import { usePlayer } from "../../hooks/usePlayer.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import { formatTime } from "../../utils/format.ts";

export default function ProgressBar() {
  const { theme } = useTheme();
  const { state: playerState } = usePlayer();

  if (!playerState.currentTrack || !playerState.duration) {
    return null;
  }

  // Clamp values to valid range
  const progress = Math.max(
    0,
    Math.min(playerState.progress, playerState.duration),
  );
  const duration = playerState.duration;
  const percentage =
    duration > 0 ? Math.min(100, Math.floor((progress / duration) * 100)) : 0;
  const barWidth = Math.min(20, Math.floor(percentage / 5));

  return (
    <Box>
      <Text color={theme.colors.text}>{formatTime(progress)}</Text>
      <Text color={theme.colors.dim}>/</Text>
      <Text color={theme.colors.text}>{formatTime(duration)}</Text>
      <Text> </Text>
      <Text color={theme.colors.primary}>{"█".repeat(barWidth)}</Text>
      <Text color={theme.colors.dim}>{"░".repeat(20 - barWidth)}</Text>
      <Text color={theme.colors.dim}> {percentage}%</Text>
    </Box>
  );
}
