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

/* ─── ABSOLUTE QUALITY GRADE ──────────────────────────────────────────────────
 *
 * The verdict()/percentile() machinery above answers ONE question: "better or
 * worse than the benchmark?" That is a relative question, and on its own it
 * misleads — a 7.96% ROE against a 6.37% sector median renders green and
 * up-arrow, which a reader fairly takes as "this is good." It is not: 7.96% ROE
 * is a weak absolute return that happens to sit in a weak sector. Relative
 * strength and absolute quality are different claims, and the card was only
 * ever making the first one while looking like it made the second.
 *
 * These thresholds are a DELIBERATE MIRROR of the backend's rating functions in
 * app/services/fundamental_engine.py (_rate_roce_roe, _rate_debt_equity,
 * _rate_net_margin, _rate_current_ratio, _rate_peg …) and its
 * RATING_LABEL = {5:"Exceptional",4:"Strong",3:"Average",2:"Weak",1:"Poor"}.
 * The score banner a user sees above this table is computed from those exact
 * cutoffs, so any other numbers here would let the table and the score contradict
 * each other on the same stock. If the backend scale changes, change it here too.
 *
 * Ratios NOT rated here (pb_ratio, roa, ev_ebitda, dividend_yield, quick_ratio)
 * deliberately have no entry: the backend defines no absolute scale for them, and
 * inventing one client-side would be a number we cannot defend. They keep the
 * peer comparison alone and render no grade — an honest gap, not a silent pass.
 */

/** 5 = best. Mirrors the backend's RATING_LABEL, wording included. */
export const GRADE_LABEL = {
    5: 'Excellent',
    4: 'Good',
    3: 'Average',
    2: 'Weak',
    1: 'Poor',
};

/**
 * P/E states WHERE THE MULTIPLE SITS, and nothing more.
 *
 * Deliberately not the quality words, and deliberately not the backend's own
 * CHEAP / FAIR / EXPENSIVE either. Every one of those carries a verdict: "cheap"
 * reads as a buy signal when a low multiple just as often means the market
 * expects earnings to fall, and "expensive" reads as a sell signal when a high
 * multiple is normal for a fast compounder. Neither is a call this table is in a
 * position to make, so the label reports the position and leaves the conclusion
 * to the reader.
 *
 * Tier numbers are kept (5/3/1) purely so the pill can be coloured on a scale;
 * the palette for these is neutral, NOT the green/red quality one — see
 * VALUATION_STYLE in KeyRatiosCard.
 *
 * The backend judges P/E RELATIVE to the industry (rel_pe = pe / industry_pe)
 * and falls back to absolute cutoffs when no benchmark exists. This mirrors both,
 * choosing whichever the payload can support — only the wording differs.
 */
export const VALUATION_LABEL = { 5: 'Below sector', 3: 'In line', 1: 'Above sector' };

/** Wording when there is no benchmark to sit below or above — the absolute path. */
export const VALUATION_LABEL_ABSOLUTE = { 5: 'Low', 3: 'Moderate', 1: 'High' };

/**
 * Descending [floor, tier] cutoffs for HIGHER_BETTER ratios and ascending
 * [ceiling, tier] for LOWER_BETTER ones. Read top-down; first match wins.
 */
const GRADE_SCALE = {
    // _rate_roce_roe — one scale for both, as the backend does.
    roe:              { dir: 'higher', steps: [[25, 5], [18, 4], [12, 3], [8, 2]] },
    roce:             { dir: 'higher', steps: [[25, 5], [18, 4], [12, 3], [8, 2]] },
    // _rate_net_margin
    net_margin:       { dir: 'higher', steps: [[20, 5], [10, 4], [5, 3], [2, 2]] },
    // _rate_ebitda — the closest backend analogue for an operating margin.
    operating_margin: { dir: 'higher', steps: [[25, 5], [15, 4], [10, 3], [5, 2]] },
    // _rate_debt_equity — lower is better, so these are ceilings.
    debt_equity:      { dir: 'lower',  steps: [[0.30, 5], [0.75, 4], [1.50, 3], [2.50, 2]] },
    // _rate_current_ratio. Note this is a floor scale in the backend (>=2 is best),
    // which is why current_ratio grades DIFFERENTLY from how verdict() bands it:
    // the band asks "is liquidity healthy", the grade asks "how strong is it".
    current_ratio:    { dir: 'higher', steps: [[2, 5], [1.5, 4], [1.0, 3], [0.8, 2]] },
    // The backend has no dividend rating function, so these cutoffs are ours.
    // Anchored to the Indian market rather than invented: the Nifty 50's yield
    // has sat near 1.2-1.5% for years, so ~1.5% is genuinely average, 3%+ is a
    // real income payer and 5%+ is top-decile. A zero/near-zero yield rates Poor
    // as an INCOME measure only — it says nothing about the business, which is
    // why the tooltip names the question being answered.
    dividend_yield:   { dir: 'higher', steps: [[5, 5], [3, 4], [1.5, 3], [0.5, 2]] },
};

/**
 * Absolute quality tier for a ratio, independent of any peer or sector.
 *
 * Returns { tier, label } with tier 1-5, or null when this ratio has no defensible
 * absolute scale (see the note above) or the value is unusable. Null must render as
 * "no grade", never as a neutral/average pass — the whole point is to stop implying
 * a judgement we have not made.
 */
export const grade = (key, value, benchmark = null) => {
    const v = num(value);
    if (v == null || !sane(key, v)) return null;

    // P/E takes the valuation vocabulary and, where possible, the backend's
    // RELATIVE test. `benchmark` is the sector/industry P/E when the caller has
    // one; without it we fall back to the backend's own absolute cutoffs
    // (_pe_label: >35 expensive, >20 fair) so the column still says something.
    if (key === 'pe_ratio') {
        const b = num(benchmark);
        const relative = b != null && sane(key, b) && b > 0;
        let tier;
        if (relative) {
            const rel = v / b;                       // mirrors _v4_valuation_label
            tier = rel <= 0.75 ? 5 : rel <= 1.10 ? 3 : 1;
        } else {
            tier = v > 35 ? 1 : v > 20 ? 3 : 5;      // mirrors _pe_label
        }
        // "Below sector" is only truthful when a sector figure actually went into
        // the decision; without one the label describes the multiple itself.
        const labels = relative ? VALUATION_LABEL : VALUATION_LABEL_ABSOLUTE;
        return { tier, label: labels[tier], kind: 'valuation' };
    }

    const scale = GRADE_SCALE[key];
    if (!scale) return null;
    let tier = 1;
    for (const [bound, t] of scale.steps) {
        if (scale.dir === 'higher' ? v >= bound : v <= bound) { tier = t; break; }
    }
    return { tier, label: GRADE_LABEL[tier], kind: 'quality' };
};
