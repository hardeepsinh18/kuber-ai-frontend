import { useState } from 'react';
import {
    Line,
    XAxis, YAxis, CartesianGrid,
    ComposedChart, Customized, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PatternAnnotationLayer from '../PatternAnnotationLayer';
import { MiniCandleLayer } from './CandlestickLayers';
import { PatternModal } from './PatternModal';

/* ─── Chart pattern card (top 1 from scanner) ────────────────────────────── */
export const ChartPatternCard = ({ cp }) => {
    const [modalOpen, setModalOpen] = useState(false);
    if (!cp) return null;

    const dirColor  = cp.direction === 'bullish' ? '#22c55e' : cp.direction === 'bearish' ? '#ef4444' : '#FDD405';
    const DirIcon   = cp.direction === 'bullish' ? TrendingUp : cp.direction === 'bearish' ? TrendingDown : Minus;
    const chartSlice = cp.chart_slice || [];

    const allHL = chartSlice.flatMap(d => [d.High ?? d.high, d.Low ?? d.low].filter(Boolean));
    const yMin = allHL.length ? Math.min(...allHL) : 0;
    const yMax = allHL.length ? Math.max(...allHL) : 1;
    const pad  = (yMax - yMin) * 0.12 || 1;

    const sliceData = chartSlice.map(d => ({
        date: d.date ?? d.Date,   // backend may return "Date" (capital) or "date"
        open:  d.Open  ?? d.open,
        high:  d.High  ?? d.high,
        low:   d.Low   ?? d.low,
        close: d.Close ?? d.close,
    }));

    return (
        <>
            <button
                onClick={() => setModalOpen(true)}
                className="w-full text-left bg-white dark:bg-zinc-900 border rounded-xl p-3 hover:border-[#FDD405]/70 transition-all group"
                style={{ borderColor: dirColor + '66' }}
            >
                <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <DirIcon size={11} color={dirColor} />
                        <span className="text-[10px] font-semibold" style={{ color: dirColor }}>{cp.direction}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {cp.bars_ago === 0 ? 'Active' : `${cp.bars_ago}d ago`} · {cp.strength}
                    </span>
                </div>

                {/* Mini chart from chart_slice, use same slice for both data and candles */}
                {(() => {
                    const miniSlice = sliceData.slice(-30);
                    const allMiniHL = miniSlice.flatMap(d => [d.high, d.low].filter(Boolean));
                    const miniYMin = allMiniHL.length ? Math.min(...allMiniHL) : yMin;
                    const miniYMax = allMiniHL.length ? Math.max(...allMiniHL) : yMax;
                    const miniPad  = (miniYMax - miniYMin) * 0.12 || 1;
                    return (
                        <div style={{ height: 90, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={miniSlice} margin={{ top: 4, right: 4, left: 0, bottom: 2 }}>
                                    <CartesianGrid strokeDasharray="2 4" stroke="#374151" opacity={0.2} vertical={false} />
                                    <YAxis domain={[miniYMin - miniPad, miniYMax + miniPad]} hide />
                                    <XAxis dataKey="date" hide />
                                    <Line dataKey="close" stroke="transparent" dot={false} legendType="none" isAnimationActive={false} />
                                    <Customized component={(props) => <MiniCandleLayer {...props} data={miniSlice} />} />
                                    <Customized component={(props) => (
                                        <PatternAnnotationLayer
                                            {...props}
                                            trendlines={cp.annotations?.trendlines || []}
                                            hlines={cp.annotations?.hlines || []}
                                            curve={cp.annotations?.curve || []}
                                            skeleton={cp.annotations?.skeleton || []}
                                            projection={cp.annotations?.projection || []}
                                            band={cp.annotations?.band || null}
                                            midline={cp.annotations?.midline || []}
                                            markers={[]}
                                            windowStartDate={cp.annotations?.window_start_date || null}
                                            data={miniSlice}
                                        />
                                    )} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })()}

                <div className="border-t border-zinc-200 dark:border-zinc-700/40 pt-2 mt-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{cp.pattern}</p>
                    <span className="text-[9px] text-zinc-400 group-hover:text-zinc-200 transition-colors">tap to expand →</span>
                </div>

                {/* Target / Stop intentionally not shown for chart patterns (product decision). */}
            </button>

            {modalOpen && (
                <PatternModal
                    pattern={{ ...cp, name: cp.pattern }}
                    ohlcBars={null}
                    chartData={null}
                    chartSlice={cp.chart_slice}
                    support={cp.support}
                    resistance={cp.resistance}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </>
    );
};
