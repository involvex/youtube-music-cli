import { Box, Text } from "ink";
import { useState } from "react";

import { BUILTIN_MOODS } from "../../data/builtin-moods.ts";
import { useKeyBinding } from "../../hooks/useKeyboard.ts";
import { useNavigation } from "../../hooks/useNavigation.ts";
import { usePlayer } from "../../hooks/usePlayer.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import type { RadioSeed } from "../../types/radio.types.ts";
import { VIEW } from "../../utils/constants.ts";
import { resolveKeybinding } from "../../utils/keybinding-resolver.ts";

export default function MoodRadioLayout() {
  const { theme } = useTheme();
  const { dispatch } = useNavigation();
  const { startRadio } = usePlayer();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useKeyBinding(resolveKeybinding("UP"), () => {
    setSelectedIndex(i => Math.max(0, i - 1));
    setError(null);
  });
  useKeyBinding(resolveKeybinding("DOWN"), () => {
    setSelectedIndex(i => Math.min(BUILTIN_MOODS.length - 1, i + 1));
    setError(null);
  });
  useKeyBinding(resolveKeybinding("BACK"), () => {
    dispatch({ category: "GO_BACK" });
  });
  useKeyBinding(resolveKeybinding("QUIT"), () => {
    dispatch({ category: "GO_BACK" });
  });
  useKeyBinding(resolveKeybinding("SELECT"), async () => {
    const mood = BUILTIN_MOODS[selectedIndex];
    if (!mood || isLoading) return;

    setIsLoading(true);
    setError(null);

    const seed: RadioSeed = { type: "mood", id: mood.id, name: mood.name };
    const success = await startRadio(seed);

    setIsLoading(false);

    if (success) {
      dispatch({ category: "NAVIGATE", view: VIEW.PLAYER });
    } else {
      setError(
        `No tracks found for "${mood.name}" mood. Try a different mood or check your connection.`,
      );
    }
  });

  const mood = BUILTIN_MOODS[selectedIndex];

  return (
    <Box
      flexDirection="column"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text
          color={theme.colors.primary}
          bold
        >
          Mood Radio
        </Text>
      </Box>

      {BUILTIN_MOODS.map((m, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={m.id + String(index)}>
            <Text color={isSelected ? theme.colors.primary : theme.colors.dim}>
              {isSelected ? "▶ " : `${String(index + 1).padStart(2)}. `}
            </Text>
            <Text
              color={isSelected ? theme.colors.primary : theme.colors.text}
              bold={isSelected}
            >
              {m.name}
            </Text>
          </Box>
        );
      })}

      {mood && !error && (
        <Box
          marginTop={1}
          flexDirection="column"
        >
          <Text color={theme.colors.dim}>{mood.description}</Text>
          <Text color={theme.colors.dim}>
            {mood.seeds.length} seeds · Press Enter to start
          </Text>
        </Box>
      )}

      {isLoading && (
        <Box marginTop={1}>
          <Text color={theme.colors.primary}>
            Starting {mood?.name} radio...
          </Text>
        </Box>
      )}

      {error && (
        <Box
          marginTop={1}
          flexDirection="column"
        >
          <Text color={theme.colors.error}>{error}</Text>
          <Text color={theme.colors.dim}>Press ↑/↓ to select another mood</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={theme.colors.dim}>
          ↑/↓ Navigate | Enter Start Radio | Esc/q Back
        </Text>
      </Box>
    </Box>
  );
}
