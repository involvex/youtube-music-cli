import { expect, test } from "bun:test";

import { normalizeYtmPlaylistId } from "../source/services/sync/sync.service.ts";

test("sync: normalizeYtmPlaylistId extracts ID from YTM URL", () => {
  const ytmUrl =
    "https://music.youtube.com/playlist?list=VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP";
  const result = normalizeYtmPlaylistId(ytmUrl);
  expect(result).toBe("VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP");
});

test("sync: normalizeYtmPlaylistId extracts ID from YouTube URL with list param", () => {
  const ytUrl =
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrEnWoR732B-2mD3J2nJ5k9oG7qW8nXm";
  const result = normalizeYtmPlaylistId(ytUrl);
  expect(result).toBe("PLrEnWoR732B-2mD3J2nJ5k9oG7qW8nXm");
});

test("sync: normalizeYtmPlaylistId returns raw ID if already an ID", () => {
  const id = "VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP";
  const result = normalizeYtmPlaylistId(id);
  expect(result).toBe(id);
});

test("sync: normalizeYtmPlaylistId returns raw ID without VL prefix", () => {
  const id = "PLrEnWoR732B-2mD3J2nJ5k9oG7qW8nXm";
  const result = normalizeYtmPlaylistId(id);
  expect(result).toBe(id);
});

test("sync: normalizeYtmPlaylistId strips extra whitespace", () => {
  const id = "  VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP  ";
  const result = normalizeYtmPlaylistId(id);
  expect(result).toBe("VLPLm90DCMQmtlk26B3JPo9E1cJULsgeUNrP");
});

test("sync: normalizeYtmPlaylistId extracts from YouTube URL in different formats", () => {
  // YouTube URL with list param after v
  const url1 = "https://youtu.be/dQw4w9WgXcQ?list=PLtest123456789";
  expect(normalizeYtmPlaylistId(url1)).toBe("PLtest123456789");

  // YouTube URL with list param before v
  const url2 =
    "https://www.youtube.com/playlist?list=PLtest987654321&other=val";
  expect(normalizeYtmPlaylistId(url2)).toBe("PLtest987654321");
});
