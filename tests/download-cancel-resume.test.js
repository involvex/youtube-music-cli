import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

afterEach(async () => {
  const { resetDownloadServiceForTests } =
    await import("../source/services/download/download.service.ts");
  resetDownloadServiceForTests();
});

test("formatDownloadProgress includes cancel phase", async () => {
  const { formatDownloadProgress, formatDownloadSummary } =
    await import("../source/utils/download-progress.ts");

  expect(
    formatDownloadProgress({
      current: 2,
      total: 5,
      track: { title: "Song" },
      phase: "cancel",
    }),
  ).toBe("[2/5] Cancelled: Song");

  expect(
    formatDownloadSummary({
      downloaded: 1,
      skipped: 0,
      failed: 0,
      cancelled: 3,
    }),
  ).toBe("Downloaded 1, skipped 0, failed 0, cancelled 3.");
});

test("download service cancel aborts an in-flight batch and keeps .source", async () => {
  const {
    DownloadCancelledError,
    getDownloadService,
    resetDownloadServiceForTests,
  } = await import("../source/services/download/download.service.ts");
  const { getConfigService } =
    await import("../source/services/config/config.service.ts");

  resetDownloadServiceForTests();
  const root = mkdtempSync(path.join(os.tmpdir(), "ymc-dl-cancel-"));
  const config = getConfigService();
  config.set("downloadsEnabled", true);
  config.set("downloadDirectory", root);
  config.set("downloadFormat", "mp3");

  const service = getDownloadService();

  // Force the private spawn path to hang until cancelled.
  service.runProcess = async (command, _args, signal) => {
    if (command === "ffmpeg" && _args?.[0] === "-version") {
      return { stdout: "ffmpeg", stderr: "" };
    }

    await new Promise((resolve, reject) => {
      const onAbort = () => {
        reject(new DownloadCancelledError());
      };
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
    });
    return { stdout: "", stderr: "" };
  };

  const track = {
    videoId: "cancelVid",
    title: "Cancel Me",
    artists: [{ artistId: "a", name: "Artist" }],
    album: { albumId: "al", name: "Album" },
  };

  const phases = [];
  const downloadPromise = service.downloadTracks([track], {
    onProgress: info => {
      phases.push(info.phase);
      if (info.phase === "start") {
        const destination = path.join(
          root,
          "Artist",
          "Album",
          "Cancel Me [cancelVid].mp3",
        );
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(`${destination}.source`, "partial-bytes");
        expect(service.cancel()).toBe(true);
      }
    },
  });

  const summary = await downloadPromise;
  expect(summary.cancelled).toBeGreaterThan(0);
  expect(phases).toContain("cancel");
  expect(
    existsSync(
      path.join(root, "Artist", "Album", "Cancel Me [cancelVid].mp3.source"),
    ),
  ).toBe(true);
  expect(
    existsSync(path.join(root, "Artist", "Album", "Cancel Me [cancelVid].mp3")),
  ).toBe(false);
});

test("COMMANDS and completions include download", async () => {
  const { COMMANDS, generateCompletion } =
    await import("../source/services/completions/completions.service.ts");
  expect(COMMANDS.includes("download")).toBe(true);
  for (const shell of ["bash", "zsh", "powershell", "fish"]) {
    expect(generateCompletion(shell).includes("download")).toBe(true);
  }
});
