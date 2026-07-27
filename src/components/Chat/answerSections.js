/**
 * Which sections a structured answer (QuickAnswer / AnalystAnswer) should render
 * for a given query intent — the single source of truth shared by both layouts.
 *
 * Background: extractQueryIntent() already classifies "pe ratio of X" as
 * 'fundamentals', "should i buy" as 'verdict', etc. The old document layout
 * honoured that intent, but the structured Quick/Analyst layouts (used for every
 * stock-with-price query) never received it — so a focused single-metric question
 * rendered the entire wall (chart + every scorecard + a generic BUY/HOLD verdict).
 * This maps the intent to the same focused contract the document path uses.
 *
 * @param {'full'|'verdict'|'fundamentals'|'technicals'|'chart'|'news'} queryIntent
 * @returns {{verdictBand,chart,marketStats,patterns,scoreGrid,technicalCard,
 *            fundamentalCard,sentiment,news,takeaways,directAnswer}} booleans
 */
/**
 * First real paragraph of a markdown answer — skips headings, bullets, tables and
 * blockquotes. Used as the "why" summary when there's no hoisted verdict, and as
 * the direct answer for focused intents (its opening line is the asked metric,
 * e.g. "The P/E of Reliance is 22.4…").
 * @param {string} md
 * @returns {string|null}
 */
export const firstParagraph = (md) => {
    const blocks = String(md || '').split(/\n{2,}/);
    for (const b of blocks) {
        const t = b.trim();
        if (!t) continue;
        if (/^#{1,6}\s/.test(t) || /^[-*•]\s/.test(t) || /^\|/.test(t) || /^>/.test(t)) continue;
        return t;
    }
    return null;
};

const _round = (v, d) => Number(v).toFixed(d);

/* Which fundamental metric a single-metric question is asking about, and how to
   phrase its value. Keyed to scoreCard.fundamental.ratios (see RATIO_DEFS in
   AnalystAnswer). Order matters — first regex hit wins. */
const METRIC_MATCHERS = [
    { re: /\bp\s*\/?\s*e\b|\bpe\b|price[\s-]*to[\s-]*earn|price.{0,6}earn/i,
      key: 'pe_ratio', name: 'P/E', fmt: (v) => `${_round(v, 1)}x`,
      ctx: (t) => (t != null ? ` versus the sector's ${_round(t, 1)}x` : '') },
    { re: /\broe\b|return on equity/i,        key: 'roe',            name: 'ROE',             fmt: (v) => `${_round(v, 1)}%` },
    { re: /\broce\b|return on capital/i,      key: 'roce',           name: 'ROCE',            fmt: (v) => `${_round(v, 1)}%` },
    { re: /net[\s-]*margin|profit[\s-]*margin|\bmargins?\b|profitability/i,
      key: 'net_margin',     name: 'net margin',      fmt: (v) => `${_round(v, 1)}%` },
    { re: /debt[\s-]*(to[\s-]*)?equity|\bd\s*\/?\s*e\b|leverage/i,
      key: 'debt_equity',    name: 'debt-to-equity',  fmt: (v) => _round(v, 2) },
    { re: /revenue[\s-]*(growth|cagr)|sales[\s-]*growth/i,
      key: 'revenue_growth', name: 'revenue growth',  fmt: (v) => `${_round(v, 1)}%` },
    { re: /profit[\s-]*growth|earnings[\s-]*growth/i,
      key: 'profit_growth',  name: 'profit growth',   fmt: (v) => `${_round(v, 1)}%` },
    { re: /dividend/i,                        key: 'dividend_yield', name: 'dividend yield',  fmt: (v) => `${_round(v, 2)}%` },
];

/* Normalise a ratios entry to [value, threshold, label] — mirrors getRatio(). */
const _ratioTriple = (v) => {
    if (v == null) return [null, null, null];
    if (Array.isArray(v)) return [v[0] ?? null, v[1] ?? null, v[2] ?? null];
    if (typeof v === 'object') return [v.value ?? null, v.threshold ?? null, v.label ?? null];
    return [v, null, null];
};

/**
 * A direct, on-topic answer for a single-metric question, built from the same
 * structured data that powers the fundamental scorecard — so "pe ratio of X"
 * always leads with the P/E, even when the LLM prose opens on something else.
 * Returns null when the query names no known metric or the data is missing, so
 * callers fall back to the reply's opening paragraph.
 *
 * @param {string} query        the user's question
 * @param {{ratios?: object}} fund   scoreCard.fundamental
 * @param {string} symbolLabel  ticker for the possessive ("RELIANCE's P/E …")
 * @returns {string|null}
 */
export const metricAnswer = (query, fund, symbolLabel = '') => {
    const ratios = fund?.ratios;
    if (!query || !ratios) return null;
    const m = METRIC_MATCHERS.find((x) => x.re.test(query));
    if (!m) return null;
    const [value, threshold, label] = _ratioTriple(ratios[m.key]);
    if (value == null || !Number.isFinite(Number(value))) return null;
    const who = symbolLabel ? String(symbolLabel).toUpperCase() : 'This stock';
    const ctx = m.ctx ? m.ctx(threshold) : '';
    const verdict = label ? ` — ${String(label).toLowerCase()}` : '';
    return `${who}'s ${m.name} is ${m.fmt(value)}${ctx}${verdict}.`;
};

export const answerSections = (queryIntent) => {
    // 'pe_ratio' is the older classifier's label for a single fundamental-metric
    // query ("pe ratio of X", "ROE of Y"); the newer one calls it 'fundamentals'.
    // Both mean the same focused fundamentals view, so treat them alike.
    const i = queryIntent === 'pe_ratio' ? 'fundamentals' : (queryIntent || 'full');

    // Holistic intents keep the complete analyst wall — a buy decision or a broad
    // overview genuinely needs every card. Anything unrecognised falls back here,
    // so a new/unknown intent never blanks the answer.
    const wide = !['fundamentals', 'technicals', 'chart', 'news'].includes(i);

    const isFundamentals = i === 'fundamentals';
    const isTechnicals   = i === 'technicals';
    const isChart        = i === 'chart';
    const isNews         = i === 'news';

    return {
        // BUY/SELL/HOLD band — only for decision/overview answers. A focused metric
        // question ("pe ratio") must not be answered with a trade verdict.
        verdictBand:     wide,
        chart:           wide || isTechnicals || isChart,
        marketStats:     wide || isTechnicals || isChart,
        patterns:        wide || isTechnicals,
        // Overall multi-donut Kuber score — holistic only.
        scoreGrid:       wide,
        technicalCard:   wide || isTechnicals,
        fundamentalCard: wide || isFundamentals,
        // Management sentiment / annual-report / filings wall — holistic only.
        sentiment:       wide,
        news:            wide || isNews,
        takeaways:       wide || isFundamentals,
        // Focused intents lead with the answer to what was actually asked (the
        // opening line of the LLM reply, e.g. "The P/E is 22.4…") instead of the
        // hoisted generic verdict summary.
        directAnswer:    !wide,
    };
};
