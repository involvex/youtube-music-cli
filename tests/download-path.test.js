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
  ensureDownloadDirectory,
  normalizeDownloadDirectory,
} from "../source/utils/download-path.ts";

test("normalizeDownloadDirectory expands tilde to home", () => {
  const result = normalizeDownloadDirectory("~/Music/YMC");
  expect(result).toBe(path.resolve(path.join(os.homedir(), "Music", "YMC")));
});

test("normalizeDownloadDirectory expands $HOME", () => {
  const result = normalizeDownloadDirectory("$HOME/downloads");
  expect(result).toBe(path.resolve(path.join(os.homedir(), "downloads")));
});

test("normalizeDownloadDirectory resolves relative paths", () => {
  const result = normalizeDownloadDirectory("./relative-dl");
  expect(result).toBe(path.resolve("./relative-dl"));
});

test("normalizeDownloadDirectory rejects empty input", () => {
  expect(() => normalizeDownloadDirectory("   ")).toThrow(
    "Download folder cannot be empty",
  );
});

test("ensureDownloadDirectory creates the folder", () => {
  const target = path.join(os.tmpdir(), `ymc-download-path-test-${Date.now()}`);
  __fileTeardowns.push(() => {
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true });
    }
  });

  const result = ensureDownloadDirectory(target);
  expect(result).toBe(path.resolve(target));
  expect(existsSync(result)).toBe(true);
});
