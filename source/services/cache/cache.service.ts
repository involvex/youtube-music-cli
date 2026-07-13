// In-memory LRU cache with optional TTL for API responses
import {logger} from '../logger/logger.service.ts';

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	lastAccessed: number;
}

export class CacheService<T = unknown> {
	private cache = new Map<string, CacheEntry<T>>();
	private readonly maxSize: number;
	private readonly defaultTtlMs: number;

	constructor(maxSize = 100, defaultTtlMs = 5 * 60 * 1000) {
		this.maxSize = maxSize;
		this.defaultTtlMs = defaultTtlMs;
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		entry.lastAccessed = Date.now();
		return entry.value;
	}

	set(key: string, value: T, ttlMs?: number): void {
		// Evict LRU entry if at capacity
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictLru();
		}

		this.cache.set(key, {
			value,
			expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
			lastAccessed: Date.now(),
		});
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}

	private evictLru(): void {
		let lruKey: string | null = null;
		let lruTime = Infinity;

		for (const [key, entry] of this.cache) {
			if (entry.lastAccessed < lruTime) {
				lruTime = entry.lastAccessed;
				lruKey = key;
			}
		}

		if (lruKey) {
			logger.debug('CacheService', 'Evicting LRU entry', {key: lruKey});
			this.cache.delete(lruKey);
		}
	}
}

// Shared search result cache (100 entries, 5min TTL)
let searchCacheInstance: CacheService | null = null;
export const getSearchCache = (): CacheService => {
	if (!searchCacheInstance) {
		searchCacheInstance = new CacheService(100, 5 * 60 * 1000);
	}
	return searchCacheInstance;
};

// Shared suggestions cache (100 entries, 5min TTL)
let suggestionsCacheInstance: CacheService | null = null;
export const getSuggestionsCache = (): CacheService => {
	if (!suggestionsCacheInstance) {
		suggestionsCacheInstance = new CacheService(100, 5 * 60 * 1000);
	}
	return suggestionsCacheInstance;
};
