// Shared API base for frontend (same logic as ChatContainer)
// Unset = same-origin; Vercel rewrites /api/* to AWS. Set VITE_API_BASE for HF or local dev.
const _raw = import.meta.env.VITE_API_BASE;
const API_BASE = (_raw && _raw.startsWith('http')) ? _raw : '';

export function getApiBase() {
  return API_BASE;
}

// Logs are only on the separate logs-viewer project (e.g. kuberailogs-*.vercel.app), not on this app.
