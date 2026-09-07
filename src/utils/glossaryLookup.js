/**
 * Glossary lookup — the ONLY place a UI label is resolved to a glossary entry.
 *
 * Design rule: resolution is EXPLICIT, never fuzzy. `lookupTerm` matches on an
 * exact (case-folded) term or a hand-written alias. There is deliberately no
 * substring/stemming fallback, because a fuzzy match that fires on the wrong
 * word would put a wrong definition under a real number — worse than showing
 * no tooltip at all. An unknown label returns null and the caller renders
 * exactly what it renders today.
 *
 * See [[project-metric-formatting]] for the same principle applied to rounding:
 * one module owns the mapping so it cannot drift per call-site.
 */

import { GLOSSARY } from '../data/glossary';

/** term (lowercased) -> entry */
const BY_TERM = new Map(GLOSSARY.map(e => [e.term.toLowerCase(), e]));

/**
 * Aliases: the label the UI actually prints -> the sheet's term.
 *
 * Only add an alias when the on-screen label unambiguously means that term.
 * "EMA 20", "EMA 200" etc. all legitimately resolve to the single EMA entry —
 * the sheet defines the concept, not each period.
 */
const ALIASES = {
    // ── Technical: period-suffixed indicator labels ──────────────────────────
    'rsi 14': 'RSI',
    'rsi14': 'RSI',
    'ema 9': 'EMA',
    'ema 20': 'EMA',
    'ema 50': 'EMA',
    'ema 200': 'EMA',
    'ema stack': 'EMA',
    'adx 14': 'ADX',
    'atr 14': 'Volatility',
    'atr': 'Volatility',
    'sma': 'Moving average',
    'sma regime': 'Moving average',
    'moving averages': 'Moving average',
    'candlesticks': 'Candlestick',
    'candles': 'Candlestick',
    'price structure': 'Trend reversal',
    'weekly trend': 'Downtrend',
    'bollinger band': 'Bollinger Bands',

    // ── Fundamentals ─────────────────────────────────────────────────────────
    'p/e': 'P/E ratio',
    'pe': 'P/E ratio',
    'pe ratio': 'P/E ratio',
    'p/e ttm': 'P/E ratio',
    'd/e': 'D/E ratio',
    'de ratio': 'D/E ratio',
    'debt to equity': 'D/E ratio',
    'operating margin': 'OPM',
    'net margin': 'NPM',
    'profit after tax': 'PAT',
    'return on equity': 'ROE',
    'return on capital employed': 'ROCE',
    'free cash flow': 'FCF',
    'earnings per share': 'EPS',
    'revenue growth': 'Revenue',
    'sales': 'Revenue',
    'promoter holdings': 'Promoter holding',
    'dividend yld': 'Dividend yield',

    // ── Market / general ─────────────────────────────────────────────────────
    '52w high': '52 week high and low',
    '52w low': '52 week high and low',
    '52 week high': '52 week high and low',
    '52 week low': '52 week high and low',
    '52w high / low': '52 week high and low',
    'market capitalisation': 'Market cap',
    'market capitalization': 'Market cap',
    'mcap': 'Market cap',
    'last traded price': 'LTP',
    'volumes': 'Volume',
    'vol': 'Volume',
};

/**
 * Resolve a UI label to its glossary entry.
 * @param {string} label - the label as printed on screen, e.g. "ROCE" or "EMA 20".
 * @returns {{term,category,inOutput,definition,example}|null}
 */
export function lookupTerm(label) {
    if (!label || typeof label !== 'string') return null;

    // Fold the label the way a label differs from a sheet term: case, surrounding
    // punctuation/whitespace, and the trailing colon UI labels often carry.
    const key = label
        .toLowerCase()
        .replace(/[:：]\s*$/, '')
        .replace(/[()[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!key) return null;

    const direct = BY_TERM.get(key);
    if (direct) return direct;

    const aliased = ALIASES[key];
    if (aliased) return BY_TERM.get(aliased.toLowerCase()) || null;

    return null;
}

/** True when a label has a definition. Cheap guard for conditional rendering. */
export function hasTerm(label) {
    return lookupTerm(label) !== null;
}

export { GLOSSARY };
