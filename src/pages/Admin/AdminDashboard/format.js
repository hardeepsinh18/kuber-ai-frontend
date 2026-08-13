export const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
export const fmtMs = (ms) => ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
export const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
