import { afterEach, expect, test } from "bun:test";

const __fileTeardowns = [];
afterEach(() => {
  while (__fileTeardowns.length) {
    const fn = __fileTeardowns.pop();
    fn();
  }
});

import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_INVIDIOUS_INSTANCES,
  parseInvidiousDiscoveryPayload,
  resetInvidiousHealthServiceForTests,
} from "../source/services/invidious/invidious-health.service.ts";
import { formatDownloadProgress } from "../source/utils/download-progress.ts";

test("formatDownloadProgress renders phases", () => {
  const track = { title: "Song A" };
  expect(
    formatDownloadProgress({
      current: 1,
      total: 3,
      track,
      phase: "start",
    }),
  ).toBe("[1/3] Downloading: Song A");
  expect(
    formatDownloadProgress({
      current: 2,
      total: 3,
      track,
      phase: "done",
    }),
  ).toBe("[2/3] Saved: Song A");
  expect(
    formatDownloadProgress({
      current: 3,
      total: 3,
      track,
      phase: "fail",
      error: "boom",
    }),
  ).toBe("[3/3] Failed: Song A — boom");
});

test("parseInvidiousDiscoveryPayload keeps https instances only", () => {
  const urls = parseInvidiousDiscoveryPayload([
    ["inv.example.com", { type: "https", uri: "https://inv.example.com" }],
    ["onion.example", { type: "onion", uri: "http://abc.onion" }],
    ["bad", { type: "https", uri: "not-a-url" }],
    ["http-ok", { type: "https", uri: "https://invidious.example.org/" }],
  ]);

  expect(urls).toEqual([
    "https://inv.example.com",
    "https://invidious.example.org",
  ]);
});

test("Invidious health ranks successful instances first", () => {
  const healthFile = path.join(
    os.tmpdir(),
    `ymc-invidious-health-${Date.now()}.json`,
  );
  __fileTeardowns.push(() => {
    if (existsSync(healthFile)) {
      rmSync(healthFile, { force: true });
    }
  });

  const health = resetInvidiousHealthServiceForTests(healthFile);
  const [first, second] = DEFAULT_INVIDIOUS_INSTANCES;
  health.recordFailure(first);
  health.recordSuccess(second, 120);
  health.recordSuccess(second, 90);

  const ordered = health.getOrderedInstances();
  expect(ordered[0]).toBe(second);
  expect(ordered.includes(first)).toBe(true);
});
