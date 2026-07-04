import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    ComposedChart,
    Customized,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
    ReferenceDot,
    ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, BarChart3, BarChart2, LineChart as LineChartIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';
import PatternAnnotationLayer from './PatternAnnotationLayer';

/**
 * StockChart Component - Beautiful multi-timeframe stock charts
 * 
 * Features:
 * - Multiple chart types (Line, Area, Candlestick)
 * - Timeframe selector
 * - OHLCV data support
 * - Dark mode
 * - Responsive
 * - Smooth animations
 */
// Find closest matching date in the chart data array.
// Falls back to nearest date so pattern markers always render even when
// the exact pivot date falls outside the visible chart window.
const findDate = (targetDate, dates) => {
    if (!targetDate || !dates || !dates.length) return null;
    const prefix = String(targetDate).slice(0, 10);
    const exact = dates.find(d => d && String(d).slice(0, 10) === prefix);
    if (exact) return exact;
    const target = new Date(prefix).getTime();
    if (isNaN(target)) return null;
    return dates.reduce((best, d) => {
        if (!d) return best;
        const dt = new Date(String(d).slice(0, 10)).getTime();
        if (isNaN(dt)) return best;
        if (!best) return d;
        return Math.abs(dt - target) < Math.abs(new Date(String(best).slice(0, 10)).getTime() - target) ? d : best;
    }, null);
};

const fmtVolLocal = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

