/**
 * Format a download progress line for TUI / immersive status.
 */
export function formatDownloadProgress(info: {
  current: number;
  total: number;
  track: { title: string };
  phase: "start" | "done" | "skip" | "fail" | "cancel";
  error?: string;
}): string {
  const title = info.track.title || "Unknown";
  const prefix = `[${info.current}/${info.total}]`;
  switch (info.phase) {
    case "start":
      return `${prefix} Downloading: ${title}`;
    case "done":
      return `${prefix} Saved: ${title}`;
    case "skip":
      return `${prefix} Skipped (exists): ${title}`;
    case "fail":
      return `${prefix} Failed: ${title}${info.error ? ` — ${info.error}` : ""}`;
    case "cancel":
      return `${prefix} Cancelled: ${title}`;
  }
}

export function formatDownloadSummary(summary: {
  downloaded: number;
  skipped: number;
  failed: number;
  cancelled: number;
}): string {
  const parts = [
    `Downloaded ${summary.downloaded}`,
    `skipped ${summary.skipped}`,
    `failed ${summary.failed}`,
  ];
  if (summary.cancelled > 0) {
    parts.push(`cancelled ${summary.cancelled}`);
  }
  return `${parts.join(", ")}.`;
}
