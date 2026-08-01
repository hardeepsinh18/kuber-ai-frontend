// Company/ticker typeahead search client.
//
// Hits GET /api/v1/symbols/search (served from the backend's in-memory symbol
// master — no DB per keystroke). Kept light for scale:
//   - module-level cache keyed by normalized prefix, so backspacing / re-typing
//     never re-fetches, and popular prefixes are shared across every mount
//   - each call passes an AbortSignal so stale in-flight requests are cancelled
//   - the backend also sends Cache-Control, so the browser/CDN dedupe further
import { getApiBase } from './apiBase';

const API_BASE = getApiBase(); // '' = same-origin relative /api/*
const MIN_CHARS = 2;
const MAX_CACHE = 200;

const _cache = new Map(); // normKey -> results[]

function _norm(q) {
  return (q || '').trim().toLowerCase();
}

/**
 * Search companies by partial name or ticker.
 * @param {string} query
 * @param {{ limit?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<Array<{symbol:string,name:string,ticker:string}>>}
 */
export async function searchSymbols(query, { limit = 8, signal } = {}) {
  const key = _norm(query);
  if (key.length < MIN_CHARS) return [];

  const cacheKey = `${key}|${limit}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const url = `${API_BASE}/api/v1/symbols/search?q=${encodeURIComponent(key)}&limit=${limit}`;
  const res = await fetch(url, { method: 'GET', signal });
  if (!res.ok) throw new Error(`symbol search ${res.status}`);

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  // Bounded LRU-ish cache: drop oldest when full.
  if (_cache.size >= MAX_CACHE) {
    _cache.delete(_cache.keys().next().value);
  }
  _cache.set(cacheKey, results);
  return results;
}

export { MIN_CHARS };
