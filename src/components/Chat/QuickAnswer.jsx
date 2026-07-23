import React from 'react';
import { clsx } from 'clsx';
import StockChart from './StockChart';
import {
    BRAND, InlineMd, Card, CardHeader, SectionBanner,
    CompanyCard, VerdictBand, MarketStatsCard, buildMarketStats, ScoreGrid, getScores,
} from './answerKit';

/**
 * QuickAnswer — the "instant read" layout for Quick (snap) mode.
 * Verdict, live chart, overall score and reasoning, all on one screen:
 *   1. Company card (name · NSE:SYM · price · day change)
 *   2. Yellow KUBER VERDICT band (BUY/SELL/HOLD + Entry / Stop Loss / Target)
 *   3. Chart card (Area default) + Today's Market Stats side card
 *   4. VENTY SCORE banner + Overall Health donut + Technical/Fundamental/Sentimental
 *   5. Key Takeaway bullets
 *   6. Recent News
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
}) => {
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

            <CompanyCard metadata={metadata} symbolLabel={symbolLabel} />

            <VerdictBand verdict={scoreCard?.verdict} signal={signal} verdictText={verdictText} content={content}
                         aiTake={aiTake} price={price} patternSummary={patternSummary} />

            {/* ── Chart + Today's Market Stats ───────────────────── */}
            {(chart || stats.length > 0) && (
                <div className={clsx('grid gap-3', chart && stats.length > 0 ? 'lg:grid-cols-[1fr_230px]' : 'grid-cols-1')}>
                    {chart && (
                        <Card className="p-3 min-w-0">
                            <StockChart
                                chartData={chart}
                                symbol={symbolLabel}
                                patternOverlays={patternSummary}
                                variant="quick"
                                defaultType="candle"
                            />
                        </Card>
                    )}
                    <MarketStatsCard stats={stats} />
                </div>
            )}

            {/* ── VENTY SCORE ─────────────────────────────────── */}
            {hasScores && (
                <>
                    <SectionBanner>Venty Score</SectionBanner>
                    <ScoreGrid scoreCard={scoreCard} managementSentiment={managementSentiment} />
                </>
            )}

            {/* ── Key Takeaway ───────────────────────────────────── */}
            {takeaways.length > 0 && (
                <Card className="px-4 py-3.5">
                    <CardHeader>Key Takeaway</CardHeader>
                    <ul className="mt-2 space-y-2">
                        {takeaways.map((t, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
                                <span className="flex-1 min-w-0"><InlineMd>{t}</InlineMd></span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* ── Recent News ────────────────────────────────────── */}
            {newsItems.length > 0 && (
                <Card className="px-4 py-3.5">
                    <CardHeader>Recent News</CardHeader>
                    <div className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {newsItems.map((h, i) => {
                            const meta = h?.time_ago || h?.published || h?.source || '';
                            return (
                                <div key={`${i}-${(h?.title || '').slice(0, 40)}`} className="flex items-center justify-between gap-3 py-2.5">
                                    {h?.url ? (
                                        <a href={h.url} target="_blank" rel="noopener noreferrer"
                                           className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 hover:text-amber-700 dark:hover:text-[#FDD405] hover:underline transition-colors flex-1 min-w-0">
                                            {h.title || 'Untitled'}
                                        </a>
                                    ) : (
                                        <p className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 flex-1 min-w-0">
                                            {h?.title || 'Untitled'}
                                        </p>
                                    )}
                                    {meta && (
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0 text-right text-amber-700 dark:text-[#FDD405]">
                                            {meta}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* ── Footer strip ───────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Say Venty to the market
                </span>
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Venty
                </span>
            </div>
        </div>
    );
};

export default QuickAnswer;
