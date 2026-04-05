/**
 * ⚡ Simple in-memory TTL cache to prevent hammering Firestore.
 * Reduces repeated DB reads by up to 10x for hot paths (auth, company lookups).
 */

const store = new Map();

/**
 * Get value from cache.
 * @param {string} key
 * @returns {any|null}
 */
export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set value in cache with TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
 */
export function cacheSet(key, value, ttlMs = 5 * 60 * 1000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Delete a specific key from cache (call on user update/save).
 * @param {string} key
 */
export function cacheDelete(key) {
  store.delete(key);
}

/**
 * Clear all cache entries.
 */
export function cacheClear() {
  store.clear();
}

// Auto-cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 10 * 60 * 1000);
