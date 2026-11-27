// In-memory LRU cache with optional TTL for API responses
// Uses a doubly-linked list for O(1) LRU eviction
import { getConfigService } from "../config/config.service.ts";
import { logger } from "../logger/logger.service.ts";

export const DEFAULT_CACHE_TTL_MINUTES = 5;
export const DEFAULT_CACHE_MAX_ENTRIES = 100;

const MIN_CACHE_TTL_MINUTES = 1;
const MIN_CACHE_MAX_ENTRIES = 10;

export interface ResolvedCacheConfig {
  ttlMs: number;
  maxSize: number;
}

export function resolveCacheConfig(
  ttlMinutes: unknown,
  maxEntries: unknown,
): ResolvedCacheConfig {
  const minutes =
    typeof ttlMinutes === "number" &&
    Number.isFinite(ttlMinutes) &&
    ttlMinutes >= MIN_CACHE_TTL_MINUTES
      ? Math.floor(ttlMinutes)
      : DEFAULT_CACHE_TTL_MINUTES;
  const entries =
    typeof maxEntries === "number" &&
    Number.isFinite(maxEntries) &&
    maxEntries >= MIN_CACHE_MAX_ENTRIES
      ? Math.floor(maxEntries)
      : DEFAULT_CACHE_MAX_ENTRIES;
  return { ttlMs: minutes * 60_000, maxSize: entries };
}

function loadResolvedCacheConfig(): ResolvedCacheConfig {
  try {
    const config = getConfigService();
    return resolveCacheConfig(
      config.get("cacheTtlMinutes"),
      config.get("cacheMaxEntries"),
    );
  } catch {
    return resolveCacheConfig(undefined, undefined);
  }
}

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: CacheEntry<T> | null;
  next: CacheEntry<T> | null;
}

export class CacheService<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private head: CacheEntry<T> | null = null; // Most recently used
  private tail: CacheEntry<T> | null = null; // Least recently used
  private maxSize: number;
  private defaultTtlMs: number;
  private readonly now: () => number;

  constructor(
    maxSize = DEFAULT_CACHE_MAX_ENTRIES,
    defaultTtlMs = DEFAULT_CACHE_TTL_MINUTES * 60_000,
    now: () => number = Date.now,
  ) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.now = now;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.now() > entry.expiresAt) {
      this.removeEntry(entry);
      return null;
    }

    this.moveToHead(entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const existing = this.cache.get(key);
    if (existing) {
      // Update existing entry
      existing.value = value;
      existing.expiresAt = this.now() + (ttlMs ?? this.defaultTtlMs);
      this.moveToHead(existing);
      return;
    }

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLru();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: this.now() + (ttlMs ?? this.defaultTtlMs),
      prev: null,
      next: null,
    };

    this.cache.set(key, entry);
    this.addToHead(entry);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.removeEntry(entry);
    }
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  get size(): number {
    return this.cache.size;
  }

  configure(maxSize: number, defaultTtlMs: number): void {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    while (this.cache.size > this.maxSize) {
      this.evictLru();
    }
  }

  private evictLru(): void {
    if (!this.tail) return;

    const lruKey = this.tail.key;
    logger.debug("CacheService", "Evicting LRU entry", { key: lruKey });
    this.removeEntry(this.tail);
    this.cache.delete(lruKey);
  }

  private addToHead(entry: CacheEntry<T>): void {
    entry.next = this.head;
    entry.prev = null;

    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;

    if (!this.tail) {
      this.tail = entry;
    }
  }

  private moveToHead(entry: CacheEntry<T>): void {
    if (entry === this.head) return;

    // Remove from current position
    if (entry.prev) {
      entry.prev.next = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    }
    if (entry === this.tail) {
      this.tail = entry.prev;
    }

    // Add to head
    entry.prev = null;
    entry.next = this.head;
    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
  }

  private removeEntry(entry: CacheEntry<T>): void {
    if (entry.prev) {
      entry.prev.next = entry.next;
    } else {
      this.head = entry.next;
    }

    if (entry.next) {
      entry.next.prev = entry.prev;
    } else {
      this.tail = entry.prev;
    }
  }
}

// Shared search result cache, sized from config (cacheTtlMinutes/cacheMaxEntries)
let searchCacheInstance: CacheService | null = null;
export const getSearchCache = (): CacheService => {
  if (!searchCacheInstance) {
    searchCacheInstance = new CacheService();
  }
  const resolved = loadResolvedCacheConfig();
  searchCacheInstance.configure(resolved.maxSize, resolved.ttlMs);
  return searchCacheInstance;
};

// Shared suggestions cache, sized from config (cacheTtlMinutes/cacheMaxEntries)
let suggestionsCacheInstance: CacheService | null = null;
export const getSuggestionsCache = (): CacheService => {
  if (!suggestionsCacheInstance) {
    suggestionsCacheInstance = new CacheService();
  }
  const resolved = loadResolvedCacheConfig();
  suggestionsCacheInstance.configure(resolved.maxSize, resolved.ttlMs);
  return suggestionsCacheInstance;
};
