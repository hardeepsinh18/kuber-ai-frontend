/**
 * Parse a screener/list answer ("highest P/E in IT", "top PSU stocks by ROE")
 * into structured rows so it can render in the same card format as every other
 * answer, instead of falling out as bare prose.
 *
 * Why parse prose at all: these answers carry no per-stock structured payload —
 * no at_a_glance.price, no signal, no scoreCard — because they describe a LIST,
 * not one company. The backend already formats them as "SYMBOL: metric of X |
 * metric: Y" lines, so the data is present, just not machine-readable yet.
 *
 * Design rule: this NEVER throws and NEVER guesses. If the text does not look
 * like a clean list of symbol+metric lines, it returns an empty array and the
 * caller keeps rendering the original markdown untouched. A wrong card is worse
 * than plain prose on a financial surface, so the bar for claiming a match is
 * deliberately high.
 */

// A symbol label as the backend emits it: 2-15 chars, uppercase letters/digits,
// optionally &, - or . (M&M, BAJAJ-AUTO, L.T). Lowercase is rejected outright so
// ordinary sentences starting with a capitalised word cannot masquerade as rows.
const SYMBOL = /^([A-Z][A-Z0-9&.-]{1,14})$/;

// "P/E of 210.0", "ROE: 6.3%", "Dividend yield: 5.00%", "market cap of 1.2L Cr"
const METRIC = /([A-Za-z][A-Za-z/ .&-]{1,28}?)\s*(?:of|:|=)\s*(₹?-?\d[\d,]*\.?\d*\s*(?:%|x|L\s*Cr|Cr|K)?)/g;

const cleanLabel = (s) =>
    String(s || '')
        .replace(/^[\s,;|·•\-–—]+/, '')
        .replace(/[\s,;|·•\-–—]+$/, '')
        .trim();

/** Metrics whose label is really trailing prose, not a field name. */
const isNoiseLabel = (label) => {
    const l = label.toLowerCase();
    if (l.length < 2 || l.length > 28) return true;
    // Sentence fragments that happen to contain "of"/":" before a number.
    return /\b(these|this|that|which|but|and|its|the most|stand|leads|trades|offers|means|check|often)\b/.test(l);
};

/**
 * Extract one row from a single line.
 * Returns null unless the line is clearly "SYMBOL: <metrics>".
 */
function parseLine(rawLine) {
    const line = String(rawLine || '')
        // strip markdown bullets/emphasis so "**LENSKART**: ..." matches
        .replace(/^[\s>*\-+·•]+/, '')
        .replace(/\*\*/g, '')
        .replace(/^\d+[.)]\s*/, '')      // "1. LENSKART: ..."
        .trim();
    if (!line) return null;

    // Split on the FIRST colon — everything before it must be a bare symbol.
    const idx = line.indexOf(':');
    if (idx < 1) return null;
    const symbol = line.slice(0, idx).trim();
    if (!SYMBOL.test(symbol)) return null;

    const rest = line.slice(idx + 1);
    const metrics = [];
    const seen = new Set();
    METRIC.lastIndex = 0;
    let m;
    while ((m = METRIC.exec(rest)) !== null) {
        const label = cleanLabel(m[1]);
        const value = cleanLabel(m[2]);
        if (!label || !value || isNoiseLabel(label)) continue;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;      // first mention wins
        seen.add(key);
        metrics.push({ label, value });
        if (metrics.length >= 4) break;   // keep a card readable
    }

    if (metrics.length === 0) return null;
    return { symbol, metrics };
}

/**
 * Parse a screener answer body into rows.
 * @returns {{symbol: string, metrics: {label: string, value: string}[]}[]}
 *          Empty array when the answer is not a recognisable list — the caller
 *          must then render the original prose unchanged.
 */
export function parseScreenerRows(content) {
    const text = String(content || '');
    if (!text.trim()) return [];

    const rows = [];
    const seenSymbols = new Set();
    for (const line of text.split(/\n+/)) {
        const row = parseLine(line);
        if (!row) continue;
        if (seenSymbols.has(row.symbol)) continue;   // don't repeat a symbol
        seenSymbols.add(row.symbol);
        rows.push(row);
    }

    // Two or more rows is the signal that this is genuinely a list. A single
    // match is far more likely to be a sentence that happened to parse, and the
    // single-stock layouts already handle real one-company answers.
    return rows.length >= 2 ? rows : [];
}

/**
 * Prose that is NOT part of the parsed rows — the lead-in and the takeaway
 * paragraph — so the card can still show the model's commentary.
 * Lines that produced a row are dropped; everything else is kept in order.
 */
export function screenerProse(content) {
    const text = String(content || '');
    if (!text.trim()) return { intro: '', outro: '' };

    const lines = text.split(/\n+/);
    const before = [];
    const after = [];
    let seenRow = false;

    for (const line of lines) {
        const row = parseLine(line);
        if (row) { seenRow = true; continue; }
        // A heading is chrome, not commentary — the card renders its own title.
        if (/^\s*#{1,6}\s/.test(line)) continue;
        (seenRow ? after : before).push(line.trim());
    }

    // The backend often runs the takeaway onto the END of the last row's line
    // ("... | Dividend yield: 5.00% These three stand out ..."), so recover the
    // sentence tail that follows the final metric on a row line.
    for (const line of lines) {
        if (!parseLine(line)) continue;
        const tail = line.replace(/\*\*/g, '').match(/(?:%|x|Cr|\d)\s+([A-Z][^|]{25,}$)/);
        if (tail) after.push(cleanLabel(tail[1]));
    }

    return {
        intro: before.join(' ').trim(),
        outro: after.join(' ').trim(),
    };
}
