import { expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

test("log-rotation: dailyLogFileName uses YYYY-MM-DD", async () => {
  const { dailyLogFileName, formatLogDate, resolveDailyLogPath } =
    await import("../source/services/logger/log-rotation.ts");

  const date = new Date("2026-07-26T12:00:00Z");
  expect(formatLogDate(date)).toBe("2026-07-26");
  expect(dailyLogFileName(date)).toBe("debug-2026-07-26.log");
  expect(resolveDailyLogPath("/tmp/logs", date)).toBe(
    path.join("/tmp/logs", "debug-2026-07-26.log"),
  );
});

test("log-rotation: pruneOldLogFiles keeps 14 days", async () => {
  const { pruneOldLogFiles } =
    await import("../source/services/logger/log-rotation.ts");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ymc-logs-"));
  try {
    const now = new Date("2026-07-26T12:00:00");
    fs.writeFileSync(path.join(dir, "debug-2026-07-26.log"), "today");
    fs.writeFileSync(path.join(dir, "debug-2026-07-13.log"), "keep-edge");
    fs.writeFileSync(path.join(dir, "debug-2026-07-12.log"), "too-old");
    fs.writeFileSync(path.join(dir, "other.txt"), "ignore");

    const deleted = pruneOldLogFiles(dir, 14, now);
    expect(deleted.some(p => p.includes("2026-07-12"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "debug-2026-07-26.log"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "debug-2026-07-13.log"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "debug-2026-07-12.log"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "other.txt"))).toBe(true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("log-rotation: rotateLogIfTooLarge renames oversized file", async () => {
  const { rotateLogIfTooLarge } =
    await import("../source/services/logger/log-rotation.ts");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ymc-rotate-"));
  try {
    const logPath = path.join(dir, "debug-2026-07-26.log");
    fs.writeFileSync(logPath, "x".repeat(100));
    const result = rotateLogIfTooLarge(logPath, 50);
    expect(result).toBe(logPath);
    expect(fs.existsSync(logPath)).toBe(false);
    expect(fs.existsSync(`${logPath}.1`)).toBe(true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