// Real candlestick layer rendered via Recharts Customized
const CandleLayer = ({ xAxisMap, yAxisMap, data }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;
    const bandwidth = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 8;
    const halfW = Math.max(bandwidth * 0.44, 3);
    return (
        <g>
            {data.map((point, i) => {
                if (point.open == null || point.close == null || point.high == null || point.low == null) return null;
                const isBull = point.close >= point.open;
                const bullColor = '#26a69a';
                const bearColor = '#ef5350';
                const color = isBull ? bullColor : bearColor;
                const xPos = xAxis.scale(point.date);
                if (xPos == null || isNaN(xPos)) return null;
                const cx = xPos + bandwidth / 2;
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

const CANDLE_RANGES = [
    { label: '1M', bars: 22 },
    { label: '3M', bars: 66 },
    { label: '6M', bars: 132 },
    { label: '1Y', bars: 252 },
];

const MIN_BAR_PX = 6;
const MAX_BAR_PX = 24;
const DEFAULT_BAR_PX = 11;

const StockChart = ({ chartData, symbol, className, patternOverlays = null, atAGlance = null }) => {
    const [chartType, setChartType] = useState('area');
    const [candleRange, setCandleRange] = useState(66); // default 3M
    const [barPx, setBarPx] = useState(DEFAULT_BAR_PX);
    const [visibleCount, setVisibleCount] = useState(null); // null = show all data
    const candleScrollRef = useRef(null);

    // Auto-scroll to latest (right end) whenever candle view activates or range changes
    useEffect(() => {
        if (chartType !== 'candle') return;
        const t = setTimeout(() => {
            if (candleScrollRef.current) {
                candleScrollRef.current.scrollLeft = candleScrollRef.current.scrollWidth;
            }
        }, 80);
        return () => clearTimeout(t);
    }, [chartType, candleRange, barPx, chartData]);

    // Ctrl+wheel zoom on candle scroll container
    useEffect(() => {
        const el = candleScrollRef.current;
        if (!el || chartType !== 'candle') return;
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
    }, [chartType]);

    if (!chartData) return null;
    if (chartData.error) {
        return (
            <div className="w-full my-4 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
                Chart unavailable: {typeof chartData.error === 'string' ? chartData.error : 'Could not load chart data'}
            </div>
        );
    }

    // Parse chart data
    const {
        dates = [],
        open = [],
        high = [],
        low = [],
        close = [],
        volume = [],
        timeframe = 'daily',
        resolution = 'D',
        chart_metadata = {}
    } = chartData;

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

    // Zoomed data slice for Area / Line / OHFL views
    const displayData = useMemo(() =>
        visibleCount ? data.slice(-visibleCount) : data,
        [data, visibleCount]
    );

    const zoomIn = () => {
        if (chartType === 'candle') {
            setBarPx(p => Math.min(p + 3, MAX_BAR_PX));
        } else {
            setVisibleCount(c => Math.max(Math.floor((c ?? data.length) * 0.6), 20));
        }
    };
    const zoomOut = () => {
        if (chartType === 'candle') {
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

        return (
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    {formatDate(data.date)}{timeframe === 'intraday' ? ' IST' : ''}
                </p>
                {chartType === 'candle' ? (
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

    // Candle data sliced to selected range (hoisted so the sticky Y-axis panel can reuse it)
    const candleData = useMemo(() => data.slice(-candleRange), [data, candleRange]);
    const candleDomain = useMemo(() => {
        const allHL = candleData.flatMap(d => [d.high, d.low].filter(v => v != null));
        if (!allHL.length) return ['auto', 'auto'];
        const yMin = Math.min(...allHL);
        const yMax = Math.max(...allHL);
        const pad = (yMax - yMin) * 0.05;
        return [yMin - pad, yMax + pad];
    }, [candleData]);

    // Pattern annotations — draw each detected pattern's own geometry (sloped
    // trendlines, pivot labels, curve, horizontal levels), confined to the pattern
    // region. Sourced from the top chart pattern's `annotations` payload.
    const patternAnn = useMemo(() => {
        const cp = patternOverlays?.chart_pattern_details?.[0];
        const a = cp?.annotations || {};
        const trendlines = a.trendlines || [];
        const hlines = a.hlines || [];
        const markers = a.markers || [];
        const curve = a.curve || [];
        const skeleton = a.skeleton || [];
        const neckline = a.neckline || null;
        const band = a.band || null;
        const midline = a.midline || [];
        return {
            trendlines, hlines, markers, curve, skeleton, neckline, band, midline,
            windowStartDate: a.window_start_date || null,
            has: !!(trendlines.length || hlines.length || markers.length || curve.length || skeleton.length || band),
        };
    }, [patternOverlays]);

    // Render the annotation overlay as a Recharts <Customized> layer for a given
    // data array (each chart type plots a different slice).
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
        const commonProps = {
            data: chartType === 'candle' ? data : displayData,
            margin: { top: 16, right: 24, left: 16, bottom: 24 },
        };

        if (chartType === 'line') {
            return (
                <LineChart {...commonProps}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
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
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1000}
                    />
                    {renderPatternLayer(displayData)}
                </LineChart>
            );
        } else if (chartType === 'area') {
            return (
                <AreaChart {...commonProps}>
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
        } else if (chartType === 'ohlc') {
            return (
                <BarChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.5} />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                    <YAxis domain={['auto', 'auto']} stroke="#9ca3af" tick={{ fill: '#6b7280' }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="high" fill="#10b981" opacity={0.5} animationDuration={800} />
                    <Bar dataKey="low" fill="#ef4444" opacity={0.5} animationDuration={800} />
                    {renderPatternLayer(displayData)}
                </BarChart>
            );
        } else {
            // Candle chart — Y-axis is rendered in a separate sticky panel outside the scroll container
            const candleMargin = { top: 16, right: 4, left: 0, bottom: 16 };
            return (
                <ComposedChart data={candleData} margin={candleMargin}>
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
                    <YAxis domain={candleDomain} hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                    <Customized component={(props) => <CandleLayer {...props} data={candleData} />} />
                    {renderPatternLayer(candleData)}
                </ComposedChart>
            );
        }
    };

    return (
        <div className={clsx("w-full my-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 p-4", className)}>
            {/* Header */}
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

            {/* Chart type selector */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setChartType('area')}
                    aria-label="Area chart"
                    aria-pressed={chartType === 'area'}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        chartType === 'area'
                            ? "bg-[#FDD405] text-black font-semibold"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                >
                    <Activity className="w-4 h-4" />
                    Area
                </button>
                <button
                    onClick={() => setChartType('line')}
                    aria-label="Line chart"
                    aria-pressed={chartType === 'line'}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        chartType === 'line'
                            ? "bg-[#FDD405] text-black font-semibold"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                >
                    <LineChartIcon className="w-4 h-4" />
                    Line
                </button>
                <button
                    onClick={() => setChartType('ohlc')}
                    aria-label="OHLC bar chart"
                    aria-pressed={chartType === 'ohlc'}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        chartType === 'ohlc'
                            ? "bg-[#FDD405] text-black font-semibold"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    OHFL
                </button>
                <button
                    onClick={() => setChartType('candle')}
                    aria-label="Candlestick chart"
                    aria-pressed={chartType === 'candle'}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        chartType === 'candle'
                            ? "bg-[#FDD405] text-black font-semibold"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    )}
                >
                    <BarChart2 className="w-4 h-4" />
                    Candles
                </button>

                <div className="flex items-center gap-1 ml-auto">
                    {/* Range selector — candle only */}
                    {chartType === 'candle' && CANDLE_RANGES.map(({ label, bars }) => (
                        <button
                            key={label}
                            onClick={() => setCandleRange(bars)}
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

            {/* Chart + Today's Market Stats side panel */}
            <div className="flex gap-4">
                <div className={clsx("h-[260px] sm:h-[340px] overflow-hidden", atAGlance ? "flex-1" : "w-full")}>
                    {chartType === 'candle' ? (
                        /* Candle view: scrollable bars + sticky Y-axis panel */
                        <div className="flex h-full">
                            {/* Scrollable candles + X-axis */}
                            <div
                                ref={candleScrollRef}
                                className="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
                            >
                                <div style={{
                                    width: `${Math.max(candleData.length * barPx, 300)}px`,
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
                                    <ComposedChart data={candleData} margin={{ top: 16, right: 0, left: 0, bottom: 16 }}>
                                        <YAxis
                                            domain={candleDomain}
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
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    )}
                </div>

                {atAGlance && (
                    <div className="w-40 xl:w-44 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700/40 self-start">
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


            {/* Footer info */}
            {chart_metadata.start_date && chart_metadata.end_date && (
                <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{chart_metadata.start_date} to {chart_metadata.end_date}</span>
                </div>
            )}
        </div>
    );
};

export default StockChart;
