import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { useChart } from '../../lib/chart/useChart';
import { toCandleData, toAreaData } from '../../lib/chart/normalize';
import { formatPrice, formatVolume, formatTickMark, formatCrosshairDate } from '../../lib/chart/formatters';
import { toHeikinAshi } from '../../lib/chartTransforms';
import { RenkoSeries, renkoData, renkoTickFormatter, renkoVisibleRange } from '../../lib/chart/renkoSeries';
import { PatternPrimitive } from '../../lib/chart/patternPrimitive';
import { CandlestickCirclePrimitive } from '../../lib/chart/candlestickCirclePrimitive';

const BULL = '#26a69a';
const BEAR = '#ef5350';

// toHeikinAshi works in the Recharts row shape ({date,...}); adapt across the
// boundary rather than forking the transform.
const heikinBars = (bars) =>
    toHeikinAshi(bars.map((b) => ({ ...b, date: b.time })))
        .map(({ date, open, high, low, close }) => ({ time: date, open, high, low, close }));

const ChartPanel = forwardRef(({ chartType, bars, renko, patternAnn, candlestickAnn, range, theme, className }, ref) => {
    const containerRef = useRef(null);
    const seriesRef = useRef(null);
    const patternRef = useRef(null);
    const candlestickPatternRef = useRef(null);
    const { chartRef } = useChart(containerRef, { theme });
    const [hover, setHover] = useState(null);

    const scaleRange = (factor) => {
        const ts = chartRef.current?.timeScale();
        const vr = ts?.getVisibleLogicalRange();
        if (!ts || !vr) return;
        const mid = (vr.from + vr.to) / 2;
        const half = ((vr.to - vr.from) * factor) / 2;
        ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
    };

    // Zoom buttons drive the time scale's logical range. The chart's own wheel,
    // drag and pinch handling is native and needs no code.
    useImperativeHandle(ref, () => ({
        zoomIn: () => scaleRange(0.6),
        zoomOut: () => scaleRange(1.7),
    }));

    // Dev-only hook so the Playwright harness can assert that zoom changed the
    // visible range. import.meta.env.DEV is false in production builds, so this
    // is stripped from the bundle.
    useEffect(() => {
        if (!import.meta.env.DEV) return;
        window.__chartVisibleRange__ = () => chartRef.current?.timeScale()?.getVisibleLogicalRange() ?? null;
        return () => { delete window.__chartVisibleRange__; };
    }, [chartRef]);

    // Rebuild the series when the type changes; setData when the bars change.
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !bars.length) return;

        if (seriesRef.current) {
            chart.removeSeries(seriesRef.current);
            seriesRef.current = null;
        }

        let series;
        if (chartType === 'renko') {
            const data = renkoData(renko?.bricks ?? []);
            series = chart.addCustomSeries(new RenkoSeries(), {});
            series.setData(data);
            // Synthetic times must display as their real completion dates.
            chart.applyOptions({
                timeScale: { tickMarkFormatter: renkoTickFormatter(data) },
                localization: { timeFormatter: renkoTickFormatter(data) },
            });
        } else if (chartType === 'area') {
            series = chart.addSeries(AreaSeries, {
                lineColor: BULL,
                topColor: `${BULL}66`,
                bottomColor: `${BULL}0d`,
                lineWidth: 2,
            });
            series.setData(toAreaData(bars));
        } else {
            series = chart.addSeries(CandlestickSeries, {
                upColor: BULL,
                downColor: BEAR,
                borderVisible: false,
                wickUpColor: BULL,
                wickDownColor: BEAR,
            });
            series.setData(toCandleData(chartType === 'heikin' ? heikinBars(bars) : bars));
        }

        if (chartType !== 'renko') {
            chart.applyOptions({
                timeScale: { tickMarkFormatter: formatTickMark },
                localization: { timeFormatter: formatCrosshairDate },
            });
        }
        seriesRef.current = series;
        chart.timeScale().fitContent();

        patternRef.current = null;
        if (patternAnn?.has && (chartType === 'candle' || chartType === 'area')) {
            const primitive = new PatternPrimitive(patternAnn, bars);
            series.attachPrimitive(primitive);
            patternRef.current = primitive;
        }

        // Candlestick pattern circle — candle view only (an ellipse around a
        // wick/body doesn't translate to the area/heikin/renko series shapes).
        candlestickPatternRef.current = null;
        if (candlestickAnn?.has && chartType === 'candle') {
            const circlePrimitive = new CandlestickCirclePrimitive(candlestickAnn.dates, bars);
            series.attachPrimitive(circlePrimitive);
            candlestickPatternRef.current = circlePrimitive;
        }

        // Detach this run's own series before the next run (or unmount) starts.
        // Without this, React's dev-only StrictMode remount (mount -> cleanup ->
        // mount) leaves seriesRef pointing at a series that belonged to the
        // chart instance useChart's own mount effect just destroyed; the next
        // mount's removeSeries() guard above then throws trying to remove a
        // stale series from a brand-new chart that never owned it.
        return () => {
            try { chart.removeSeries(series); } catch { /* chart already disposed */ }
            if (seriesRef.current === series) seriesRef.current = null;
        };
    }, [chartType, bars, renko, patternAnn, candlestickAnn, chartRef]);

    // Crosshair -> legend. Falling back to the last bar keeps the readout
    // populated when the cursor leaves, rather than blanking.
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const onMove = (param) => {
            const series = seriesRef.current;
            if (!series || !param.time) {
                setHover(null);
                return;
            }
            const d = param.seriesData.get(series);
            if (!d) {
                setHover(null);
                return;
            }
            const bar = bars.find((b) => b.time === param.time);
            setHover({
                open: d.open, high: d.high, low: d.low,
                close: d.close ?? d.value,
                volume: bar?.volume ?? null,
            });
        };

        chart.subscribeCrosshairMove(onMove);
        return () => chart.unsubscribeCrosshairMove(onMove);
    }, [bars, chartRef]);

    // Range chips select the last N daily bars. Renko is indexed by brick, not by
    // day, so its window is translated from the daily range via renkoVisibleRange;
    // using bars.length there would point the viewport past the brick data and
    // render blank.
    useEffect(() => {
        const ts = chartRef.current?.timeScale();
        if (!ts || !range) return;
        if (chartType === 'renko') {
            const vr = renkoVisibleRange(renko?.bricks ?? [], bars, range);
            if (vr) ts.setVisibleLogicalRange(vr);
            return;
        }
        if (!bars.length) return;
        const from = Math.max(bars.length - range, 0);
        ts.setVisibleLogicalRange({ from, to: bars.length - 1 });
    }, [range, bars, chartType, renko, chartRef]);

    const shown = hover ?? (bars.length ? bars[bars.length - 1] : null);
    const isBull = shown && shown.close >= (shown.open ?? shown.close);
    const isOhlc = chartType !== 'area' && shown?.open != null;

    return (
        <div className={className}>
            <div className="relative w-full h-full">
                {shown && (
                    <div className="absolute top-1.5 left-2 z-10 pointer-events-none flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-medium tabular-nums">
                        {isOhlc ? (
                            <>
                                {[['O', shown.open], ['H', shown.high], ['L', shown.low], ['C', shown.close]].map(([k, v]) => (
                                    <span key={k} className="text-zinc-500 dark:text-zinc-400">
                                        {k}
                                        <span className={isBull ? 'ml-1 text-emerald-600 dark:text-emerald-400' : 'ml-1 text-rose-600 dark:text-rose-400'}>
                                            {formatPrice(v)}
                                        </span>
                                    </span>
                                ))}
                            </>
                        ) : (
                            <span className="text-zinc-500 dark:text-zinc-400">
                                C<span className="ml-1 text-zinc-900 dark:text-zinc-100">{formatPrice(shown.close)}</span>
                            </span>
                        )}
                        {formatVolume(shown.volume) && (
                            <span className="text-zinc-500 dark:text-zinc-400">
                                Vol<span className="ml-1 text-zinc-700 dark:text-zinc-300">{formatVolume(shown.volume)}</span>
                            </span>
                        )}
                        {chartType === 'heikin' && (
                            <span className="text-zinc-400 dark:text-zinc-500">Heikin-Ashi (smoothed)</span>
                        )}
                    </div>
                )}
                <div ref={containerRef} className="w-full h-full" />
            </div>
        </div>
    );
});

ChartPanel.displayName = 'ChartPanel';

export default ChartPanel;
