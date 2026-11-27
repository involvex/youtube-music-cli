import process from "node:process";

import { useEffect } from "react";

import {
  buildTerminalTitle,
  formatTerminalTitleSequence,
} from "../utils/terminal-title.ts";
import { usePlayer } from "./usePlayer.ts";

export function useTerminalTitle(): void {
  const { state } = usePlayer();
  const { currentTrack, isPlaying } = state;

  useEffect(() => {
    if (!process.stdout.isTTY) {
      return;
    }
    process.stdout.write(
      formatTerminalTitleSequence(
        buildTerminalTitle({ currentTrack, isPlaying }),
      ),
    );
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    return () => {
      if (!process.stdout.isTTY) {
        return;
      }
      process.stdout.write(formatTerminalTitleSequence("youtube-music-cli"));
    };
  }, []);
}
