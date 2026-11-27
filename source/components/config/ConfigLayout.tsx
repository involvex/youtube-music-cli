// Config screen layout
import { Box, Text } from "ink";
import { useCallback, useState } from "react";

import { useKeyBinding } from "../../hooks/useKeyboard.ts";
import { useNavigation } from "../../hooks/useNavigation.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import { getConfigService } from "../../services/config/config.service.ts";
import { logger } from "../../services/logger/logger.service.ts";
import { resolveKeybinding } from "../../utils/keybinding-resolver.ts";

type ConfigSection = "theme" | "quality" | "volumeStep";
type StreamQuality = "low" | "medium" | "high";

export default function ConfigLayout() {
  const { theme, setTheme } = useTheme();
  const { dispatch } = useNavigation();
  const [selectedSection, setSelectedSection] =
    useState<ConfigSection>("theme");
  const config = getConfigService();

  // Navigate sections
  const goUp = useCallback(() => {
    const sections: ConfigSection[] = ["theme", "quality", "volumeStep"];
    const currentIndex = sections.indexOf(selectedSection);
    if (currentIndex > 0) {
      setSelectedSection(sections[currentIndex - 1]!);
    }
  }, [selectedSection]);

  const goDown = useCallback(() => {
    const sections: ConfigSection[] = ["theme", "quality", "volumeStep"];
    const currentIndex = sections.indexOf(selectedSection);
    if (currentIndex < sections.length - 1) {
      setSelectedSection(sections[currentIndex + 1]!);
    }
  }, [selectedSection]);

  // Handle Enter key based on selected section
  const handleSelect = useCallback(() => {
    if (selectedSection === "theme") {
      const themes = ["dark", "light", "midnight", "matrix"] as const;
      const currentTheme = theme.name;
      const currentIndex = themes.indexOf(
        currentTheme as (typeof themes)[number],
      );
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex]!;
      setTheme(nextTheme);
      config.set("theme", nextTheme);
    } else if (selectedSection === "quality") {
      const qualities: StreamQuality[] = ["low", "medium", "high"];
      const currentQuality = config.get("streamQuality") as StreamQuality;
      const currentIndex = qualities.indexOf(currentQuality);
      const nextIndex = (currentIndex + 1) % qualities.length;
      config.set("streamQuality", qualities[nextIndex]!);
    }
  }, [selectedSection, config, theme, setTheme]);

  // Change volume step
  const increaseVolumeStep = useCallback(() => {
    if (selectedSection === "volumeStep") {
      const current = config.get("volume") as number;
      if (current < 100) {
        logger.debug("ConfigLayout", "increaseVolumeStep called", {
          oldVolume: current,
          newVolume: Math.min(100, current + 10),
          selectedSection,
        });
        config.set("volume", Math.min(100, current + 10));
      }
    }
  }, [selectedSection, config]);

  const decreaseVolumeStep = useCallback(() => {
    if (selectedSection === "volumeStep") {
      const current = config.get("volume") as number;
      if (current > 0) {
        logger.debug("ConfigLayout", "decreaseVolumeStep called", {
          oldVolume: current,
          newVolume: Math.max(0, current - 10),
          selectedSection,
        });
        config.set("volume", Math.max(0, current - 10));
      }
    }
  }, [selectedSection, config]);

  // Go back
  const goBack = useCallback(() => {
    dispatch({ category: "GO_BACK" });
  }, [dispatch]);

  useKeyBinding(resolveKeybinding("UP"), goUp);
  useKeyBinding(resolveKeybinding("DOWN"), goDown);
  useKeyBinding(resolveKeybinding("SELECT"), handleSelect);
  useKeyBinding(resolveKeybinding("VOLUME_UP"), increaseVolumeStep);
  useKeyBinding(resolveKeybinding("VOLUME_DOWN"), decreaseVolumeStep);
  useKeyBinding(resolveKeybinding("BACK"), goBack);

  const currentTheme = theme.name;
  const currentQuality =
    (config.get("streamQuality") as StreamQuality) || "high";
  const currentVolume = (config.get("volume") as number) || 70;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor={theme.colors.secondary}
        paddingX={1}
      >
        <Text
          bold
          color={theme.colors.primary}
        >
          Settings
        </Text>
      </Box>

      {/* Theme Selection */}
      <Box
        paddingX={1}
        borderStyle="single"
        borderColor={
          selectedSection === "theme" ? theme.colors.primary : theme.colors.dim
        }
      >
        <Text color={theme.colors.text}>
          Theme: <Text color={theme.colors.primary}>{currentTheme}</Text>
        </Text>
        {selectedSection === "theme" && (
          <Text color={theme.colors.dim}> (Press Enter to cycle)</Text>
        )}
      </Box>

      {/* Quality Selection */}
      <Box
        paddingX={1}
        borderStyle="single"
        borderColor={
          selectedSection === "quality"
            ? theme.colors.primary
            : theme.colors.dim
        }
      >
        <Text color={theme.colors.text}>
          Stream Quality:{" "}
          <Text color={theme.colors.primary}>{currentQuality}</Text>
        </Text>
        {selectedSection === "quality" && (
          <Text color={theme.colors.dim}> (Press Enter to cycle)</Text>
        )}
      </Box>

      {/* Volume Step */}
      <Box
        paddingX={1}
        borderStyle="single"
        borderColor={
          selectedSection === "volumeStep"
            ? theme.colors.primary
            : theme.colors.dim
        }
      >
        <Text color={theme.colors.text}>
          Default Volume:{" "}
          <Text color={theme.colors.primary}>{currentVolume}%</Text>
        </Text>
        {selectedSection === "volumeStep" && (
          <Text color={theme.colors.dim}> (Press =/- to adjust)</Text>
        )}
      </Box>
    </Box>
  );
}
