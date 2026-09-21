/**
 * Per-ratio comparison rules: direction, sane bounds, and verdict banding.
 *
 * The peer-comparison tables this card replaces (Tickertape/Screener-style)
 * decide "better or worse" with a bare `value > benchmark`, and that is wrong
 * for three separate reasons we must not reproduce:
 *
 *   1. POLARITY. A low P/E is cheap and a low ROE is bad, so the same `>` gives
 *      the right answer for one and the wrong answer for the other. Every ratio
 *      here declares `dir` explicitly; nothing infers it.
 *
 *   2. BANDED RATIOS. Liquidity is not monotonic — a quick ratio of 0.6 is
 *      tight, 1.5 is healthy, and 12 means idle cash, not excellence. Those
 *      carry `band` and are judged against it rather than against a peer value.
 *
 *   3. POISONED BENCHMARKS. A sector P/E arrives negative when loss-making
 *      constituents drag a *mean* below zero (the reference screenshot shows a
 *      sector P/E of -180.1 and a quick ratio of 904.15 — both unusable, both
 *      rendered as confident red marks). `sane()` rejects those so the row can
 *      say "not comparable" instead of inventing a verdict.
 *
 * Kept separate from metricFormat.js on purpose: that module owns how a number
 * is PRINTED, this one owns what it MEANS. A metric appearing in both gets its
 * digits from there and its verdict from here.
 */

/** Lower value is the better one (cheap valuation, light leverage). */
export const LOWER_BETTER = 'lower';
/** Higher value is the better one (returns, margins). */
export const HIGHER_BETTER = 'higher';
/** Neither extreme is good — judged against an absolute healthy band. */
export const BAND_BETTER = 'band';

/**
 * One entry per ratio we can render.
 *
 * `label`  — row label, kept short enough for a narrow mobile column.
 * `dir`    — one of the three constants above.
 * `unit`   — 'pct' | 'x' | 'ratio'; selects the formatter at render time.
 * `term`   — glossary key for the InfoTip, or null when the sheet has no entry.
 *            Verified against src/data/glossary.js + its ALIASES; a key the
 *            sheet does not cover renders no "i" rather than an empty tooltip.
 * `sane`   — [min, max] range a value must fall inside to be usable at all.
 * `band`   — [healthyLow, healthyHigh], BAND_BETTER ratios only.
 */
export const RATIO_META = {
    pe_ratio: {
        label: 'P/E', dir: LOWER_BETTER, unit: 'x', term: 'P/E ratio',
        // Negative P/E is a loss-maker, not a cheap stock; >500 is an earnings
        // artefact. Both are excluded from comparison rather than ranked.
        sane: [0, 500],
    },
    pb_ratio: {
        label: 'P/B', dir: LOWER_BETTER, unit: 'x', term: null,
        sane: [0, 100],
    },
    roa: {
        label: 'ROA', dir: HIGHER_BETTER, unit: 'pct', term: null,
        sane: [-100, 100],
    },
    roe: {
        label: 'ROE', dir: HIGHER_BETTER, unit: 'pct', term: 'ROE',
        // ROE exceeds 100% legitimately on buyback-shrunk equity, so the ceiling
        // is generous; beyond 300% the denominator is effectively noise.
        sane: [-200, 300],
    },
    roce: {
        label: 'ROCE', dir: HIGHER_BETTER, unit: 'pct', term: 'ROCE',
        sane: [-100, 200],
    },
    net_margin: {
        label: 'Net margin', dir: HIGHER_BETTER, unit: 'pct', term: 'Net margin',
        sane: [-200, 100],
    },
    operating_margin: {
        label: 'Op. margin', dir: HIGHER_BETTER, unit: 'pct', term: 'Operating margin',
        sane: [-200, 100],
    },
    debt_equity: {
        label: 'Debt / Equity', dir: LOWER_BETTER, unit: 'ratio', term: 'D/E ratio',
        sane: [0, 50],
    },
    dividend_yield: {
        label: 'Dividend yield', dir: HIGHER_BETTER, unit: 'pct', term: 'Dividend yield',
        sane: [0, 50],
    },
    current_ratio: {
        label: 'Current ratio', dir: BAND_BETTER, unit: 'ratio', term: null,
        // Mirrors _rate_current_ratio in the backend's fundamental_engine.py so
        // the card and the score cannot disagree about what "healthy" means.
        sane: [0, 20], band: [1.5, 3],
    },
    quick_ratio: {
        label: 'Quick ratio', dir: BAND_BETTER, unit: 'ratio', term: null,
        sane: [0, 20], band: [1, 2],
    },
    ev_ebitda: {
        label: 'EV / EBITDA', dir: LOWER_BETTER, unit: 'x', term: null,
        sane: [0, 200],
    },
};

