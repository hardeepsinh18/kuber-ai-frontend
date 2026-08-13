import { useState, useEffect, useCallback } from 'react';
import { getApiOrigin } from '../lib/apiBase';
import { getIdToken } from '../lib/auth';

// QA-C-001: use the ORIGIN-resolving accessor, not getApiBase(). The latter is ''
// for the same-origin deployment, and `new URL('/api/v1/...')` with no origin
// throws — which made every panel below fail to load in UAT.
const API_BASE = getApiOrigin();
const API_PREFIX = '/api/v1';

// SEC-004/SEC-C-002: authenticate admin calls with the signed-in admin's own
// Cognito ID token (verified server-side against the ADMIN_EMAILS allowlist by
// require_admin) — NOT a shared secret baked into the JS bundle. AdminDashboard
// only renders behind AdminGuard, so a token is always available here.
export const adminFetch = async (path, params = {}) => {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    const token = await getIdToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
};

// Shared `data/loading/err` + load-on-mount-and-on-param-change pattern used by
// AdminDashboard's tabs (Overview, Users, Query Logs, API Stats). `params` is a
// plain object of query params (primitives only) — it's re-stringified on every
// render so the effect only re-fires when a param VALUE actually changes, not on
// every render (the caller typically passes a fresh object literal each time).
//
// Returns `load` so callers can trigger a manual refetch (e.g. a Retry button, or
// re-running search after resetting pagination) — calling it doesn't change the
// dependency that drives the automatic effect, matching the hand-rolled
// `useCallback(...) + useEffect(() => { load(); }, [load])` pattern this replaces.
//
// ChatHistoryTab is NOT a fit for this hook: its fetch is gated on a truthy
// `userId` (no fetch at all until one is set), starts with `loading: false`
// rather than `true`, and targets a dynamic path segment instead of query params
// — it keeps its own hand-rolled effect rather than being forced in here.
export default function useAdminFetch(path, params) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const paramsKey = JSON.stringify(params ?? {});

    const load = useCallback(() => {
        setLoading(true);
        adminFetch(path, params)
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey stands in for params (deep-equal via JSON, not identity)
    }, [path, paramsKey]);

    useEffect(() => { load(); }, [load]);

    return { data, loading, err, load };
}
