import { useMemo } from 'react';
import {
    Line,
    XAxis, YAxis, CartesianGrid, ReferenceLine,
    ComposedChart, Customized, ResponsiveContainer,
} from 'recharts';
import { CandleChart, MiniCandleLayer, PatternCircleLayer } from './CandlestickLayers';

/* ─── Mini chart for a single pattern card ───────────────────────────────── */
export const PatternMiniChart = ({ chartData, barsAgo = 0, support, resistance, ohlcBars = null }) => {
    const rawChart = useMemo(() => {
        if (!chartData) return null;
        if (Array.isArray(chartData)) return chartData.find(cd => cd && !cd.error) ?? null;
        return chartData.error ? null : chartData;
    }, [chartData]);

    const slicedData = useMemo(() => {
        if (!rawChart) return null;
        const { dates = [], open = [], high = [], low = [], close = [] } = rawChart;
        const allData = dates.map((date, i) => ({
            date,
            open: open[i], high: high[i], low: low[i], close: close[i],
        })).filter(d => d.close != null);
        if (allData.length < 5) return null;

        const n = allData.length;
        const patternIdx = Math.max(0, n - 1 - barsAgo);
        const start = Math.max(0, patternIdx - 12);
        const end   = Math.min(n, patternIdx + 4);
        const slice = allData.slice(start, end);
        return slice.length >= 3 ? { slice, patternIdx: patternIdx - start } : null;
    }, [rawChart, barsAgo]);

    if (!slicedData) {
        return <CandleChart patternName="__unknown__" />;
    }

    const { slice, patternIdx } = slicedData;

    const allHL = slice.flatMap(d => [d.high, d.low, support, resistance].filter(v => v != null));
    const yMin  = Math.min(...allHL);
    const yMax  = Math.max(...allHL);
    const pad   = (yMax - yMin) * 0.1 || 1;
    const domain = [yMin - pad, yMax + pad];

    // Candles that form the pattern — encircle the whole group. Fall back to the
    // single formation bar when the detector didn't provide the candle list.
    const patternDates = useMemo(() => {
        if (ohlcBars && ohlcBars.length) return new Set(ohlcBars.map(b => b.date));
        const d = slice[patternIdx]?.date;
        return d ? new Set([d]) : new Set();
    }, [ohlcBars, slice, patternIdx]);

    return (
        <div style={{ width: '100%', height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={slice} margin={{ top: 6, right: 4, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.25} vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={domain} hide />
                    {/* Support line */}
                    {support != null && (
                        <ReferenceLine y={support} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.2}
                            label={{ value: `S`, position: 'insideTopRight', fill: '#10b981', fontSize: 8 }} />
                    )}
                    {/* Resistance line */}
                    {resistance != null && (
                        <ReferenceLine y={resistance} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.2}
                            label={{ value: `R`, position: 'insideTopRight', fill: '#ef4444', fontSize: 8 }} />
                    )}
                    {/* Invisible line so recharts initialises the axis scale */}
                    <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                    <Customized component={(props) => <MiniCandleLayer {...props} data={slice} />} />
                    <Customized component={(props) => <PatternCircleLayer {...props} data={slice} patternDates={patternDates} />} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
