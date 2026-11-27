import { Box, Text } from "ink";
// Import progress display component
import { useEffect, useState } from "react";

import { useTheme } from "../../hooks/useTheme.ts";
import type { ImportProgress } from "../../types/import.types.ts";

interface Props {
  progress: ImportProgress;
}

const PROGRESS_BLOCKS = 20;

export default function ImportProgress({ progress }: Props) {
  const { theme } = useTheme();
  const [animatedBlocks, setAnimatedBlocks] = useState(0);

  // Animate progress blocks
  useEffect(() => {
    if (progress.total > 0) {
      const targetBlocks = Math.floor(
        (progress.current / progress.total) * PROGRESS_BLOCKS,
      );
      const delay = Math.max(50, 500 / PROGRESS_BLOCKS); // Max 500ms total animation

      const interval = setInterval(() => {
        setAnimatedBlocks(prev => {
          if (prev >= targetBlocks) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, delay);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [progress]);

  // Calculate completed blocks
  const completedBlocks = Math.min(animatedBlocks, PROGRESS_BLOCKS);
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  // Get status color
  const getStatusColor = () => {
    switch (progress.status) {
      case "fetching":
        return theme.colors.accent;
      case "matching":
        return theme.colors.primary;
      case "creating":
        return theme.colors.success;
      case "completed":
        return theme.colors.success;
      case "failed":
      case "cancelled":
        return theme.colors.error;
      default:
        return theme.colors.dim;
    }
  };

  // Get status label
  const getStatusLabel = () => {
    switch (progress.status) {
      case "fetching":
        return "Fetching playlist...";
      case "matching":
        return "Matching tracks...";
      case "creating":
        return "Creating playlist...";
      case "completed":
        return "Completed!";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Starting...";
    }
  };

  return (
    <Box
      flexDirection="column"
      gap={1}
    >
      {/* Status */}
      <Box paddingX={1}>
        <Text
          bold
          color={getStatusColor()}
        >
          {getStatusLabel()}
        </Text>
      </Box>

      {/* Progress bar */}
      {progress.total > 0 && (
        <Box paddingX={1}>
          <Box>
            {/* Filled blocks */}
            {Array.from({ length: completedBlocks }).map((_, i) => (
              <Text
                key={i}
                backgroundColor={theme.colors.primary}
              >
                {" "}
              </Text>
            ))}

            {/* Empty blocks */}
            {Array.from({ length: PROGRESS_BLOCKS - completedBlocks }).map(
              (_, i) => (
                <Text
                  key={i + completedBlocks}
                  backgroundColor={theme.colors.dim}
                  dimColor
                >
                  {" "}
                </Text>
              ),
            )}
          </Box>
        </Box>
      )}

      {/* Progress info */}
      <Box paddingX={1}>
        <Text color={theme.colors.dim}>
          {progress.total > 0 ? `${progressPercent}%` : "..."} -{" "}
          {progress.current}/{progress.total || "?"}{" "}
          {progress.total === 1 ? "track" : "tracks"}
        </Text>
      </Box>

      {/* Current track */}
      {progress.currentTrack && progress.status === "matching" && (
        <Box paddingX={1}>
          <Text
            color={theme.colors.text}
            dimColor
          >
            {progress.currentTrack.length > 50
              ? `...${progress.currentTrack.slice(-47)}`
              : progress.currentTrack}
          </Text>
        </Box>
      )}

      {/* Message */}
      {progress.message && (
        <Box paddingX={1}>
          <Text color={theme.colors.dim}>{progress.message}</Text>
        </Box>
      )}
    </Box>
  );
}
