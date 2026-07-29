// Shared API base for frontend (same logic as ChatContainer)
// Unset = same-origin; Vercel rewrites /api/* to AWS. Set VITE_API_BASE for HF or local dev.
const _raw = import.meta.env.VITE_API_BASE;
const API_BASE = (_raw && _raw.startsWith('http')) ? _raw.replace(/\/$/, '') : '';

export function getApiBase() {
  return API_BASE;
}

/**
 * QA-C-001: an absolute base for callers that build a `new URL(...)`.
 *
 * getApiBase() returns '' when VITE_API_BASE is unset — the correct same-origin
 * default for relative fetches, but `new URL('/api/v1/x')` with no origin throws
 * TypeError: Invalid URL, which took the whole admin dashboard down in exactly
 * the deployed configuration. Resolve to the page origin instead.
 */
export function getApiOrigin() {
  if (API_BASE) return API_BASE;
  return (typeof window !== 'undefined' && window.location?.origin) || '';
}

// Logs are only on the separate logs-viewer project (e.g. kuberailogs-*.vercel.app), not on this app.
