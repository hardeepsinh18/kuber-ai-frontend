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
 * Terms eligible for in-prose annotation: every sheet term whose financial
 * sense is the only sense it plausibly carries inside a market sentence.
 *
 * 131 of the sheet's 156 terms are listed. The 25 left out are ordinary English
 * first and jargon second, so matching them in prose produces confident wrong
 * tooltips ("strong support from the board", "a correction to the report",
 * "the volume of complaints", "we cover that in the report"):
 *
 *   Support, Resistance, Revenue, Valuation, Guidance, Index, Liquid, Delivery,
 *   Spread, Listing, Options, Premium, Short, Long, Cover, Portfolio, Rally,
 *   Correction, Book profit, Book loss, Holding, Watchlist, Volume, Position,
 *   Beta.
 *
 * Their unambiguous compounds ARE included, so nothing is really lost: Call
 * option / Put option cover "Options", Listing gain covers "Listing", Upper and
 * Lower circuit cover the circuit rules, and so on.
 *
 * All 25 remain fully available for LABEL lookup via glossaryLookup, where the
 * surrounding UI already guarantees the financial sense — a column header
 * reading "Volume" is never about loudness. This list governs prose only.
 */
const PROSE_TERMS = [
    // Technical — unambiguous indicator names
    // NB: VWAP is deliberately absent — it has no row in the sheet, so there is
    // no approved copy for it. Add the row first, then list it here.
    'RSI', 'MACD', 'EMA', 'ADX', 'ATR',
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
    'Accumulate', 'Tranches', 'Averaging down', 'Crash',
    // Market structure — index names are proper nouns, never everyday words
    'Nifty', 'Sensex', 'Sectoral index',
    // Fundamentals — the rest of the reporting vocabulary
    'Promoter', 'Cash flow', 'Quarterly results', 'Balance sheet',
    'FII', 'DII', 'Dividend',
    // Corporate actions — all unambiguous in a market sentence
    'IPO', 'FPO', 'Listing gain', 'Bonus shares', 'Stock split',
    'Rights issue', 'Buyback', 'Ex date', 'Delisting',
    // Derivatives — the contract vocabulary (bare Short/Long/Cover/Premium
    // stay out below; these compounds are unambiguous)
    'Futures', 'Call option', 'Put option', 'Strike price',
    'Open interest', 'Expiry',
    // Mutual funds
    'Mutual fund', 'SIP', 'NAV', 'Expense ratio', 'ELSS', 'Index fund',
    'ETF', 'Lump sum',
    // Orders & charges — acronyms and compounds with no everyday sense
    'LTP', 'Market order', 'Limit order', 'Trigger price', 'Square off',
    'CNC', 'MIS', 'Lot size', 'Bid price', 'Ask price', 'Previous close',
    'Day change', 'Gap up', 'Gap down',
    'Brokerage', 'STT', 'DP charges', 'Stamp duty', 'T plus one',
    'Contract note', 'Auction penalty',
    // Account & regulator — proper nouns and fixed terms
    'Demat account', 'Trading account', 'KYC', 'Depository',
    'CDSL', 'NSDL', 'NSE', 'BSE', 'SEBI', 'Nominee',
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
