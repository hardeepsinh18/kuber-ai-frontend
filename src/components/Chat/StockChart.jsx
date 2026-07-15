import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    AreaChart,
    Area,
    ComposedChart,
    Customized,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, ChartCandlestick, Waves, BrickWall, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';
import PatternAnnotationLayer from './PatternAnnotationLayer';
import { toHeikinAshi, buildRenko } from '../../lib/chartTransforms';

/**
 * StockChart Component - Beautiful multi-timeframe stock charts
 *
 * Features:
 * - Multiple chart types (Candlestick, Area, Heikin-Ashi, Renko)
 * - Timeframe selector
 * - OHLCV data support
 * - Dark mode
 * - Responsive
 * - Smooth animations
 */
// Hide chart-pattern overlays that formed longer ago than this (bars ≈ trading days).
// Mirrors the same freshness rule used by the Pattern Detection card in FundamentalCard.
// Product rule: ~30 trading days — recent enough to be actionable, but wide enough to
// include already-triggered patterns (broken out ~3-4 weeks ago), which read cleaner
// than half-formed ones. Kept in sync with FundamentalCard's MAX_PATTERN_AGE_DAYS.
const MAX_PATTERN_AGE_DAYS = 30;

// Shared bull/bear polarity colors across candle, Heikin-Ashi and Renko views
const BULL_COLOR = '#26a69a';
const BEAR_COLOR = '#ef5350';

const fmtVolLocal = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

// Pixel distance between adjacent category ticks. Recharts exposes bandSize on
// the axis object; point scales report none, so fall back to measuring the gap
// between the first two data points.
const axisStep = (xAxis, data, key) => {
    if (Number.isFinite(xAxis?.bandSize) && xAxis.bandSize > 0) return xAxis.bandSize;
    if (data.length > 1) {
        const a = xAxis.scale(data[0][key]);
        const b = xAxis.scale(data[1][key]);
        if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return Math.abs(b - a);
    }
    return 8;
};

// Point scales position ticks at the mark center; band scales at the left edge.
const tickCenter = (xAxis, pos) => {
    const bw = typeof xAxis.scale?.bandwidth === 'function' ? xAxis.scale.bandwidth() : 0;
    return pos + bw / 2;
};

// Real candlestick layer rendered via Recharts Customized.
// Also renders Heikin-Ashi bars — same geometry, pre-smoothed data.
const CandleLayer = ({ xAxisMap, yAxisMap, data }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;
    const step = axisStep(xAxis, data, 'date');
    // Body width tracks bar spacing but never turns into slabs on sparse data
    const halfW = Math.min(Math.max(step * 0.38, 2.5), 11);
    return (
        <g>
            {data.map((point, i) => {
                if (point.open == null || point.close == null || point.high == null || point.low == null) return null;
                const isBull = point.close >= point.open;
                const color = isBull ? BULL_COLOR : BEAR_COLOR;
                const xPos = xAxis.scale(point.date);
                if (xPos == null || isNaN(xPos)) return null;
                const cx = tickCenter(xAxis, xPos);
                const yH = yAxis.scale(point.high);
                const yL = yAxis.scale(point.low);
                const bodyTop = yAxis.scale(Math.max(point.open, point.close));
                const bodyBot = yAxis.scale(Math.min(point.open, point.close));
                if ([yH, yL, bodyTop, bodyBot].some(v => v == null || isNaN(v))) return null;
                const bodyH = Math.max(Math.abs(bodyBot - bodyTop), 1.5);
                return (
                    <g key={i}>
                        {/* Wick */}
                        <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth={1.5} opacity={0.85} />
                        {/* Body — solid fill for both bull and bear */}
                        <rect x={cx - halfW} y={bodyTop} width={halfW * 2} height={bodyH}
                              fill={color} stroke={color} strokeWidth={0.5} rx={1} />
                    </g>
                );
            })}
        </g>
    );
};

