import { describe, expect, test } from "bun:test";

import {
  CacheService,
  DEFAULT_CACHE_MAX_ENTRIES,
  DEFAULT_CACHE_TTL_MINUTES,
  resolveCacheConfig,
} from "../source/services/cache/cache.service.ts";

describe("resolveCacheConfig", () => {
  test("returns defaults for undefined inputs", () => {
    const resolved = resolveCacheConfig(undefined, undefined);
    expect(resolved.ttlMs).toBe(DEFAULT_CACHE_TTL_MINUTES * 60_000);
    expect(resolved.maxSize).toBe(DEFAULT_CACHE_MAX_ENTRIES);
    expect(DEFAULT_CACHE_TTL_MINUTES).toBe(5);
    expect(DEFAULT_CACHE_MAX_ENTRIES).toBe(100);
  });

  test("accepts valid values", () => {
    expect(resolveCacheConfig(10, 500)).toEqual({
      ttlMs: 600_000,
      maxSize: 500,
    });
  });

  test("floors fractional values", () => {
    expect(resolveCacheConfig(2.9, 50.9)).toEqual({
      ttlMs: 120_000,
      maxSize: 50,
    });
  });

  test("falls back to defaults on invalid values", () => {
    const fallback = {
      ttlMs: DEFAULT_CACHE_TTL_MINUTES * 60_000,
      maxSize: DEFAULT_CACHE_MAX_ENTRIES,
    };
    expect(resolveCacheConfig(0, 0)).toEqual(fallback);
    expect(resolveCacheConfig(-5, -1)).toEqual(fallback);
    expect(resolveCacheConfig(Number.NaN, Number.POSITIVE_INFINITY)).toEqual(
      fallback,
    );
    expect(resolveCacheConfig("10", "100")).toEqual(fallback);
  });
});

describe("CacheService.configure", () => {
  test("shrinks cache with LRU eviction", () => {
    let clock = 1000;
    const cache = new CacheService(5, 60_000, () => clock);
    for (const key of ["a", "b", "c", "d", "e"]) {
      clock += 10;
      cache.set(key, key);
    }
    clock = 2000;
    cache.get("a");
    clock = 3000;
    cache.get("c");

    cache.configure(3, 60_000);

    expect(cache.size).toBe(3);
    expect(cache.get("b")).toBe(null);
    expect(cache.get("d")).toBe(null);
    expect(cache.get("e")).toBe("e");
    expect(cache.get("a")).toBe("a");
    expect(cache.get("c")).toBe("c");
  });

  test("applies new default TTL to subsequent writes", async () => {
    const cache = new CacheService(10, 60_000);
    cache.configure(10, 50);
    cache.set("shortlived", "v");
    expect(cache.get("shortlived")).toBe("v");

    await new Promise(resolve => setTimeout(resolve, 80));
    expect(cache.get("shortlived")).toBe(null);
  });

  test("grows capacity without evicting", () => {
    const cache = new CacheService(2, 60_000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.configure(4, 60_000);
    cache.set("c", 3);
    cache.set("d", 4);

    expect(cache.size).toBe(4);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("d")).toBe(4);
  });
});
