// Hook for managing the sleep timer
import { useCallback, useEffect, useRef, useState } from "react";

import { getPlayerService } from "../services/player/player.service.ts";
import {
  getSleepTimerService,
  SLEEP_TIMER_PRESETS,
  type SleepTimerPreset,
} from "../services/sleep-timer/sleep-timer.service.ts";
import { usePlayer } from "./usePlayer.ts";

export function useSleepTimer() {
  const { pause, state } = usePlayer();
  const timerService = getSleepTimerService();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [activeMinutes, setActiveMinutes] = useState<number | null>(null);
  const volumeRef = useRef(state.volume);

  useEffect(() => {
    volumeRef.current = state.volume;
  }, [state.volume]);

  // Poll remaining time every second while mounted
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timerService.isActive()) {
        setRemainingSeconds(null);
        setActiveMinutes(null);
        return;
      }
      setRemainingSeconds(timerService.getRemainingSeconds());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [timerService]);

  const startTimer = useCallback(
    (minutes: SleepTimerPreset) => {
      setActiveMinutes(minutes);
      setRemainingSeconds(minutes * 60);
      timerService.start(
        minutes,
        () => {
          pause();
          setActiveMinutes(null);
          setRemainingSeconds(null);
        },
        {
          onFadeStart: () => volumeRef.current,
          onFadeTick: volume => {
            getPlayerService().setVolume(volume);
          },
          onFadeEnd: () => {
            getPlayerService().setVolume(volumeRef.current);
          },
        },
      );
    },
    [timerService, pause],
  );

  const cancelTimer = useCallback(() => {
    timerService.cancel();
    setActiveMinutes(null);
    setRemainingSeconds(null);
  }, [timerService]);

  return {
    isActive: timerService.isActive(),
    activeMinutes,
    remainingSeconds,
    startTimer,
    cancelTimer,
    presets: SLEEP_TIMER_PRESETS,
  };
}