/** Row order for the table. Valuation first, then returns, then health. */
export const RATIO_ORDER = [
    'pe_ratio', 'pb_ratio', 'ev_ebitda',
    'roa', 'roe', 'roce',
    'net_margin', 'operating_margin',
    'debt_equity', 'current_ratio', 'quick_ratio',
    'dividend_yield',
];

/** A finite number, or null. Guards against ''/null/undefined/NaN/Infinity. */
const num = (v) => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

/**
 * True when `v` is a usable figure for this ratio.
 *
 * This is the gate that stops a -180.1 sector P/E or a 904.15 quick ratio from
 * ever reaching a verdict. Unknown keys pass any finite number through, so a
 * ratio added to the payload before it is added here degrades to "shown but
 * never judged" rather than disappearing.
 */
export const sane = (key, v) => {
    const n = num(v);
    if (n == null) return false;
    const meta = RATIO_META[key];
    if (!meta?.sane) return true;
    const [lo, hi] = meta.sane;
    return n >= lo && n <= hi;
};

/**
 * Compare one value against its benchmark.
 *
 * Returns 'better' | 'worse' | 'similar' | null, where null means "we cannot
 * say" — missing data, an insane value, or a poisoned benchmark. Callers must
 * render null as an explicit not-comparable state and never as a neutral pass.
 *
 * `eps` is a dead-band: values within 2% of the benchmark read as 'similar'
 * rather than flipping a verdict on rounding noise.
 */
export const verdict = (key, value, benchmark, eps = 0.02) => {
    const meta = RATIO_META[key];
    const v = num(value);
    if (v == null || !sane(key, v)) return null;

    // Banded ratios ignore the peer entirely: being near a sick sector's median
    // is not health. Judged against the absolute healthy range instead.
    if (meta?.dir === BAND_BETTER) {
        const [lo, hi] = meta.band ?? [1, 2];
        if (v >= lo && v <= hi) return 'better';
        // Below the floor is a genuine liquidity risk; above the ceiling is
        // merely inefficient, so it reads as 'similar', not 'worse'.
        return v < lo ? 'worse' : 'similar';
    }

    const b = num(benchmark);
    if (b == null || !sane(key, b) || b === 0) return null;

    const diff = (v - b) / Math.abs(b);
    if (Math.abs(diff) <= eps) return 'similar';
    const higher = diff > 0;
    return (meta?.dir === LOWER_BETTER ? !higher : higher) ? 'better' : 'worse';
};

/**
 * Percentile of `value` within `peers` (0-100), polarity-aware.
 *
 * 100 always means best-in-set regardless of direction, so a cheap P/E and a
 * high ROE both surface as a full bar. Insane peer values are dropped before
 * ranking rather than skewing it.
 */
export const percentile = (key, value, peers) => {
    const v = num(value);
    if (v == null || !sane(key, v) || !Array.isArray(peers)) return null;
    const pool = peers.map(num).filter(p => p != null && sane(key, p));
    if (pool.length < 2) return null;
    const better = pool.filter(p => (RATIO_META[key]?.dir === LOWER_BETTER ? p > v : p < v)).length;
    return Math.round((better / pool.length) * 100);
};

/**
 * Median of a peer pool, with unusable values removed first.
 *
 * A median rather than a mean, because one loss-making constituent is enough to
 * drag a sector P/E mean negative — exactly the -180.1 artefact this card is
 * built to avoid. Returns null below `minPeers`: a "median" of two stocks is a
 * coincidence, not a benchmark, and saying nothing beats implying rigour we
 * do not have.
 */
export const median = (key, peers, minPeers = 3) => {
    if (!Array.isArray(peers)) return null;
    const pool = peers.map(num).filter(p => p != null && sane(key, p)).sort((a, b) => a - b);
    if (pool.length < minPeers) return null;
    const mid = pool.length >> 1;
    return pool.length % 2 ? pool[mid] : (pool[mid - 1] + pool[mid]) / 2;
};
