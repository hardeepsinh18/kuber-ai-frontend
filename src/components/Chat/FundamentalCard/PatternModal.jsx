import { useMemo } from 'react';
import {
    Line,
    XAxis, YAxis, CartesianGrid, ReferenceLine,
    ComposedChart, Customized, ResponsiveContainer, Tooltip,
} from 'recharts';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PatternAnnotationLayer from '../PatternAnnotationLayer';
import { MiniCandleLayer, PatternCircleLayer } from './CandlestickLayers';
import { OHLCTooltip } from './OHLCTooltip';

/* ─── Interactive pattern modal ──────────────────────────────────────────── */
export const PatternModal = ({ pattern, ohlcBars, chartData, chartSlice, support, resistance, onClose }) => {
    const rawChart = useMemo(() => {
        if (!chartData) return null;
        if (Array.isArray(chartData)) return chartData.find(cd => cd && !cd.error) ?? null;
        return chartData.error ? null : chartData;
    }, [chartData]);

    const slicedData = useMemo(() => {
        // Chart pattern mode: use chart_slice directly
        if (!rawChart && chartSlice?.length) {
            return chartSlice.map(d => ({
                date:  d.date  ?? d.Date,
                open:  d.Open  ?? d.open,
                high:  d.High  ?? d.high,
                low:   d.Low   ?? d.low,
                close: d.Close ?? d.close,
            })).filter(d => d.close != null);
        }
        if (!rawChart) return [];
        const { dates = [], open = [], high = [], low = [], close = [] } = rawChart;
        const all = dates.map((date, i) => ({
            date, open: open[i], high: high[i], low: low[i], close: close[i],
        })).filter(d => d.close != null);
        const n = all.length;
        const barsAgo = pattern?.bars_ago ?? 0;
        const patIdx = Math.max(0, n - 1 - barsAgo);
        return all.slice(Math.max(0, patIdx - 25), Math.min(n, patIdx + 10));
    }, [rawChart, chartSlice, pattern]);

    const patternBarDates = useMemo(() => new Set((ohlcBars || []).map(b => b.date)), [ohlcBars]);

    const allHL = slicedData.flatMap(d => [d.high, d.low, support, resistance].filter(v => v != null));
    const yMin = allHL.length ? Math.min(...allHL) : 0;
    const yMax = allHL.length ? Math.max(...allHL) : 1;
    const pad  = (yMax - yMin) * 0.10 || 1;

    const dirColor = pattern?.direction === 'bullish' ? '#22c55e'
                   : pattern?.direction === 'bearish' ? '#ef4444' : '#FDD405';
    const DirIcon  = pattern?.direction === 'bullish' ? TrendingUp
                   : pattern?.direction === 'bearish' ? TrendingDown : Minus;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                 onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
                    <div className="flex items-center gap-2">
                        <DirIcon size={18} color={dirColor} />
                        <span className="text-white font-semibold">{pattern?.name || 'Pattern'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border"
                              style={{ color: dirColor, borderColor: dirColor, backgroundColor: `${dirColor}18` }}>
                            {pattern?.direction} · {pattern?.strength}
                        </span>
                        {(pattern?.bars_ago ?? 0) === 0
                            ? <span className="text-xs text-zinc-400">Today</span>
                            : <span className="text-xs text-zinc-400">{pattern?.bars_ago}d ago</span>}
                    </div>
                    <button onClick={onClose}
                            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-700">
                        <X size={18} />
                    </button>
                </div>

                {/* Chart */}
                <div className="px-5 pt-4">
                    <div style={{ height: 220, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={slicedData} margin={{ top: 8, right: 40, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.3} vertical={false} />
                                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }}
                                       tickLine={false} axisLine={false}
                                       tickFormatter={d => d?.slice(5)} />
                                <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fill: '#6b7280', fontSize: 9 }}
                                       tickLine={false} axisLine={false} orientation="right"
                                       tickFormatter={v => `₹${Math.round(v)}`} width={60} />
                                <Tooltip content={<OHLCTooltip />} />
                                {support != null && (
                                    <ReferenceLine y={support} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
                                )}
                                {resistance != null && (
                                    <ReferenceLine y={resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                                )}
                                <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                                <Customized component={(props) => <MiniCandleLayer {...props} data={slicedData} />} />
                                <Customized component={(props) => <PatternCircleLayer {...props} data={slicedData} patternDates={patternBarDates} />} />
                                <Customized component={(props) => (
                                    <PatternAnnotationLayer
                                        {...props}
                                        trendlines={pattern?.annotations?.trendlines || []}
                                        hlines={pattern?.annotations?.hlines || []}
                                        markers={pattern?.annotations?.markers || []}
                                        curve={pattern?.annotations?.curve || []}
                                        skeleton={pattern?.annotations?.skeleton || []}
                                        projection={pattern?.annotations?.projection || []}
                                        neckline={pattern?.annotations?.neckline || null}
                                        band={pattern?.annotations?.band || null}
                                        midline={pattern?.annotations?.midline || []}
                                        windowStartDate={pattern?.annotations?.window_start_date || null}
                                        data={slicedData}
                                    />
                                )} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* OHLC Table for pattern bars */}
                {ohlcBars && ohlcBars.length > 0 && (
                    <div className="px-5 py-4">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                            Pattern Candle{ohlcBars.length > 1 ? 's' : ''}, OHLC
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-zinc-700">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-zinc-800 text-zinc-400">
                                        <th className="px-3 py-2 text-left font-medium">Date</th>
                                        <th className="px-3 py-2 text-right font-medium">Open</th>
                                        <th className="px-3 py-2 text-right font-medium text-emerald-400">High</th>
                                        <th className="px-3 py-2 text-right font-medium text-rose-400">Low</th>
                                        <th className="px-3 py-2 text-right font-medium">Close</th>
                                        <th className="px-3 py-2 text-right font-medium">Chg%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ohlcBars.map((bar, i) => {
                                        const bull = bar.close >= bar.open;
                                        const chg  = bar.open ? ((bar.close - bar.open) / bar.open * 100) : 0;
                                        return (
                                            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/50'}>
                                                <td className="px-3 py-2 text-zinc-300 font-mono">{bar.date}</td>
                                                <td className="px-3 py-2 text-right text-zinc-200 font-mono">₹{Number(bar.open).toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                                <td className="px-3 py-2 text-right text-emerald-400 font-mono">₹{Number(bar.high).toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                                <td className="px-3 py-2 text-right text-rose-400 font-mono">₹{Number(bar.low).toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                                <td className={`px-3 py-2 text-right font-mono font-semibold ${bull ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    ₹{Number(bar.close).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                                </td>
                                                <td className={`px-3 py-2 text-right font-mono ${bull ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {bull ? '+' : ''}{chg.toFixed(2)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pattern description */}
                {pattern?.description && (
                    <div className="px-5 pb-4">
                        <p className="text-xs text-zinc-400 leading-relaxed">{pattern.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
