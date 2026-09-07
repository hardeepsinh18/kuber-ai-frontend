/**
 * Prose annotation — find glossary terms inside generated sentences.
 *
 * This is the half that reaches a first-time user. Labels ("ROE") are a fixed
 * list; the sentences around them ("momentum has rolled over", "P/E 13.9x ·
 * cheap") are where someone new actually gets lost.
 *
 * Safety rules, in order — each exists to stop a specific way this goes wrong:
 *   1. FIRST MENTION ONLY, per rendered block. Annotating every "bullish" in a
 *      paragraph turns it into a field of dotted underlines and reads as noise.
 *   2. LONGEST MATCH WINS. "Moving average" must beat "average"; "Dividend
 *      yield" must beat "Dividend".
 *   3. WHOLE WORDS ONLY. "Volume" must not fire inside "Volumes rose" mid-word,
 *      and "Short" must not fire inside "Shortly".
 *   4. NEVER INSIDE QUOTES. Management commentary is someone's actual words —
 *      we do not decorate a CEO's sentence with our tooltips.
 *   5. A CURATED PROSE SET, not all 156 terms. Sheet rows like "Correction" or
 *      "Position" are ordinary English and would fire constantly on false
 *      positives. Only terms that are unambiguous jargon in a market sentence
 *      are eligible here; the full 156 stay available for label lookup.
 */

import { lookupTerm } from './glossaryLookup';

/**
 * Terms eligible for in-prose annotation. Deliberately a subset: each of these
 * reads as jargon wherever it appears in a market sentence, so a match is
 * almost certainly the financial sense rather than the everyday one.
 *
 * Excluded on purpose — too ambiguous in ordinary prose: Support, Resistance,
 * Volume, Correction, Position, Short, Long, Cover, Premium, Delivery, Rally,
 * Spread, Beta, Liquid, Guidance, Revenue, Valuation.
 */
const PROSE_TERMS = [
    // Technical — unambiguous indicator names
    'RSI', 'MACD', 'EMA', 'ADX', 'VWAP', 'ATR',
    'Bollinger Bands', 'Moving average', 'Candlestick', 'Candlesticks',
    'Oversold', 'Overbought', 'Crossover', 'Momentum', 'Volatility',
    'Downtrend', 'Uptrend', 'Trend reversal', 'Breakout', 'Consolidation',
    'Range bound', 'Harami', 'Fibonacci levels', 'OHLC', 'Mean reversion',
    // Fundamentals — ratio names
    'ROE', 'ROCE', 'OPM', 'NPM', 'P/E ratio', 'P/E', 'D/E ratio', 'D/E',
    'TTM', 'CAGR', 'PAT', 'EPS', 'FCF', 'Dividend yield', 'Book value',
    'Face value', 'Promoter holding', 'Market cap', 'Sector average',
    'Leverage', 'Free cash flow',
    // Market / trading
    'Bullish', 'Bearish', 'Blue chip', 'Multibagger', 'Penny stock',
    'Large cap', 'Mid cap', 'Small cap', 'Cyclical stock', 'Price taker',
    'Entry zone', 'Stop loss', 'Target price', 'Drawdown', 'Liquidity',
    '52 week high and low', 'Circuit', 'Upper circuit', 'Lower circuit',
    'Intraday', 'Diversification', 'Compounding', 'Hedging',
];

/* Longest first so "Moving average" wins over "average", "P/E ratio" over "P/E". */
const SORTED = [...PROSE_TERMS].sort((a, b) => b.length - a.length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One regex, alternation ordered longest-first, matched case-insensitively on
 * whole words. Built once at module load rather than per render.
 * `(?<![\w])` / `(?![\w])` rather than \b so terms containing "/" (P/E, D/E)
 * still anchor correctly.
 */
const TERM_RE = new RegExp(`(?<![\\w])(${SORTED.map(escapeRe).join('|')})(?![\\w])`, 'gi');

/** Spans of the string that sit inside quotes and must not be annotated. */
const quotedSpans = (text) => {
    const spans = [];
    // straight "..." and smart “...” quotes
    const re = /"[^"]*"|“[^”]*”/g;
    let m;
    while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
    return spans;
};

/**
 * Split `text` into segments, marking the first occurrence of each glossary term.
 *
 * @param {string} text
 * @param {Set<string>} [seen] - terms already annotated in this block; mutated.
 *        Pass the same Set across sibling bullets so a term is marked once per card.
 * @returns {Array<{text: string, term: string|null}>} - `term` is the sheet's
 *          canonical term when this segment should be annotated, else null.
 */
export function annotateProse(text, seen = new Set()) {
    if (!text || typeof text !== 'string') return [{ text: String(text ?? ''), term: null }];

    const skip = quotedSpans(text);
    const inQuote = (i) => skip.some(([a, b]) => i >= a && i < b);

    const out = [];
    let last = 0;
    TERM_RE.lastIndex = 0;
    let m;
    while ((m = TERM_RE.exec(text)) !== null) {
        const entry = lookupTerm(m[1]);
        if (!entry) continue;                       // not a real sheet term
        if (seen.has(entry.term)) continue;         // rule 1: first mention only
        if (inQuote(m.index)) continue;             // rule 4: never inside quotes

        seen.add(entry.term);
        if (m.index > last) out.push({ text: text.slice(last, m.index), term: null });
        out.push({ text: m[0], term: entry.term });
        last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last), term: null });
    return out.length ? out : [{ text, term: null }];
}

export { PROSE_TERMS };
