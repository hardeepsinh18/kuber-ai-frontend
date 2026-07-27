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
