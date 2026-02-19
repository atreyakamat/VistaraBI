// Module 5B — In-Memory Cache Layer
// TTL-based caching with per-project/KPI invalidation
// Separate caches: query results, AI explanations, profiling metadata

import type { CacheEntry } from './types';
import { createHash } from 'crypto';

// ─── Configuration ────────────────────────────────────────────────

const DEFAULT_TTL_MS = 10 * 60 * 1000;  // 10 minutes
const AI_EXPLANATION_TTL_MS = 60 * 60 * 1000; // 1 hour (explanations change rarely)
const MAX_CACHE_SIZE = 500; // Max entries per cache layer

// ─── Cache Layers ─────────────────────────────────────────────────

const queryCache = new Map<string, CacheEntry<unknown>>();
const explanationCache = new Map<string, CacheEntry<unknown>>();
const profilingCache = new Map<string, CacheEntry<unknown>>();

// ─── Key Generation ───────────────────────────────────────────────

/**
 * Generate a deterministic cache key from project, KPI, and filter parameters.
 */
export function buildCacheKey(
    projectId: string,
    kpiId: string,
    filters?: Record<string, unknown>
): string {
    const base = `${projectId}:${kpiId}`;
    if (!filters || Object.keys(filters).length === 0) return base;

    const filterHash = createHash('md5')
        .update(JSON.stringify(filters, Object.keys(filters).sort()))
        .digest('hex')
        .slice(0, 12);

    return `${base}:${filterHash}`;
}

/**
 * Build a project-level cache key prefix.
 */
export function buildProjectPrefix(projectId: string): string {
    return `${projectId}:`;
}

// ─── Cache Operations ─────────────────────────────────────────────

/**
 * Get from query result cache.
 */
export function getCachedResult<T>(key: string): T | null {
    return getFromCache<T>(queryCache, key);
}

/**
 * Set in query result cache.
 */
export function setCachedResult<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    setInCache(queryCache, key, data, ttlMs);
}

/**
 * Get cached AI explanation.
 */
export function getCachedExplanation<T>(key: string): T | null {
    return getFromCache<T>(explanationCache, key);
}

/**
 * Set cached AI explanation.
 */
export function setCachedExplanation<T>(key: string, data: T): void {
    setInCache(explanationCache, key, data, AI_EXPLANATION_TTL_MS);
}

/**
 * Get cached profiling result.
 */
export function getCachedProfiling<T>(key: string): T | null {
    return getFromCache<T>(profilingCache, key);
}

/**
 * Set cached profiling result.
 */
export function setCachedProfiling<T>(key: string, data: T): void {
    setInCache(profilingCache, key, data, DEFAULT_TTL_MS);
}

// ─── Invalidation ─────────────────────────────────────────────────

/**
 * Invalidate all caches for a project.
 * Called when new data is imported or KPIs are edited.
 */
export function invalidateProject(projectId: string): number {
    const prefix = buildProjectPrefix(projectId);
    let count = 0;
    count += invalidateByPrefix(queryCache, prefix);
    count += invalidateByPrefix(explanationCache, prefix);
    count += invalidateByPrefix(profilingCache, prefix);
    console.log(`[Cache] Invalidated ${count} entries for project ${projectId}`);
    return count;
}

/**
 * Invalidate caches for a specific KPI.
 */
export function invalidateKPI(projectId: string, kpiId: string): number {
    const prefix = `${projectId}:${kpiId}`;
    let count = 0;
    count += invalidateByPrefix(queryCache, prefix);
    count += invalidateByPrefix(profilingCache, prefix);
    // Don't invalidate AI explanations on KPI data change — only on KPI definition change
    console.log(`[Cache] Invalidated ${count} entries for KPI ${kpiId}`);
    return count;
}

/**
 * Invalidate AI explanations for a project.
 * Called when KPI definitions change.
 */
export function invalidateExplanations(projectId: string): number {
    const prefix = buildProjectPrefix(projectId);
    const count = invalidateByPrefix(explanationCache, prefix);
    console.log(`[Cache] Invalidated ${count} AI explanations for project ${projectId}`);
    return count;
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): {
    queryEntries: number;
    explanationEntries: number;
    profilingEntries: number;
    totalEntries: number;
} {
    return {
        queryEntries: queryCache.size,
        explanationEntries: explanationCache.size,
        profilingEntries: profilingCache.size,
        totalEntries: queryCache.size + explanationCache.size + profilingCache.size,
    };
}

/**
 * Clear all caches. Used in testing.
 */
export function clearAllCaches(): void {
    queryCache.clear();
    explanationCache.clear();
    profilingCache.clear();
}

// ─── Internal Helpers ─────────────────────────────────────────────

function getFromCache<T>(cache: Map<string, CacheEntry<unknown>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttlMs) {
        cache.delete(key);
        return null;
    }

    return entry.data as T;
}

function setInCache<T>(
    cache: Map<string, CacheEntry<unknown>>,
    key: string,
    data: T,
    ttlMs: number
): void {
    // Evict oldest if at capacity
    if (cache.size >= MAX_CACHE_SIZE) {
        evictOldest(cache);
    }

    cache.set(key, {
        data,
        createdAt: Date.now(),
        ttlMs,
        key,
    });
}

function invalidateByPrefix(
    cache: Map<string, CacheEntry<unknown>>,
    prefix: string
): number {
    let count = 0;
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
            count++;
        }
    }
    return count;
}

function evictOldest(cache: Map<string, CacheEntry<unknown>>): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache) {
        if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = key;
        }
    }

    if (oldestKey) cache.delete(oldestKey);
}