// Renko brick layer — equal-height bricks positioned by brick index, since the
// Renko x-axis tracks price movement, not time.
const RenkoLayer = ({ xAxisMap, yAxisMap, data }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;
    const step = axisStep(xAxis, data, 'idx');
    const gap = Math.max(Math.min(step * 0.15, 3), 1.5);
    // Bricks fill the spacing minus a surface gap, capped so sparse charts
    // don't render as giant slabs
    const w = Math.min(Math.max(step - gap, 2), 30);
    return (
        <g>
            {data.map((brick) => {
                const xPos = xAxis.scale(brick.idx);
                if (xPos == null || isNaN(xPos)) return null;
                const yO = yAxis.scale(brick.open);
                const yC = yAxis.scale(brick.close);
                if ([yO, yC].some(v => v == null || isNaN(v))) return null;
                const color = brick.dir === 1 ? BULL_COLOR : BEAR_COLOR;
                return (
                    <rect
                        key={brick.idx}
                        x={tickCenter(xAxis, xPos) - w / 2}
                        y={Math.min(yO, yC)}
                        width={w}
                        height={Math.max(Math.abs(yC - yO), 1.5)}
                        fill={color}
                        fillOpacity={0.92}
                        stroke={color}
                        strokeWidth={0.5}
                        rx={1.5}
                    />
                );
            })}
        </g>
    );
};

const CANDLE_RANGES = [
    { label: '1M', bars: 22 },
    { label: '3M', bars: 66 },
    { label: '6M', bars: 132 },
    { label: '1Y', bars: 252 },
];

const MIN_BAR_PX = 6;
const MAX_BAR_PX = 24;
const DEFAULT_BAR_PX = 11;

