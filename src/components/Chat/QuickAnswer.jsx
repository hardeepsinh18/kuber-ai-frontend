import React from 'react';
import { clsx } from 'clsx';
import StockChart from './StockChart';
import {
    Card, CardHeader, InlineMd, INNER_CARD,
    CompanyCard, VerdictBand, MarketStatsCard, buildMarketStats, VentyScorePanel, getScores,
} from './answerKit';
import { answerSections, firstParagraph, metricAnswer } from './answerSections';

/**
 * QuickAnswer — the "instant read" layout for Quick (snap) mode.
 * Verdict, live chart, overall score and reasoning, all on one screen:
 *   1. Company card (name · NSE:SYM · price · day change)
 *   2. Yellow VENTYAI VERDICT band (BUY/SELL/HOLD + Entry / Stop Loss / Target)
 *   3. Chart card (Area default) + Today's Market Stats side card
 *   4. VENTYAI SCORE panel — header bar, Overall Health gauge + Overview
 *      bullets, then Technical/Fundamental/Sentimental cards with commentary
 *   5. Recent News
 * Every section renders only when its data exists.
 */

/* Pull up to 4 takeaway bullets: verdict line → signal.why → aiTake → content bullets */
const buildTakeaways = (verdictText, signal, aiTake, content) => {
    const out = [];
    const push = (t) => {
        const clean = String(t || '')
            .replace(/^\s*[>*•\-–]\s*/, '')
            .replace(/^\**\s*verdict\s*:?\**\s*/i, '')
            .trim();
        if (clean && !out.some(o => o.toLowerCase() === clean.toLowerCase())) out.push(clean);
    };
    if (verdictText) push(verdictText);
    (Array.isArray(signal?.why) ? signal.why : []).forEach(push);
    (Array.isArray(aiTake?.bullets) ? aiTake.bullets : []).forEach(b => push(b?.text));
    if (out.length < 2 && typeof content === 'string') {
        content.split('\n')
            .filter(l => /^\s*[-*•]\s+\S/.test(l))
            .filter(l => !/disclaimer|consult a sebi|education only/i.test(l))
            .forEach(push);
    }
    return out.slice(0, 4);
};

const QuickAnswer = ({
    content,
    verdictText = null,
    metadata = {},
    signal = null,
    scoreCard = null,
    managementSentiment = null,
    aiTake = null,
    chartData = null,
    news = [],
    symbolLabel = '',
    patternSummary = null,
    queryIntent = 'full',
    query = null,
}) => {
    // Which sections this intent shows — focused questions ("pe ratio of X") get a
    // direct answer, not the full verdict + chart + score wall. For a single-metric
    // question the answer is built from the scorecard data ("RELIANCE's P/E is
    // 23.2x …"), so it targets the asked metric instead of the reply's opening line.
    const sections = answerSections(queryIntent);
    const directAnswer = sections.directAnswer
        ? (metricAnswer(query, scoreCard?.fundamental, symbolLabel) || firstParagraph(content) || verdictText
            || (Array.isArray(signal?.why) && signal.why.length ? signal.why.join(' ') : null))
        : null;
    const aag = metadata?.at_a_glance || {};
    const price = aag.price != null ? Number(aag.price) : null;

    /* chart — single primary chart in quick view */
    const chart = Array.isArray(chartData)
        ? chartData.find(cd => cd && !cd.error) || null
        : (chartData && !chartData.error ? chartData : null);

    const stats = buildMarketStats(aag);
    const scores = getScores(scoreCard, managementSentiment);
    const hasScores = scores.overall != null || scores.technical != null
        || scores.fundamental != null || scores.sentimental != null;

    const takeaways = buildTakeaways(verdictText, signal, aiTake, content);
    const newsItems = (Array.isArray(news) ? news : []).slice(0, 5);

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

            {/* ── Summary hero — a padded MAIN card holding distinct inner sub-cards
                 (company header, verdict, answer, chart + market stats) ── */}
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181613] p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
                <CompanyCard metadata={metadata} symbolLabel={symbolLabel} raised />

                {sections.verdictBand && (
                    <VerdictBand verdict={scoreCard?.verdict} verdictIntent={scoreCard?.verdict_intent} signal={signal}
                                 verdictText={verdictText} content={content}
                                 aiTake={aiTake} price={price} patternSummary={patternSummary} raised />
                )}

                {/* ── Direct answer — focused intents lead with what was asked ─ */}
                {directAnswer && (
                    <div className={clsx('px-4 py-3.5', INNER_CARD)}>
                        <CardHeader>Answer</CardHeader>
                        <div className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                            <InlineMd>{directAnswer.replace(/^\**\s*verdict\s*:?\**\s*/i, '')}</InlineMd>
                        </div>
                    </div>
                )}

                {/* ── Chart + Today's Market Stats ───────────────────── */}
                {((sections.chart && chart) || (sections.marketStats && stats.length > 0)) && (
                    <div className={clsx('grid gap-2.5 sm:gap-3',
                        (sections.chart && chart) && (sections.marketStats && stats.length > 0) ? 'lg:grid-cols-[1fr_230px]' : 'grid-cols-1')}>
                        {sections.chart && chart && (
                            <div className={clsx('p-3 min-w-0', INNER_CARD)}>
                                <StockChart
                                    chartData={chart}
                                    symbol={symbolLabel}
                                    patternOverlays={patternSummary}
                                    variant="quick"
                                    defaultType="candle"
                                />
                            </div>
                        )}
                        {sections.marketStats && stats.length > 0 && <MarketStatsCard stats={stats} raised />}
                    </div>
                )}
            </div>

            {/* ── VENTYAI SCORE — reference panel layout (holistic intents only) ── */}
            {/* Key Takeaway bullets now live inside the panel as "Overview" */}
            {sections.scoreGrid && (hasScores || takeaways.length > 0) && (
                <VentyScorePanel
                    scoreCard={scoreCard}
                    managementSentiment={managementSentiment}
                    companyName={aag.company_name || aag.display_name || symbolLabel}
                    overviewBullets={takeaways}
                />
            )}

            {/* ── Recent News ────────────────────────────────────── */}
            {sections.news && newsItems.length > 0 && (
                <Card className="px-4 py-3.5">
                    <CardHeader>Recent News</CardHeader>
                    <div className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {newsItems.map((h, i) => {
                            const meta = h?.time_ago || h?.published || h?.source || '';
                            return (
                                <div key={`${i}-${(h?.title || '').slice(0, 40)}`} className="flex items-center justify-between gap-3 py-2.5">
                                    {h?.url ? (
                                        <a href={h.url} target="_blank" rel="noopener noreferrer"
                                           className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 hover:text-zinc-900 dark:hover:text-[#FDD405] hover:underline transition-colors flex-1 min-w-0">
                                            {h.title || 'Untitled'}
                                        </a>
                                    ) : (
                                        <p className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 flex-1 min-w-0">
                                            {h?.title || 'Untitled'}
                                        </p>
                                    )}
                                    {meta && (
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0 text-right text-zinc-600 dark:text-[#FDD405]">
                                            {meta}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default QuickAnswer;
