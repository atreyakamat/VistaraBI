/**
 * pool.ts — PostgreSQL Connection Pool
 *
 * Singleton pg Pool that shares the same DATABASE_URL as Prisma.
 * Used exclusively by the SQL execution engine (Module 5B) for
 * parameterized KPI queries against warehouse tables.
 *
 * This module provides:
 *   query(text, params)  — fire-and-forget pooled query
 *   getClient()          — checkout a client for multi-statement work
 *   destroyPool()        — graceful shutdown (call on process exit)
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// ─── Pool Configuration ──────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;

// Only create the pool if DATABASE_URL exists, otherwise use a placeholder/lazy initializer
let pool: Pool;
if (DATABASE_URL) {
    pool = new Pool({
        connectionString: DATABASE_URL,
        max: 10,                          // max simultaneous connections
        idleTimeoutMillis: 30_000,        // close idle clients after 30s
        connectionTimeoutMillis: 5_000,   // fail fast if can't connect in 5s
        statement_timeout: 10_000,        // kill queries running > 10s
    });

    // Log pool-level errors (don't crash the process)
    pool.on('error', (err) => {
        console.error('[Pool] Unexpected idle client error:', err.message);
    });
} else {
    console.warn('[Pool] DATABASE_URL is missing. SQL queries will fail.');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Execute a parameterized query using a pooled connection.
 * Connection is automatically returned to the pool after execution.
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: unknown[] = []
): Promise<QueryResult<T>> {
    if (!DATABASE_URL || !pool) {
        throw new Error('[Pool] DATABASE_URL environment variable is not set. Cannot execute SQL query.');
    }
    const start = Date.now();
    try {
        const result = await pool.query<T>(text, params);
        const durationMs = Date.now() - start;
        if (durationMs > 1000) {
            console.warn(`[Pool] Slow query (${durationMs}ms):`, text.slice(0, 120));
        }
        return result;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[Pool] Query error:', message);
        console.error('[Pool] Query text:', text.slice(0, 200));
        throw err;
    }
}

/**
 * Checkout a dedicated client from the pool.
 * Caller MUST call client.release() when done.
 * Use for multi-statement transactions only.
 */
export async function getClient(): Promise<PoolClient> {
    if (!DATABASE_URL || !pool) {
        throw new Error('[Pool] DATABASE_URL environment variable is not set. Cannot connect to database.');
    }
    return pool.connect();
}

/**
 * Gracefully shut down the pool.
 * Call this on process exit or in tests.
 */
export async function destroyPool(): Promise<void> {
    if (pool) {
        await pool.end();
        console.log('[Pool] Connection pool destroyed');
    }
}

/**
 * Get pool statistics for monitoring.
 */
export function getPoolStats() {
    if (!pool) return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    };
}

export default pool;