const StockChart = ({ chartData, symbol, className, patternOverlays = null, atAGlance = null, variant = 'default', defaultType = null }) => {
    const isQuick = variant === 'quick';
    const [chartType, setChartType] = useState(defaultType || 'candle');
    const [userRange, setUserRange] = useState(null); // null = auto (pattern frame or 3M)
    const [barPx, setBarPx] = useState(DEFAULT_BAR_PX);
    const [visibleCount, setVisibleCount] = useState(null); // null = show all data
    const scrollRef = useRef(null);

    // Candle, Heikin-Ashi and Renko all share the scrollable-bars layout
    const isScrollView = chartType !== 'area';

    // Parse chart data — null/error chartData is handled after the hooks below,
    // since React hooks must run unconditionally on every render
    const {
        dates = [],
        open = [],
        high = [],
        low = [],
        close = [],
        volume = [],
        timeframe = 'daily',
        chart_metadata = {}
    } = chartData && !chartData.error ? chartData : {};

    // Prepare data for Recharts — filter rows where close is missing or zero
    const data = useMemo(() => {
        return dates.map((date, index) => ({
            date,
            open: open[index] || null,
            high: high[index] || null,
            low: low[index] || null,
            close: close[index] || null,
            volume: volume[index] || null,
            price: close[index] || null,
        })).filter(d => d.close != null && d.close > 0);
    }, [dates, open, high, low, close, volume]);

    // Calculate price change — skip zero/null values at either end (stale DB data)
    const priceChange = useMemo(() => {
        const valid = close.filter(v => v != null && v > 0);
        if (valid.length < 2) return { value: 0, percent: 0 };
        const first = valid[0];
        const last = valid[valid.length - 1];
        if (!first) return { value: 0, percent: 0 };
        const change = last - first;
        const percent = (change / first) * 100;
        return { value: change, percent };
    }, [close]);

    const isPositive = priceChange.value >= 0;

    // Zoomed data slice for the Area view
    const displayData = useMemo(() =>
        visibleCount ? data.slice(-visibleCount) : data,
        [data, visibleCount]
    );

    // Derived series for the alternate views
    const haData = useMemo(() => toHeikinAshi(data), [data]);
    const renko = useMemo(() => buildRenko(data), [data]);

    // Pattern annotations — draw each detected pattern's own geometry (sloped
    // trendlines, pivot labels, curve, horizontal levels), confined to the pattern
    // region. Sourced from the top chart pattern's `annotations` payload.
    const patternAnn = useMemo(() => {
        // Use the most recent qualifying pattern; skip stale formations (e.g. 115 bars ago).
        const cp = (patternOverlays?.chart_pattern_details || [])
            .find(p => (p?.bars_ago ?? 0) <= MAX_PATTERN_AGE_DAYS) || null;
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

    // Auto-frame the pattern: when a chart pattern is present, the candle view opens
    // zoomed to the pattern's window (+~35% context) instead of the default 3M, so the
    // shape fills the frame and reads cleanly (like the verifier). The 1M/3M/6M/1Y
    // buttons still let the user override.
    const autoFrameRange = useMemo(() => {
        if (!patternAnn.has || !patternAnn.windowStartDate || !data.length) return null;
        const startPrefix = String(patternAnn.windowStartDate).slice(0, 10);
        const startIdx = data.findIndex(d => String(d.date).slice(0, 10) >= startPrefix);
        if (startIdx < 0) return null;
        const span = data.length - startIdx;
        return Math.min(data.length, Math.max(40, Math.round(span * 1.35)));
    }, [patternAnn, data]);
    const candleRange = userRange ?? ((chartType === 'candle' && autoFrameRange) || 66);

    // Data slice for the active scroll view (candle / heikin bars, or renko bricks
    // whose completion date falls inside the selected range)
    const scrollData = useMemo(() => {
        if (chartType === 'renko') {
            const cutoffIdx = Math.max(data.length - candleRange, 0);
            if (cutoffIdx === 0) return renko.bricks;
            const cutoff = new Date(data[cutoffIdx]?.date).getTime();
            if (isNaN(cutoff)) return renko.bricks;
            return renko.bricks.filter(b => new Date(b.date).getTime() >= cutoff);
        }
        const series = chartType === 'heikin' ? haData : data;
        return series.slice(-candleRange);
    }, [chartType, data, haData, renko, candleRange]);

    const scrollDomain = useMemo(() => {
        const vals = chartType === 'renko'
            ? scrollData.flatMap(b => [b.open, b.close])
            : scrollData.flatMap(d => [d.high, d.low].filter(v => v != null));
        if (!vals.length) return ['auto', 'auto'];
        const yMin = Math.min(...vals);
        const yMax = Math.max(...vals);
        const pad = (yMax - yMin) * 0.05 || yMax * 0.01;
        return [yMin - pad, yMax + pad];
    }, [scrollData, chartType]);

    // Auto-scroll to latest (right end) whenever a scroll view activates or range changes
    useEffect(() => {
        if (!isScrollView) return;
        const t = setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
            }
        }, 80);
        return () => clearTimeout(t);
    }, [chartType, candleRange, barPx, chartData, isScrollView]);

    // Ctrl+wheel zoom on the scroll container
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !isScrollView) return;
        const onWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setBarPx(p => e.deltaY < 0
                    ? Math.min(p + 2, MAX_BAR_PX)
                    : Math.max(p - 2, MIN_BAR_PX));
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [chartType, isScrollView]);

    // All hooks have run — safe to bail out for missing/error data
    if (!chartData) return null;
    if (chartData.error) {
        return (
            <div className="w-full my-4 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
                Chart unavailable: {typeof chartData.error === 'string' ? chartData.error : 'Could not load chart data'}
            </div>
        );
    }

    const zoomIn = () => {
        if (isScrollView) {
            setBarPx(p => Math.min(p + 3, MAX_BAR_PX));
        } else {
            setVisibleCount(c => Math.max(Math.floor((c ?? data.length) * 0.6), 20));
        }
    };
    const zoomOut = () => {
        if (isScrollView) {
            setBarPx(p => Math.max(p - 3, MIN_BAR_PX));
        } else {
            setVisibleCount(c => {
                const next = Math.min(Math.ceil((c ?? data.length) * 1.7), data.length);
                return next >= data.length ? null : next;
            });
        }
    };

    // Format date based on timeframe
    const formatDate = (date) => {
        if (!date) return '';

        const dateObj = new Date(date);

        if (timeframe === 'intraday') {
            // Backend now sends IST timestamps — display in 12-hour IST format
            const timeStr = dateObj.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }).toUpperCase(); // "9:15 AM"
            const isMultiDay = data.length > 0 &&
                data[0].date.slice(0, 10) !== data[data.length - 1].date.slice(0, 10);
            if (isMultiDay) {
                const dayStr = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                return `${dayStr} ${timeStr}`;
            }
            return timeStr;
        } else if (timeframe === 'daily') {
            // Show date for daily
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        } else if (timeframe === 'weekly') {
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: '2-digit'
            });
        } else {
            // Monthly
            return dateObj.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
            });
        }
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0].payload;
        const isUpBrick = data.dir === 1;

        return (
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    {formatDate(data.date)}{timeframe === 'intraday' ? ' IST' : ''}
                    {chartType === 'heikin' && (
                        <span className="block text-[10px] mt-0.5 text-zinc-400 dark:text-zinc-500">Heikin-Ashi (smoothed)</span>
                    )}
                </p>
                {chartType === 'renko' ? (
                    <div className="space-y-1 text-sm">
                        <div className={clsx(
                            "flex items-center gap-1.5 font-semibold",
                            isUpBrick ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                            {isUpBrick
                                ? <TrendingUp className="w-3.5 h-3.5" />
                                : <TrendingDown className="w-3.5 h-3.5" />}
                            {isUpBrick ? 'Up brick' : 'Down brick'}
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Open:</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                ₹{data.open?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Close:</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                ₹{data.close?.toFixed(2)}
                            </span>
                        </div>
                    </div>
                ) : (chartType === 'candle' || chartType === 'heikin') ? (
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Open:</span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                ₹{data.open?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">High:</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                ₹{data.high?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Low:</span>
                            <span className="font-medium text-rose-600 dark:text-rose-400">
                                ₹{data.low?.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Close:</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                ₹{data.close?.toFixed(2)}
                            </span>
                        </div>
                        {data.volume && (
                            <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-zinc-200 dark:border-zinc-700">
                                <span className="text-zinc-600 dark:text-zinc-400">Volume:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {(data.volume / 1000).toFixed(1)}K
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">Price:</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                ₹{data.price?.toFixed(2)}
                            </span>
                        </div>
                        {data.volume && (
                            <div className="flex justify-between gap-4">
                                <span className="text-zinc-600 dark:text-zinc-400">Volume:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {(data.volume / 1000).toFixed(1)}K
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render the annotation overlay as a Recharts <Customized> layer for a given
    // data array. Only drawn on real-price, real-time views (area, candle) —
    // Heikin-Ashi prices are synthetic and Renko's x-axis isn't time-linear.
    const renderPatternLayer = (layerData) => (
        patternAnn.has ? (
            <Customized component={(props) => (
                <PatternAnnotationLayer
                    {...props}
                    trendlines={patternAnn.trendlines}
                    hlines={patternAnn.hlines}
                    markers={patternAnn.markers}
                    curve={patternAnn.curve}
                    skeleton={patternAnn.skeleton}
                    projection={patternAnn.projection}
                    neckline={patternAnn.neckline}
                    band={patternAnn.band}
                    midline={patternAnn.midline}
                    windowStartDate={patternAnn.windowStartDate}
                    data={layerData}
                />
            )} />
        ) : null
    );

    // Render different chart types
    const renderChart = () => {
        if (chartType === 'area') {
            return (
                <AreaChart data={displayData} margin={{ top: 16, right: 24, left: 16, bottom: 24 }}>
                    <defs>
                        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.5} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#9ca3af"
                        className="text-xs"
                        tick={{ fill: '#6b7280' }}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        stroke="#9ca3af"
                        className="text-xs"
                        tick={{ fill: '#6b7280' }}
                        tickFormatter={(value) => `₹${value.toFixed(0)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        fill="url(#colorArea)"
                        animationDuration={1000}
                    />
                    {renderPatternLayer(displayData)}
                </AreaChart>
            );
        }

        // Scroll views — Y-axis is rendered in a separate sticky panel outside the scroll container
        const scrollMargin = { top: 16, right: 4, left: 0, bottom: 16 };

        if (chartType === 'renko') {
            return (
                <ComposedChart data={scrollData} margin={scrollMargin}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.4} vertical={false} />
                    <XAxis
                        dataKey="idx"
                        tickFormatter={(idx) => {
                            const brick = scrollData.find(b => b.idx === idx);
                            return brick ? formatDate(brick.date) : '';
                        }}
                        stroke="#4b5563"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#374151' }}
                        minTickGap={48}
                    />
                    {/* No YAxis here — it lives in the sticky panel */}
                    <YAxis domain={scrollDomain} hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                    <Customized component={(props) => <RenkoLayer {...props} data={scrollData} />} />
                </ComposedChart>
            );
        }

        // Candle & Heikin-Ashi share the candlestick renderer
        return (
            <ComposedChart data={scrollData} margin={scrollMargin}>
                <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.4} vertical={false} />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#4b5563"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#374151' }}
                />
                {/* No YAxis here — it lives in the sticky panel */}
                <YAxis domain={scrollDomain} hide />
                <Tooltip content={<CustomTooltip />} />
                <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                <Customized component={(props) => <CandleLayer {...props} data={scrollData} />} />
                {chartType === 'candle' && renderPatternLayer(scrollData)}
            </ComposedChart>
        );
    };

    // Chart type chips — quick variant leads with Area (the "instant read" default)
    const TYPE_DEFS = {
        candle: { label: 'Candles',     aria: 'Candlestick chart', Icon: ChartCandlestick },
        area:   { label: 'Area',        aria: 'Area chart',        Icon: Activity },
        heikin: { label: 'Heikin-Ashi', aria: 'Heikin-Ashi chart', Icon: Waves },
        renko:  { label: 'Renko',       aria: 'Renko chart',       Icon: BrickWall },
    };
    const typeOrder = isQuick ? ['area', 'candle', 'heikin', 'renko'] : ['candle', 'area', 'heikin', 'renko'];

    return (
        <div className={clsx(
            isQuick
                ? "w-full"
                : "w-full my-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 p-4",
            className
        )}>
            {/* Header — hidden in quick variant (the company card above already names the stock) */}
            {!isQuick && (
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {atAGlance?.logo_url ? (
                        <img
                            src={atAGlance.logo_url}
                            alt={symbol}
                            className="w-8 h-8 rounded-lg object-contain bg-white border border-zinc-200/60 dark:border-zinc-700/40 flex-shrink-0"
                            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                    ) : null}
                    <div className={clsx(
                        "p-1.5 rounded-lg",
                        atAGlance?.logo_url ? "hidden" : "",
                        isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"
                    )}>
                        {isPositive
                            ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            : <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        }
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                            {symbol || chart_metadata.symbol || 'Chart'}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {timeframe} chart • {chart_metadata.data_points || data.length} points
                        </p>
                    </div>
                </div>
            </div>
            )}

            {/* Chart type selector */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className={clsx(
                    "flex flex-wrap items-center gap-1",
                    isQuick && "p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-black/30"
                )}>
                    {typeOrder.map((key) => {
                        const { label, aria, Icon } = TYPE_DEFS[key];
                        const active = chartType === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setChartType(key)}
                                aria-label={aria}
                                aria-pressed={active}
                                className={clsx(
                                    "flex items-center gap-1.5 rounded-lg font-medium transition-all",
                                    isQuick ? "px-3 py-1 text-[12px]" : "px-3 py-1.5 text-sm gap-2",
                                    active
                                        ? "bg-[#FDD405] text-black font-semibold"
                                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                                )}
                            >
                                <Icon className={isQuick ? "w-3.5 h-3.5" : "w-4 h-4"} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-1 ml-auto">
                    {/* Brick size badge — renko only */}
                    {chartType === 'renko' && renko.brickSize > 0 && (
                        <span
                            title="Renko brick size (ATR-14 based)"
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60"
                        >
                            Brick ₹{Number(renko.brickSize.toFixed(2)).toLocaleString('en-IN')}
                        </span>
                    )}
                    {/* Range selector — scroll views only */}
                    {isScrollView && CANDLE_RANGES.map(({ label, bars }) => (
                        <button
                            key={label}
                            onClick={() => setUserRange(bars)}
                            className={clsx(
                                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                                candleRange === bars
                                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black"
                                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                    {/* Zoom controls — all chart types */}
                    <div className="flex items-center gap-0.5 ml-1 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                        <button
                            onClick={zoomIn}
                            title="Zoom in"
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                        <button
                            onClick={zoomOut}
                            title="Zoom out"
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart + Today's Market Stats side panel — stacks on mobile, side-by-side ≥ sm */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className={clsx("h-[260px] sm:h-[340px] overflow-hidden", atAGlance ? "flex-1" : "w-full")}>
                    {isScrollView ? (
                        scrollData.length ? (
                            /* Scroll view: scrollable bars/bricks + sticky Y-axis panel */
                            <div className="flex h-full">
                                {/* Scrollable marks + X-axis */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
                                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
                                >
                                    <div style={chartType === 'renko' ? {
                                        // Renko packs bricks at a fixed pitch and anchors the
                                        // latest brick to the right edge instead of stretching
                                        width: `${Math.max(scrollData.length * barPx * 3, 160)}px`,
                                        marginLeft: 'auto',
                                        height: '100%',
                                    } : {
                                        // Pattern view: fit the WHOLE pattern into the visible window
                                        // (no horizontal scroll). Elsewhere keep the fixed-bar-width
                                        // scrollable strip. Candles auto-size to bandwidth either way.
                                        width: (isQuick && patternAnn.has && chartType === 'candle')
                                            ? '100%'
                                            : `${Math.max(scrollData.length * barPx, 300)}px`,
                                        minWidth: '100%',
                                        height: '100%',
                                    }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            {renderChart()}
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Sticky Y-axis panel — never scrolls */}
                                <div className="flex-shrink-0 bg-white dark:bg-zinc-900/60" style={{ width: 62 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={scrollData} margin={{ top: 16, right: 0, left: 0, bottom: 16 }}>
                                            <YAxis
                                                domain={scrollDomain}
                                                orientation="right"
                                                width={62}
                                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                                tickFormatter={(v) => `₹${v.toFixed(0)}`}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            /* Renko can legitimately produce zero bricks in a quiet range */
                            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                Price hasn't moved a full brick (₹{Number((renko.brickSize || 0).toFixed(2)).toLocaleString('en-IN')}) in this range — try a longer range.
                            </div>
                        )
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    )}
                </div>

                {atAGlance && (
                    <div className="w-full sm:w-40 xl:w-44 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700/40 self-start">
                        <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Today's Market Stats</p>
                        {[
                            atAGlance.open != null ? { label: 'Open', value: `₹${Number(atAGlance.open).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.high != null ? { label: 'High', value: `₹${Number(atAGlance.high).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.low != null ? { label: 'Low', value: `₹${Number(atAGlance.low).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            (atAGlance.high != null && atAGlance.low != null) ? { label: 'Range', value: `₹${Number(atAGlance.low).toLocaleString('en-IN', { maximumFractionDigits: 0 })} – ₹${Number(atAGlance.high).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } : null,
                            atAGlance.volume > 0 ? { label: 'Vol', value: fmtVolLocal(atAGlance.volume) } : null,
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


            {/* Footer info — hidden in quick variant to keep the card minimal */}
            {!isQuick && chart_metadata.start_date && chart_metadata.end_date && (
                <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{chart_metadata.start_date} to {chart_metadata.end_date}</span>
                </div>
            )}
        </div>
    );
};

export default StockChart;
