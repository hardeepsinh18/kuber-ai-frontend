import React, { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
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
import { TrendingUp, TrendingDown, Activity, Calendar, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
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

const StockChart = ({ chartData, symbol, className, patternOverlays = null }) => {
    const [chartType, setChartType] = useState('area'); // 'line', 'area', 'candle'

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
        } else {
            // Candlestick approximation with bars (simplified)
            return (
                <BarChart {...commonProps}>
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
                    <Bar 
                        dataKey="high" 
                        fill="#10b981"
                        opacity={0.6}
                        animationDuration={800}
                    />
                    <Bar 
                        dataKey="low" 
                        fill="#ef4444"
                        opacity={0.6}
                        animationDuration={800}
                    />
                </BarChart>
            );
        }
    };

    return (
        <div className={clsx("w-full my-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-4 sm:p-6", className)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "p-2 rounded-lg",
                        isPositive 
                            ? "bg-emerald-50 dark:bg-emerald-900/20" 
                            : "bg-rose-50 dark:bg-rose-900/20"
                    )}>
                        {isPositive ? (
                            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {symbol || chart_metadata.description || 'Stock Chart'}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {chart_metadata.description || `${timeframe} chart`} • {chart_metadata.data_points || data.length} points
                        </p>
                    </div>
                </div>
                
                {/* Price change indicator */}
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        "px-3 py-1.5 rounded-lg text-sm font-medium",
                        isPositive
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                    )}>
                        {isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%
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
                            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <LineChartIcon className="w-4 h-4" />
                    Line
                </button>
                <button
                    onClick={() => setChartType('candle')}
                    aria-label="OHLC candlestick chart"
                    aria-pressed={chartType === 'candle'}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        chartType === 'candle'
                            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    OHLC
                </button>
            </div>

            {/* Chart */}
            <div className="w-full h-[300px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
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
