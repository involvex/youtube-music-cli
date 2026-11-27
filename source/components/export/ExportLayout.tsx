import { Box, Text } from "ink";
// Export layout component for playlist export
import { useCallback, useMemo, useState } from "react";

import { useKeyBinding } from "../../hooks/useKeyboard.ts";
import { useNavigation } from "../../hooks/useNavigation.ts";
import { useTheme } from "../../hooks/useTheme.ts";
import { getConfigService } from "../../services/config/config.service.ts";
import {
  type ExportFormat,
  getExportService,
} from "../../services/export/export.service.ts";
import { resolveKeybinding } from "../../utils/keybinding-resolver.ts";

const FORMATS: Array<{ key: ExportFormat; label: string }> = [
  { key: "json", label: "JSON" },
  { key: "m3u8", label: "M3U8" },
  { key: "both", label: "Both (JSON + M3U8)" },
];

export default function ExportLayout() {
  const { theme } = useTheme();
  const { dispatch } = useNavigation();
  const config = getConfigService();
  const exportService = getExportService();

  const [step, setStep] = useState<
    "format" | "playlist" | "exporting" | "result"
  >("format");
  const [selectedFormat, setSelectedFormat] = useState(2); // Default to 'both'
  const [selectedPlaylist, setSelectedPlaylist] = useState(-1); // -1 means "Export All"
  const [results, setResults] = useState<
    Array<{
      playlistName: string;
      success: boolean;
      files: string[];
      error?: string;
    }>
  >([]);

  const playlists = useMemo(() => config.get("playlists") || [], [config]);

  const goBack = useCallback(() => {
    if (step === "format") {
      dispatch({ category: "GO_BACK" });
    } else if (step === "playlist") {
      setStep("format");
    } else if (step === "result") {
      setStep("format");
      setResults([]);
    }
  }, [step, dispatch]);

  const selectFormat = useCallback(() => {
    setStep("playlist");
  }, []);

  const startExport = useCallback(async () => {
    setStep("exporting");

    const format = FORMATS[selectedFormat]!.key;

    try {
      if (selectedPlaylist === -1) {
        // Export all playlists
        const exportResults = await exportService.exportAllPlaylists(
          playlists,
          {
            format,
          },
        );
        setResults(exportResults);
      } else {
        // Export single playlist
        const result = await exportService.exportPlaylist(
          playlists[selectedPlaylist]!,
          {
            format,
          },
        );
        setResults([result]);
      }
    } catch (error) {
      setResults([
        {
          playlistName: "Error",
          success: false,
          files: [],
          error: error instanceof Error ? error.message : String(error),
        },
      ]);
    } finally {
      setStep("result");
    }
  }, [selectedFormat, selectedPlaylist, playlists, exportService]);

  // Keyboard bindings
  useKeyBinding(resolveKeybinding("UP"), () => {
    if (step === "format") {
      setSelectedFormat(prev => Math.max(0, prev - 1));
    } else if (step === "playlist") {
      setSelectedPlaylist(prev => Math.max(-1, prev - 1));
    }
  });

  useKeyBinding(resolveKeybinding("DOWN"), () => {
    if (step === "format") {
      setSelectedFormat(prev => Math.min(FORMATS.length - 1, prev + 1));
    } else if (step === "playlist") {
      setSelectedPlaylist(prev =>
        Math.min(
          playlists.length - 1,
          prev === -1 && playlists.length > 0 ? 0 : prev + 1,
        ),
      );
    }
  });

  useKeyBinding(resolveKeybinding("SELECT"), () => {
    if (step === "format") selectFormat();
    else if (step === "playlist") startExport();
    else if (step === "result") goBack();
  });

  useKeyBinding(resolveKeybinding("BACK"), goBack);

  return (
    <Box
      flexDirection="column"
      gap={1}
      paddingX={1}
    >
      {/* Header */}
      <Box
        borderStyle="double"
        borderColor={theme.colors.secondary}
        paddingX={1}
        marginBottom={1}
      >
        <Text
          bold
          color={theme.colors.primary}
        >
          Export Playlists
        </Text>
      </Box>

      {/* Step: Format selection */}
      {step === "format" && (
        <Box
          flexDirection="column"
          gap={1}
        >
          <Text color={theme.colors.dim}>Select export format:</Text>
          {FORMATS.map((format, index) => (
            <Box
              key={format.key}
              paddingX={1}
            >
              <Text
                backgroundColor={
                  index === selectedFormat ? theme.colors.primary : undefined
                }
                color={
                  index === selectedFormat
                    ? theme.colors.background
                    : theme.colors.text
                }
                bold={index === selectedFormat}
              >
                {index === selectedFormat ? "► " : "  "}
                {format.label}
              </Text>
            </Box>
          ))}
          {playlists.length === 0 && (
            <Box
              marginTop={1}
              paddingX={1}
            >
              <Text color={theme.colors.error}>
                No playlists found. Create or import playlists first.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Step: Playlist selection */}
      {step === "playlist" && (
        <Box
          flexDirection="column"
          gap={1}
        >
          <Text color={theme.colors.dim}>Select playlist to export:</Text>
          {/* Export All option */}
          <Box paddingX={1}>
            <Text
              backgroundColor={
                selectedPlaylist === -1 ? theme.colors.primary : undefined
              }
              color={
                selectedPlaylist === -1
                  ? theme.colors.background
                  : theme.colors.text
              }
              bold={selectedPlaylist === -1}
            >
              {selectedPlaylist === -1 ? "► " : "  "}
              Export All ({playlists.length} playlists)
            </Text>
          </Box>
          {/* Individual playlists */}
          {playlists.map((playlist, index) => (
            <Box
              key={playlist.playlistId}
              paddingX={1}
            >
              <Text
                backgroundColor={
                  index === selectedPlaylist ? theme.colors.primary : undefined
                }
                color={
                  index === selectedPlaylist
                    ? theme.colors.background
                    : theme.colors.text
                }
                bold={index === selectedPlaylist}
              >
                {index === selectedPlaylist ? "► " : "  "}
                {playlist.name} ({playlist.tracks.length} tracks)
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Step: Exporting */}
      {step === "exporting" && (
        <Box
          flexDirection="column"
          gap={1}
        >
          <Text color={theme.colors.primary}>Exporting...</Text>
          <Text color={theme.colors.dim}>
            {selectedPlaylist === -1
              ? `Exporting ${playlists.length} playlists...`
              : `Exporting ${playlists[selectedPlaylist]?.name || "playlist"}...`}
          </Text>
        </Box>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <Box
          flexDirection="column"
          gap={1}
        >
          <Box paddingX={1}>
            <Text
              color={theme.colors.success}
              bold
            >
              Export completed!
            </Text>
          </Box>
          {results.map((result, index) => (
            <Box
              key={index}
              flexDirection="column"
              gap={1}
              paddingX={1}
            >
              {result.success ? (
                <>
                  <Text color={theme.colors.success}>
                    ✓ {result.playlistName}
                  </Text>
                  {result.files.length > 0 && (
                    <Box
                      flexDirection="column"
                      paddingLeft={2}
                    >
                      <Text color={theme.colors.dim}>Exported to:</Text>
                      {result.files.map(file => (
                        <Text
                          key={file}
                          color={theme.colors.primary}
                        >
                          • {file}
                        </Text>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Text color={theme.colors.error}>
                  ✗ {result.playlistName}: {result.error}
                </Text>
              )}
            </Box>
          ))}
          <Box
            marginTop={1}
            paddingX={1}
          >
            <Text color={theme.colors.dim}>Press Enter to continue</Text>
          </Box>
        </Box>
      )}

      {/* Help text */}
      {step !== "exporting" && step !== "result" && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim}>
            {step === "format"
              ? "↑↓ to select, Enter to continue, Esc/q to go back"
              : "↑↓ to select, Enter to export, Esc to go back"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
