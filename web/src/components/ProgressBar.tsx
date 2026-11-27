import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  progress: number;
  duration: number;
  onSeek: (position: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatAriaTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} minutes ${secs} seconds`;
}

export default function ProgressBar({ progress, duration, onSeek }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const percentage = duration > 0 ? (progress / duration) * 100 : 0;
  const displayPercentage = isDragging
    ? duration > 0
      ? (dragPosition / duration) * 100
      : 0
    : percentage;
  const displayValue = isDragging ? dragPosition : progress;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = progressBarRef.current?.getBoundingClientRect();
      if (!rect || duration <= 0) return;
      const x = clientX - rect.left;
      const newPosition = (x / rect.width) * duration;
      setDragPosition(Math.max(0, Math.min(duration, newPosition)));
    },
    [duration],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      onSeek(dragPosition);
      setIsDragging(false);
    };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      updateFromClientX(e.clientX);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isDragging, dragPosition, duration, onSeek, updateFromClientX]);

  return (
    <div className="progress">
      <div
        ref={progressBarRef}
        className="progress__track"
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(displayValue)}
        aria-valuetext={`${formatAriaTime(displayValue)} of ${formatAriaTime(duration)}`}
        aria-label="Seek"
        onMouseDown={e => {
          setIsDragging(true);
          updateFromClientX(e.clientX);
        }}
        onKeyDown={e => {
          if (duration <= 0) return;
          const step = 5;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onSeek(Math.min(duration, progress + step));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onSeek(Math.max(0, progress - step));
          }
        }}
      >
        <div
          className="progress__fill"
          style={{
            transform: `scaleX(${Math.max(0, Math.min(100, displayPercentage)) / 100})`,
            transition: isDragging ? "none" : "transform 0.1s linear",
          }}
        />
      </div>
      <div className="progress__times">
        <span>{formatTime(displayValue)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
