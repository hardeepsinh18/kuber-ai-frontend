// Long-history client for the chart's D/W/M toggle.
//
// The chat answer only carries ~1 year of daily bars. Weekly/monthly views (and
// the 5Y daily range) need up to 10 years, fetched on demand from
// GET /api/v1/market/chart — daily bars, split/bonus adjusted; the chart builds
// W/M candles from them (see timeframes.js).
//
// Module-level cache keyed by symbol so every chart for the same stock in a
// session shares one request (including in-flight ones).
import { useEffect, useState } from 'react';
import { getApiBase } from '../apiBase';
import { normalizeOhlc } from './normalize';

const YEARS = 10;
const _cache = new Map(); // symbol -> Promise<{bars, adjustment}>

export function fetchChartHistory(symbol) {
    const key = String(symbol || '').trim().toUpperCase();
    if (!key) return Promise.reject(new Error('no symbol'));
    if (_cache.has(key)) return _cache.get(key);
    const url = `${getApiBase()}/api/v1/market/chart?symbol=${encodeURIComponent(key)}&years=${YEARS}`;
    const p = fetch(url, { method: 'GET' })
        .then((res) => {
            if (!res.ok) throw new Error(`chart history ${res.status}`);
            return res.json();
        })
        .then((data) => ({ bars: normalizeOhlc(data), adjustment: data?.adjustment || null }));
    // A failure is not cached, so a later toggle can retry.
    p.catch(() => _cache.delete(key));
    _cache.set(key, p);
    return p;
}

export function _clearChartHistoryCache() {
    _cache.clear();
}

/**
 * Lazily load long history for `symbol` once `enabled` turns true.
 * Returns { status: 'idle'|'loading'|'ready'|'error', bars, adjustment }.
 */
export function useChartHistory(symbol, enabled) {
    const [state, setState] = useState({ status: 'idle', bars: null, adjustment: null });

    useEffect(() => {
        if (!enabled || !symbol || state.status === 'ready' || state.status === 'loading') return;
        let alive = true;
        setState((s) => ({ ...s, status: 'loading' }));
        fetchChartHistory(symbol)
            .then(({ bars, adjustment }) => {
                if (alive) setState({ status: bars.length ? 'ready' : 'error', bars, adjustment });
            })
            .catch(() => {
                if (alive) setState({ status: 'error', bars: null, adjustment: null });
            });
        return () => { alive = false; };
        // state.status deliberately read but not a dep: re-running on our own
        // status changes would cancel the request we just started.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, enabled]);

    return state;
}
