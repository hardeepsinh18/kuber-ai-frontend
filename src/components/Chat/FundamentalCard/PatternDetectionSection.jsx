import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { INNER_CARD_DARK } from '../answerKit';
import { PatternMiniChart } from './PatternMiniChart';
import { ChartPatternCard } from './ChartPatternCard';
import { PatternModal } from './PatternModal';

/* ─── PATTERN DETECTION & RESISTANCE ALERT ───────────────────────────────── */
// Hide patterns that formed longer ago than this (bars ≈ trading days on a daily chart).
// Keeps the section focused on recent formations instead of stale ones from months back.
// Product rule: ~45 trading days — includes recently-triggered (broken-out) patterns, not
// just half-formed ones (bumped from 30, see StockChart's MAX_PATTERN_AGE_DAYS comment).
// Kept in sync with StockChart's MAX_PATTERN_AGE_DAYS.
const MAX_PATTERN_AGE_DAYS = 45;
// Candlestick patterns are a much shorter-lived signal than a chart pattern —
// never surface one older than 5 trading days. Kept in sync with StockChart's
// and AnalystAnswer's MAX_CANDLESTICK_AGE_DAYS.
const MAX_CANDLESTICK_AGE_DAYS = 5;

export const PatternDetectionSection = ({ patternSummary, chartData = null }) => {
    const [open, setOpen] = React.useState(false);
    const [selectedPattern, setSelectedPattern] = useState(null);

    if (!patternSummary) return null;

    const candlestickNames = Array.isArray(patternSummary.candlestick) ? patternSummary.candlestick : [];
    const candlestickDetails = Array.isArray(patternSummary.candlestick_details) ? patternSummary.candlestick_details : [];
    const chartPatternDetails = Array.isArray(patternSummary.chart_pattern_details) ? patternSummary.chart_pattern_details : [];
    const summary    = patternSummary.summary;
    const resistance = patternSummary.resistance;
    const support    = patternSummary.support;

    // name → detail map (bars_ago, strength, ohlc_bars)
    const detailMap = useMemo(() => {
        const map = {};
        candlestickDetails.forEach(d => { map[d.name] = d; });
        [...(patternSummary.bullish_details || []), ...(patternSummary.bearish_details || [])]
            .forEach(d => { if (!map[d.name]) map[d.name] = d; });
        return map;
    }, [patternSummary, candlestickDetails]);

    // Only surface patterns formed within the last MAX_PATTERN_AGE_DAYS bars (~days).
    // Older formations (e.g. a Head & Shoulders from 115 bars ago) are stale and hidden.
    // Candlesticks use their own, much stricter cutoff (5 bars vs 30) — they're a
    // short-lived signal and go stale far faster than a multi-week chart pattern.
    const isRecent = (barsAgo) => (barsAgo ?? 0) <= MAX_PATTERN_AGE_DAYS;
    const isRecentCandle = (barsAgo) => (barsAgo ?? 0) <= MAX_CANDLESTICK_AGE_DAYS;
    const recentCandlestickNames = candlestickNames.filter(name => isRecentCandle(detailMap[name]?.bars_ago));
    const recentChartPatterns = chartPatternDetails.filter(cp => isRecent(cp?.bars_ago));

    const hasPatterns = recentCandlestickNames.length > 0 || recentChartPatterns.length > 0;
    const topChartPattern = recentChartPatterns[0] || null;

    return (
        <>
            <div className={`mt-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[${INNER_CARD_DARK}]`}>
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">Pattern Detection & Resistance Alert</span>
                    {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                          : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
                </button>

                {open && (
                    <div className={`p-4 bg-zinc-50 dark:bg-[${INNER_CARD_DARK}]`}>
                        {summary && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">{summary}</p>
                        )}

                        {!hasPatterns && (
                            <div className="flex items-center gap-2 py-2 px-1 text-[12px] text-zinc-500 dark:text-zinc-500 italic">
                                <span>Nothing forming right now, no chart or candle patterns detected in recent price action.</span>
                            </div>
                        )}

                        <div className={`grid gap-3 ${recentCandlestickNames.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Left: Candle Patterns */}
                            {recentCandlestickNames.length > 0 && (
                                <div className="min-w-0 overflow-hidden">
                                    <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                                        Candle Pattern
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        {recentCandlestickNames.slice(0, 1).map((name, i) => {
                                            const detail   = detailMap[name] || {};
                                            const barsAgo  = detail.bars_ago ?? 0;
                                            const strength = detail.strength;
                                            const ohlcBars = detail.ohlc_bars || null;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedPattern({ name, barsAgo, strength, ohlcBars })}
                                                    className="w-full text-left bg-white dark:bg-zinc-900 border border-[#FDD405] rounded-xl p-3 hover:border-[#FDD405] hover:shadow-md transition-all group"
                                                >
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
                                                        {resistance != null && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/40 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 flex-shrink-0" />
                                                                R ₹{Number(resistance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-auto">
                                                            {barsAgo === 0 ? 'Today' : `${barsAgo}d ago`}
                                                            {strength ? ` · ${strength}` : ''}
                                                        </span>
                                                    </div>

                                                    <PatternMiniChart
                                                        chartData={chartData}
                                                        barsAgo={barsAgo}
                                                        support={support}
                                                        resistance={resistance}
                                                        ohlcBars={ohlcBars}
                                                    />

                                                    <div className="border-t border-zinc-200 dark:border-zinc-700/40 pt-2 mt-2 flex items-center justify-between">
                                                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">{name}</p>
                                                        <span className="text-[9px] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors">tap →</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Right: Chart Pattern (top 1) or placeholder */}
                            <div className="min-w-0 overflow-hidden">
                                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                                    Chart Pattern
                                </p>
                                {topChartPattern ? (
                                    <ChartPatternCard cp={topChartPattern} />
                                ) : (
                                    <div className="h-full min-h-[80px] flex items-center justify-center rounded-xl border border-dashed border-zinc-700/50 px-4 py-6 text-center">
                                        <span className="text-[11px] text-zinc-500 italic leading-relaxed">
                                            No classical chart patterns detected, no triangle, channel, or H&amp;S forming currently.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive candle pattern modal */}
            {selectedPattern && (
                <PatternModal
                    pattern={{ name: selectedPattern.name, bars_ago: selectedPattern.barsAgo, strength: selectedPattern.strength, direction: detailMap[selectedPattern.name]?.direction }}
                    ohlcBars={selectedPattern.ohlcBars}
                    chartData={chartData}
                    support={support}
                    resistance={resistance}
                    onClose={() => setSelectedPattern(null)}
                />
            )}
        </>
    );
};
