import React, { useState, useMemo } from 'react';
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
import { TrendingUp, TrendingDown, Activity, Calendar, BarChart3, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { clsx } from 'clsx';

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
    const xAxis = xAxisMap?.[0];
    const yAxis = yAxisMap?.[0];
    if (!xAxis || !yAxis || !data?.length) return null;
    const bandwidth = xAxis.bandwidth ? xAxis.bandwidth() : 8;
    const halfW = Math.max(bandwidth * 0.38, 2);
    return (
        <g>
            {data.map((point, i) => {
                if (point.open == null || point.close == null || point.high == null || point.low == null) return null;
                const isBull = point.close >= point.open;
                const color = isBull ? '#10b981' : '#ef4444';
                const cx = (xAxis.scale(point.date) ?? 0) + bandwidth / 2;
                const yH = yAxis.scale(point.high);
                const yL = yAxis.scale(point.low);
                const bodyTop = yAxis.scale(Math.max(point.open, point.close));
                const bodyBot = yAxis.scale(Math.min(point.open, point.close));
                const bodyH = Math.max(Math.abs(bodyBot - bodyTop), 1);
                return (
                    <g key={i}>
                        <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth={1} />
                        <rect x={cx - halfW} y={bodyTop} width={halfW * 2} height={bodyH}
                              fill={isBull ? color + '44' : color} stroke={color} strokeWidth={1} />
                    </g>
                );
            })}
        </g>
    );
};

const StockChart = ({ chartData, symbol, className, patternOverlays = null, atAGlance = null }) => {
    const [chartType, setChartType] = useState('area'); // 'line', 'area', 'ohlc', 'candle'

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

    // Prepare data for Recharts
    const data = useMemo(() => {
        return dates.map((date, index) => ({
            date,
            open: open[index],
            high: high[index],
            low: low[index],
            close: close[index],
            volume: volume[index],
            // For simple charts
            price: close[index],
        }));
    }, [dates, open, high, low, close, volume]);

    // Calculate price change
    const priceChange = useMemo(() => {
        if (close.length < 2) return { value: 0, percent: 0 };
        const first = close[0];
        const last = close[close.length - 1];
        const change = last - first;
        const percent = (change / first) * 100;
        return { value: change, percent };
    }, [close]);

    const isPositive = priceChange.value >= 0;

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

    // Build pattern overlay elements for injection into any chart type
    const patternElements = useMemo(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[StockChart] patternOverlays:', patternOverlays);
        }
        if (!patternOverlays) return { lines: [], dots: [], areas: [], hasPatterns: false };

        const lines = [];
        const dots = [];
        const areas = [];

        // Support / resistance lines from overlay_lines
        (patternOverlays.overlay_lines || []).forEach((line, i) => {
            lines.push(
                <ReferenceLine
                    key={`ol-${i}`}
                    y={line.price}
                    stroke={line.color}
                    strokeDasharray={line.dash || '3 3'}
                    strokeWidth={1.5}
                    label={{ value: line.label, position: 'insideTopRight', fill: line.color, fontSize: 10 }}
                />
            );
        });

        // Per-pattern drawings
        (patternOverlays.chart_patterns_drawing || []).forEach((p, pi) => {
            const d = p.drawing;
            if (!d) return;

            // Shaded region
            if (d.region?.start_date && d.region?.end_date) {
                const x1 = findDate(d.region.start_date, dates);
                const x2 = findDate(d.region.end_date, dates);
                if (x1 && x2) {
                    areas.push(
                        <ReferenceArea
                            key={`area-${pi}`}
                            x1={x1} x2={x2}
                            fill={d.region.color}
                            fillOpacity={1}
                        />
                    );
                }
            }

            // Horizontal lines (neckline, target, resistance)
            (d.h_lines || []).forEach((line, li) => {
                lines.push(
                    <ReferenceLine
                        key={`hl-${pi}-${li}`}
                        y={line.price}
                        stroke={line.color}
                        strokeDasharray={line.dash || '5 3'}
                        strokeWidth={1.5}
                        label={{ value: line.label, position: 'insideTopRight', fill: line.color, fontSize: 10 }}
                    />
                );
            });

            // Key point dots (head, shoulders, peaks, troughs)
            (d.key_points || []).forEach((pt, ki) => {
                const x = findDate(pt.date, dates);
                if (!x) return;
                dots.push(
                    <ReferenceDot
                        key={`dot-${pi}-${ki}`}
                        x={x} y={pt.price}
                        r={5}
                        fill={pt.color}
                        stroke="#fff"
                        strokeWidth={1.5}
                        label={{ value: pt.label, position: 'top', fill: pt.color, fontSize: 10, fontWeight: 600 }}
                    />
                );
            });
        });

        return { lines, dots, areas, hasPatterns: lines.length > 0 || dots.length > 0 || areas.length > 0 };
    }, [patternOverlays, dates]);

    // Render different chart types
    const renderChart = () => {
        const commonProps = {
            data,
            margin: { top: 10, right: 30, left: 0, bottom: 0 },
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
                    {patternElements.areas}
                    {patternElements.lines}
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1000}
                    />
                    {patternElements.dots}
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
                    {patternElements.areas}
                    {patternElements.lines}
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        fill="url(#colorArea)"
                        animationDuration={1000}
                    />
                    {patternElements.dots}
                </AreaChart>
            );
        } else if (chartType === 'ohlc') {
            return (
                <BarChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-700" opacity={0.5} />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                    <YAxis domain={['auto', 'auto']} stroke="#9ca3af" tick={{ fill: '#6b7280' }} tickFormatter={(v) => `₹${v.toFixed(0)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    {patternElements.areas}
                    {patternElements.lines}
                    <Bar dataKey="high" fill="#10b981" opacity={0.5} animationDuration={800} />
                    <Bar dataKey="low" fill="#ef4444" opacity={0.5} animationDuration={800} />
                    {patternElements.dots}
                </BarChart>
            );
        } else {
            // Real candlestick chart using Customized layer
            return (
                <ComposedChart {...commonProps}>
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
                    {patternElements.areas}
                    {patternElements.lines}
                    <Customized component={(props) => <CandleLayer {...props} data={data} />} />
                    {patternElements.dots}
                </ComposedChart>
            );
        }
    };

    return (
        <div className={clsx("w-full my-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900/60 p-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        "p-1.5 rounded-lg",
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
                <span className={clsx(
                    "px-2.5 py-1 rounded-lg text-sm font-semibold",
                    isPositive
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                )}>
                    {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
                </span>
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
            </div>

            {/* Chart + Today's Market Stats side panel */}
            <div className="flex gap-4">
                <div className={clsx("h-[260px] sm:h-[340px]", atAGlance ? "flex-1" : "w-full")}>
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
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

            {/* Pattern badges */}
            {patternElements.hasPatterns && patternOverlays?.chart_patterns_drawing?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {patternOverlays.chart_patterns_drawing.map((p, i) => (
                        <span
                            key={i}
                            className={clsx(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                                p.direction === 'bullish'
                                    ? "bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-rose-50 dark:bg-rose-900/25 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            )}
                        >
                            <span className={p.direction === 'bullish' ? 'text-emerald-500' : 'text-rose-500'}>
                                {p.direction === 'bullish' ? '▲' : '▼'}
                            </span>
                            {p.name}
                            {p.target_projection && (
                                <span className="opacity-70">→ ₹{p.target_projection.toLocaleString('en-IN')}</span>
                            )}
                        </span>
                    ))}
                </div>
            )}

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
