import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, ChartCandlestick, Waves, BrickWall, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import ChartPanel from './ChartPanel';
import ChartFullscreen from './ChartFullscreen';
import { normalizeOhlc } from '../../lib/chart/normalize';
import { formatVolume, formatShortDate } from '../../lib/chart/formatters';
import { buildRenko } from '../../lib/chartTransforms';
import { useTheme } from '../../context/ThemeContext';

/**
 * StockChart — TradingView-grade price chart.
 *
 * Chart types: Candles, Area, Heikin-Ashi, Renko. Crosshair, zoom, pan and
 * expand are handled by lightweight-charts; this component owns the toolbar,
 * range state and layout only.
 */

// Hide chart-pattern overlays that formed longer ago than this (bars ≈ trading days).
// Product rule: ~45 trading days — recent enough to be actionable, but wide enough to
// include already-triggered patterns (bumped from 30: a confirmed breakout can sit a
// few weeks past its trigger and still be worth seeing — e.g. a 33-bar-old triggered
// H&S was being hidden from the chart while its caption still referenced it, an
// inconsistent state). Kept in sync with FundamentalCard.
const MAX_PATTERN_AGE_DAYS = 45;

// Candlestick patterns (Hammer, Harami, Engulfing, Star, ...) are a much shorter-
// lived signal than a chart pattern — a Hammer from 25 bars ago isn't actionable
// anymore. Product rule: never circle/caption one older than 5 trading days. Kept
// in sync with AnalystAnswer's PatternSection, which applies the same cutoff.
const MAX_CANDLESTICK_AGE_DAYS = 5;

const RANGES = [
    { label: '1M', bars: 22 },
    { label: '3M', bars: 66 },
    { label: '6M', bars: 132 },
    { label: '1Y', bars: 252 },
];

const TYPE_DEFS = {
    candle: { label: 'Candles', aria: 'Candlestick chart', Icon: ChartCandlestick },
    area: { label: 'Area', aria: 'Area chart', Icon: Activity },
    heikin: { label: 'Heikin-Ashi', short: 'Heikin', aria: 'Heikin-Ashi chart', Icon: Waves },
    renko: { label: 'Renko', aria: 'Renko chart', Icon: BrickWall },
};
// Candles first in every variant — it is the default, and leading the list with
// a non-default option reads as incoherent.
const TYPE_ORDER = ['candle', 'area', 'heikin', 'renko'];

