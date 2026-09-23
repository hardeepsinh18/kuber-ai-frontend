/**
 * answerKitCore — the pure (non-JSX) half of answerKit.jsx: formatters,
 * verdict/level parsers, and shared color constants. Split out purely to
 * shrink answerKit.jsx's line count; every export here is re-exported from
 * answerKit.jsx unchanged, so none of its ~19 consumers needed to change
 * their import path.
 */

export const BRAND = '#FDD405';

/* ─── formatters ─────────────────────────────────────────────────────────── */
// Abbreviates to Cr/L above ₹1L (was PortfolioOverlay's local fmtINR — now the
// one shared implementation). `digits` still controls precision below ₹1L
// (callers like the live-price display pass 2 for paise); the abbreviated
// Cr/L branches always show 2 decimals, matching the prior PortfolioOverlay
// behaviour. Returns '—' for a missing value (PortfolioOverlay relied on this
// placeholder in unguarded table cells; existing answerKit call sites all
// guard with `!= null` first, so this never surfaces there).
export const fmtINR = (n, digits = 0) => {
    if (n == null) return '—';
    const num = Number(n);
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)}Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)}L`;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: digits })}`;
};

export const fmtNum = (n) =>
    n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : null;

export const fmtVol = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

// en-IN day/short-month/2-digit-year date formatter — "12 Aug '26". Shared by
// CompanyFilings, RecentDevelopments and AnalystAnswer's filing-chip label.
export const fmtDate = (d) => {
    if (!d) return null;
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return null; }
};

/* Strip the "AI-written" dash tells from model prose: em dashes (—) and
 * word-to-word en dashes become a comma, so the copy reads like a person wrote
 * it. Deliberately conservative — it never touches:
 *   • numeric ranges / prices: en dash BETWEEN digits (₹1,025–1,079, 50–200) is kept;
 *   • ordinary hyphenated words: high-yield, short-term, stop-loss stay intact
 *     (only a hyphen with spaces on BOTH sides — used as a dash — is converted).
 * Applied at render time in InlineMd, so it only affects the LLM answer text and
 * not the price levels / labels our own code builds. */
export const stripAiDashes = (s) => {
    if (typeof s !== 'string' || !s) return s;
    return s
        // em dash as punctuation (any surrounding spaces) → comma + single space
        .replace(/\s*—\s*/g, ', ')
        // en dash between digits is a range → keep; between anything else → comma
        .replace(/(\D)\s*–\s*(\D)/g, '$1, $2')
        .replace(/\s*–\s*(\D)/g, ', $1')
        .replace(/(\D)\s*–\s*/g, '$1, ')
        // a hyphen with a space on BOTH sides is a dash, not a compound word
        .replace(/(\S) - (?=\S)/g, '$1, ')
        // tidy any doubled commas / stray comma-space runs we may have created
        .replace(/,\s*,/g, ',')
        .replace(/\s+,/g, ',');
};

export const scoreColor = (s) => (s >= 70 ? '#22c55e' : s >= 50 ? BRAND : '#ef4444');

/* ─── verdict helpers ────────────────────────────────────────────────────── */
/* Does this answer actually carry a verdict (a BUY/SELL/HOLD call)? Mirrors the
 * render condition of VerdictBand so the "Why this verdict" heading only shows
 * when a verdict really rendered — otherwise the answer is informational and the
 * heading reads "VentyAI says" instead.
 *
 * A verdict counts ONLY when the deterministic engine (verdict_engine.py,
 * compute_verdict) produced it. That engine is also the only place the
 * required risk:reward check (ACTIONABLE_RR) runs — a verdict derived from
 * LLM prose or a scraped price level never went through that check, so it
 * must never be treated as a real verdict here. See VerdictBand in
 * answerKit.jsx, which enforces the same rule for the trade-levels card. */
export const hasVerdict = ({ verdict } = {}) => !!(verdict && (verdict.SHORT || verdict.LONG));

/* ─── shared card color tokens ───────────────────────────────────────────── */
export const MAIN_CARD_DARK = '#181613';
export const INNER_CARD_DARK = '#0d0c0b';

/* ─── VENTYAI SCORE helpers ─────────────────────────────────────────────────── */
export const getScores = (scoreCard, managementSentiment) => {
    const comp = scoreCard?.overall?.components || {};
    // `overall.score` is the horizon-weighted blend the VentyAI Verdict is read from
    // (short 65/30/5, long 30/65/5, no horizon 47.5/47.5/5), so its label and the
    // weights that produced it come from the backend rather than being re-derived
    // here against thresholds tuned for the old equal-weight mean.
    // Fundamental engine emits a genuine 0-100 score (v3 floors at 20; v4 can go
    // to 0). Do NOT rescale — the old "≤10 → ×10" guard mis-rendered low v4
    // scores (e.g. 5 → 50). See fundamental_engine.py.
    return {
        overall: scoreCard?.overall?.score ?? null,
        overallLabel: scoreCard?.overall?.label ?? null,
        overallWeights: scoreCard?.overall?.weights ?? null,
        overallBasis: scoreCard?.overall?.basis ?? null,
        technical: comp.technical ?? scoreCard?.technical?.score ?? null,
        fundamental: comp.financial ?? scoreCard?.fundamental?.score ?? null,
        sentimental: comp.management ?? managementSentiment?.tone_score ?? null,
    };
};

export const buildMarketStats = (aag = {}) => [
    aag.open != null && { label: 'Open', value: fmtINR(aag.open) },
    aag.high != null && { label: 'High', value: fmtINR(aag.high) },
    aag.low != null && { label: 'Low', value: fmtINR(aag.low) },
    aag.high != null && aag.low != null && { label: 'Range', value: `${fmtNum(aag.low)}–${fmtNum(aag.high)}` },
    aag.volume > 0 && { label: 'Volume', value: fmtVol(aag.volume) },
    aag['52w_low'] != null && aag['52w_high'] != null && { label: '52w', value: `${fmtNum(aag['52w_low'])}–${fmtNum(aag['52w_high'])}` },
].filter(Boolean);