const StockChart = ({ chartData, symbol, className, patternOverlays = null, atAGlance = null, variant = 'default', defaultType = null }) => {
    const isQuick = variant === 'quick';
    const { theme } = useTheme();
    const [chartType, setChartType] = useState(defaultType || 'candle');
    const [userRange, setUserRange] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const panelRef = useRef(null);

    const { timeframe = 'daily', chart_metadata = {} } = chartData && !chartData.error ? chartData : {};

    const bars = useMemo(() => normalizeOhlc(chartData), [chartData]);
    const renko = useMemo(() => buildRenko(bars.map((b) => ({ ...b, date: b.time }))), [bars]);

    const priceChange = useMemo(() => {
        if (bars.length < 2) return { value: 0, percent: 0 };
        const first = bars[0].close;
        const last = bars[bars.length - 1].close;
        if (!first) return { value: 0, percent: 0 };
        return { value: last - first, percent: ((last - first) / first) * 100 };
    }, [bars]);

    const isPositive = priceChange.value >= 0;

    const patternAnn = useMemo(() => {
        const cp = (patternOverlays?.chart_pattern_details || [])
            .find((p) => (p?.bars_ago ?? 0) <= MAX_PATTERN_AGE_DAYS) || null;
        const a = cp?.annotations || {};
        const trendlines = a.trendlines || [];
        const hlines = a.hlines || [];
        const markers = a.markers || [];
        const curve = a.curve || [];
        const skeleton = a.skeleton || [];
        const projection = a.projection || [];
        const neckline = a.neckline || null;
        const band = a.band || null;
        const midline = a.midline || [];
        return {
            trendlines, hlines, markers, curve, skeleton, projection, neckline, band, midline,
            windowStartDate: a.window_start_date || null,
            has: !!(trendlines.length || hlines.length || markers.length || curve.length || skeleton.length || band),
        };
    }, [patternOverlays]);

    // Candlestick pattern circle (Hammer, Engulfing, Harami, Star, ...) — highlights
    // the exact candle(s) the backend flagged via ohlc_bars. Independent of
    // patternAnn above (that's chart-pattern geometry only); the pattern's NAME
    // and date live in the caption cell next to the chart (PatternSection), not
    // on the chart itself, same "no text on the chart" convention as patternAnn.
    const candlestickAnn = useMemo(() => {
        const cs = (patternOverlays?.candlestick_details || [])
            .find((p) => (p?.bars_ago ?? 0) <= MAX_CANDLESTICK_AGE_DAYS && Array.isArray(p?.ohlc_bars) && p.ohlc_bars.length) || null;
        if (!cs) return { has: false, dates: null };
        return { has: true, dates: new Set(cs.ohlc_bars.map((b) => String(b.date).slice(0, 10))) };
    }, [patternOverlays]);

    // Auto-frame the pattern: when one is present the chart opens on its window
    // (+~35% context) instead of the default 3M, so the shape fills the frame.
    // The range buttons still override.
    const autoFrameRange = useMemo(() => {
        if (!patternAnn.has || !patternAnn.windowStartDate || !bars.length) return null;
        const startPrefix = String(patternAnn.windowStartDate).slice(0, 10);
        const startIdx = bars.findIndex((b) => b.time >= startPrefix);
        if (startIdx < 0) return null;
        const span = bars.length - startIdx;
        return Math.min(bars.length, Math.max(40, Math.round(span * 1.35)));
    }, [patternAnn, bars]);

    const range = userRange ?? ((chartType === 'candle' && autoFrameRange) || 66);

    if (!chartData) return null;
    if (chartData.error) {
        return (
            <div className="w-full my-4 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
                Chart unavailable: {typeof chartData.error === 'string' ? chartData.error : 'Could not load chart data'}
            </div>
        );
    }

    const renkoEmpty = chartType === 'renko' && !renko.bricks.length && !renko.liveBrick;

    const emptyRenkoMsg = (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Price hasn't moved a full brick (₹{Number((renko.brickSize || 0).toFixed(2)).toLocaleString('en-IN')}) in this range — try a longer range.
        </div>
    );

    const panel = (
        <ChartPanel
            ref={panelRef}
            chartType={chartType}
            bars={bars}
            renko={renko}
            patternAnn={patternAnn}
            candlestickAnn={candlestickAnn}
            range={range}
            theme={theme}
            className="w-full h-full"
        />
    );

    // Logo derived from the symbol (full ticker incl. .NS/.BO) so it resolves even for chats
    // saved before logo_url existed; a symbol we don't ship 404s → onError shows the trend icon.
    const chartLogoSym = atAGlance?.symbol || chart_metadata?.symbol || symbol;
    const chartLogoSrc = chartLogoSym ? `/api/logos/${chartLogoSym}.png` : atAGlance?.logo_url;

    return (
        <div className={clsx(
            isQuick ? 'w-full' : 'w-full my-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 p-4',
            className
        )}>
            {!isQuick && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {chartLogoSrc ? (
                            <img
                                src={chartLogoSrc}
                                alt={symbol}
                                className="w-8 h-8 rounded-lg object-contain bg-white border border-zinc-200/60 dark:border-zinc-700/40 flex-shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                            />
                        ) : null}
                        <div className={clsx(
                            'p-1.5 rounded-lg',
                            chartLogoSrc ? 'hidden' : '',
                            isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
                        )}>
                            {isPositive
                                ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                : <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                                {symbol || chart_metadata.symbol || 'Chart'}
                            </h3>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {timeframe} chart • {chart_metadata.data_points || bars.length} points
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className={clsx(
                    // Single row on every screen: no wrapping; horizontal scroll as a
                    // safety so all four types stay on one line. NOT w-full on mobile —
                    // that reserved the whole line even though the four buttons do not
                    // fill it, leaving dead space after Renko and forcing the range row
                    // (ml-auto) to wrap below and hug the right edge.
                    'flex items-center gap-0 sm:gap-1 overflow-x-auto max-w-full',
                    isQuick && 'p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-black/30'
                )}>
                    {TYPE_ORDER.map((key) => {
                        const { label, short, aria, Icon } = TYPE_DEFS[key];
                        const active = chartType === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setChartType(key)}
                                aria-label={aria}
                                aria-pressed={active}
                                className={clsx(
                                    'flex items-center gap-1 sm:gap-1.5 rounded-lg font-medium transition-all flex-shrink-0 whitespace-nowrap',
                                    isQuick ? 'px-1 sm:px-3 py-1 text-[11px] sm:text-[12px]' : 'px-2 sm:px-3 py-1.5 text-[13px] sm:text-sm sm:gap-2',
                                    active
                                        ? 'bg-[#FDD405] text-black font-semibold'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                                )}
                            >
                                <Icon className={clsx('flex-shrink-0', isQuick ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                                {/* Shorter label on mobile so all four fit one line; full label on sm+ */}
                                {short ? (
                                    <>
                                        <span className="sm:hidden">{short}</span>
                                        <span className="hidden sm:inline">{label}</span>
                                    </>
                                ) : label}
                            </button>
                        );
                    })}
                </div>

                {/* ml-auto only from sm: up. On mobile this row wraps onto its own line,
                    where ml-auto pushed 1M/3M/6M/1Y to the far right, away from the
                    type buttons above them; left-aligned they share one edge.
                    w-full on mobile so the zoom cluster below can ml-auto itself to the
                    opposite edge instead of trailing the ranges as one centred clump. */}
                <div className="flex items-center gap-1 w-full sm:w-auto sm:ml-auto">
                    {chartType === 'renko' && bars.length > 0 && (
                        <span
                            title="Latest trading day loaded — a brick only appears once price moves a full brick size, so the last brick can be dated earlier than this"
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60"
                        >
                            Data as of {formatShortDate(bars[bars.length - 1].time)}
                        </span>
                    )}
                    {chartType === 'renko' && renko.brickSize > 0 && (
                        <span
                            title="Renko brick size (ATR-14 based)"
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60"
                        >
                            Brick ₹{Number(renko.brickSize.toFixed(2)).toLocaleString('en-IN')}
                        </span>
                    )}
                    {RANGES.map(({ label, bars: n }) => (
                        <button
                            key={label}
                            onClick={() => setUserRange(n)}
                            className={clsx(
                                'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                                range === n
                                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black'
                                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                    {/* ml-auto on mobile parks zoom/expand at the right edge, so the
                        ranges keep the left edge rather than the two reading as one
                        centred group; ml-1 from sm: up where the whole row is right-aligned. */}
                    <div className="flex items-center gap-0.5 ml-auto sm:ml-1 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                        <button onClick={() => panelRef.current?.zoomIn()} title="Zoom in" aria-label="Zoom in"
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                        <button onClick={() => panelRef.current?.zoomOut()} title="Zoom out" aria-label="Zoom out"
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                        <button onClick={() => setExpanded(true)} title="Expand chart" aria-label="Expand chart"
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className={clsx('h-[260px] sm:h-[340px] overflow-hidden', atAGlance ? 'flex-1 min-w-0' : 'w-full')}>
                    {renkoEmpty ? emptyRenkoMsg : expanded ? (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">Chart expanded</div>
                    ) : panel}
                </div>

                {atAGlance && (
                    <div className="w-full sm:w-40 xl:w-44 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700/40 self-start">
                        <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Today's Market Stats</p>
                        {[
                            atAGlance.open != null ? { label: 'Open', value: `₹${Number(atAGlance.open).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.high != null ? { label: 'High', value: `₹${Number(atAGlance.high).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.low != null ? { label: 'Low', value: `₹${Number(atAGlance.low).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            (atAGlance.high != null && atAGlance.low != null) ? { label: 'Range', value: `₹${Number(atAGlance.low).toLocaleString('en-IN', { maximumFractionDigits: 0 })} – ₹${Number(atAGlance.high).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.volume > 0 ? { label: 'Vol', value: formatVolume(atAGlance.volume) } : null,
                            (atAGlance['52w_low'] != null && atAGlance['52w_high'] != null) ? { label: '52w', value: `₹${Number(atAGlance['52w_low']).toLocaleString('en-IN', { maximumFractionDigits: 0 })} – ₹${Number(atAGlance['52w_high']).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                        ].filter(Boolean).map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-start gap-1 mb-2 last:mb-0">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-500">{label}</span>
                                <span className="text-[11px] text-zinc-900 dark:text-zinc-200 font-medium text-right leading-tight">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isQuick && chart_metadata.start_date && chart_metadata.end_date && (
                <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{chart_metadata.start_date} to {chart_metadata.end_date}</span>
                </div>
            )}

            <ChartFullscreen
                open={expanded}
                onClose={() => setExpanded(false)}
                title={symbol || chart_metadata.symbol || 'Chart'}
            >
                {expanded && (renkoEmpty ? emptyRenkoMsg : panel)}
            </ChartFullscreen>
        </div>
    );
};

export default StockChart;
