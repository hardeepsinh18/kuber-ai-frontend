import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { CandlestickSeries, AreaSeries, LineSeries, HistogramSeries, LineStyle } from 'lightweight-charts';
import { useChart } from '../../lib/chart/useChart';
import { toCandleData, toAreaData } from '../../lib/chart/normalize';
import { formatPrice, formatPriceCompact, formatVolume, formatTickMark, formatCrosshairDate } from '../../lib/chart/formatters';
import { toHeikinAshi } from '../../lib/chartTransforms';
import { RenkoSeries, renkoData, renkoTickFormatter, renkoVisibleRange } from '../../lib/chart/renkoSeries';
import { PatternPrimitive } from '../../lib/chart/patternPrimitive';
import { CandlestickCirclePrimitive } from '../../lib/chart/candlestickCirclePrimitive';
import { formatPeriodLabel, TIMEFRAME_DEFS } from '../../lib/chart/timeframes';
import { INDICATOR_DEFS, INDICATOR_ORDER } from '../../lib/chart/indicators';

const BULL = '#26a69a';
const BEAR = '#ef5350';
// The running (incomplete) day/week/month candle is drawn hollow: outline in
// the usual colour, body nearly transparent.
const PARTIAL_BULL = 'rgba(38, 166, 154, 0.15)';
const PARTIAL_BEAR = 'rgba(239, 83, 80, 0.15)';

// Price-pane series carry the ₹ format; indicator panes get their own.
const PRICE_FORMAT = { type: 'custom', formatter: formatPriceCompact, minMove: 0.01 };
const VOLUME_FORMAT = { type: 'custom', formatter: (v) => formatVolume(v) ?? '0', minMove: 1 };
const OSC_FORMAT = { type: 'price', precision: 2, minMove: 0.01 };

// Pane-0 (price) height relative to one indicator pane.
const PRICE_PANE_STRETCH = 3.4;

const timeFormatterFor = (timeframe) =>
    (timeframe === 'W' || timeframe === 'M') ? (t) => formatPeriodLabel(t, timeframe) : formatCrosshairDate;

const fmtInd = (v) => (v == null || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2));

// toHeikinAshi works in the Recharts row shape ({date,...}); adapt across the
// boundary rather than forking the transform.
const heikinBars = (bars) =>
    toHeikinAshi(bars.map((b) => ({ ...b, date: b.time })))
        .map(({ date, open, high, low, close }) => ({ time: date, open, high, low, close }));

// Appends the in-progress brick (if any) so the series and its visible-range
// window both extend through today, not just through the last completed brick.
const withLiveBrick = (renko) =>
    renko?.liveBrick ? [...(renko.bricks ?? []), renko.liveBrick] : (renko?.bricks ?? []);

const ChartPanel = forwardRef(({
    chartType, bars, renko, patternAnn, candlestickAnn, range, theme, className,
    timeframe = 'D', indicators = null, selectedIndicators = [],
}, ref) => {
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
            const data = renkoData(withLiveBrick(renko));
            series = chart.addCustomSeries(new RenkoSeries(), { priceFormat: PRICE_FORMAT });
            series.setData(data);
            // Synthetic times must display as their real completion dates.
            chart.applyOptions({
                timeScale: { tickMarkFormatter: renkoTickFormatter(data) },
                localization: { timeFormatter: renkoTickFormatter(data) },
            });
        } else if (chartType === 'area') {
            series = chart.addSeries(AreaSeries, {
                priceFormat: PRICE_FORMAT,
                lineColor: BULL,
                topColor: `${BULL}66`,
                bottomColor: `${BULL}0d`,
                lineWidth: 2,
            });
            series.setData(toAreaData(bars));
        } else {
            series = chart.addSeries(CandlestickSeries, {
                priceFormat: PRICE_FORMAT,
                upColor: BULL,
                downColor: BEAR,
                // Borders match the body so complete candles look unchanged;
                // they only show on the hollow partial candle.
                borderVisible: true,
                borderUpColor: BULL,
                borderDownColor: BEAR,
                wickUpColor: BULL,
                wickDownColor: BEAR,
            });
            const partialTimes = new Set(bars.filter((b) => b.partial).map((b) => b.time));
            const candles = toCandleData(chartType === 'heikin' ? heikinBars(bars) : bars)
                .map((c) => (partialTimes.has(c.time)
                    ? { ...c, color: c.close >= c.open ? PARTIAL_BULL : PARTIAL_BEAR }
                    : c));
            series.setData(candles);
        }

        if (chartType !== 'renko') {
            chart.applyOptions({
                timeScale: { tickMarkFormatter: formatTickMark },
                localization: { timeFormatter: timeFormatterFor(timeframe) },
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
    }, [chartType, bars, renko, patternAnn, candlestickAnn, timeframe, chartRef]);

    // Indicators. Kept out of the series effect above so toggling one doesn't
    // rebuild the candles or reset the zoom. Its deps are a superset of that
    // effect's on purpose: LWC deletes a pane once its last series is removed,
    // so when the price series is rebuilt the indicator panes must be torn down
    // and rebuilt in the same commit, or they would shift into pane 0.
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !bars.length || !indicators || chartType === 'renko') return;

        const created = [];
        const lineData = (values) => values
            .map((v, i) => (v == null ? null : { time: bars[i].time, value: v }))
            .filter(Boolean);
        const lineOpts = (color, dashed, priceFormat) => ({
            priceFormat,
            color,
            lineWidth: 1,
            lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });

        let nextPane = 1;
        for (const id of INDICATOR_ORDER) {
            const ind = indicators[id];
            if (!ind || !selectedIndicators.includes(id)) continue;
            const pane = INDICATOR_DEFS[id].pane === 'price' ? 0 : nextPane++;
            const fmt = pane === 0 ? PRICE_FORMAT : OSC_FORMAT;

            if (id === 'volume') {
                const s = chart.addSeries(HistogramSeries, {
                    priceFormat: VOLUME_FORMAT,
                    priceLineVisible: false,
                    lastValueVisible: false,
                }, pane);
                s.setData(bars
                    .map((b, i) => (ind.hist[i] == null ? null : {
                        time: b.time,
                        value: ind.hist[i],
                        color: b.partial
                            ? (b.close >= b.open ? PARTIAL_BULL : PARTIAL_BEAR)
                            : (b.close >= (b.open ?? b.close) ? `${BULL}99` : `${BEAR}99`),
                    }))
                    .filter(Boolean));
                created.push(s);
                continue;
            }

            if (ind.hist) {
                const s = chart.addSeries(HistogramSeries, { priceFormat: fmt, priceLineVisible: false, lastValueVisible: false }, pane);
                s.setData(ind.hist
                    .map((v, i) => (v == null ? null : { time: bars[i].time, value: v, color: v >= 0 ? `${BULL}88` : `${BEAR}88` }))
                    .filter(Boolean));
                created.push(s);
            }
            for (const line of ind.lines || []) {
                const s = chart.addSeries(LineSeries, lineOpts(line.color, line.dashed, fmt), pane);
                s.setData(lineData(line.values));
                for (const level of ind.levels || []) {
                    s.createPriceLine({ price: level, color: '#a1a1aa', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false });
                }
                created.push(s);
            }
        }

        const panes = chart.panes();
        if (panes.length > 1) {
            panes[0].setStretchFactor(PRICE_PANE_STRETCH);
            for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1);
        }

        return () => {
            for (const s of created) {
                try { chart.removeSeries(s); } catch { /* chart already disposed */ }
            }
        };
    }, [indicators, selectedIndicators, chartType, bars, renko, patternAnn, candlestickAnn, timeframe, chartRef]);

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
            const idx = bars.findIndex((b) => b.time === param.time);
            const bar = idx >= 0 ? bars[idx] : null;
            setHover({
                open: d.open, high: d.high, low: d.low,
                close: d.close ?? d.value,
                volume: bar?.volume ?? null,
                partial: !!bar?.partial,
                idx,
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
            const vr = renkoVisibleRange(withLiveBrick(renko), bars, range);
            if (vr) ts.setVisibleLogicalRange(vr);
            return;
        }
        if (!bars.length) return;
        const from = Math.max(bars.length - range, 0);
        ts.setVisibleLogicalRange({ from, to: bars.length - 1 });
    }, [range, bars, chartType, renko, chartRef]);

    const shown = hover ?? (bars.length ? { ...bars[bars.length - 1], idx: bars.length - 1 } : null);
    const indicatorLegend = indicators && chartType !== 'renko' && shown && shown.idx >= 0
        ? INDICATOR_ORDER.filter((id) => selectedIndicators.includes(id) && id !== 'volume' && indicators[id])
            .map((id) => {
                const ind = indicators[id];
                const vals = id === 'bb'
                    ? [ind.lines[0].values[shown.idx], ind.lines[2].values[shown.idx]]
                    : ind.lines.map((l) => l.values[shown.idx]);
                const def = INDICATOR_DEFS[id];
                return { id, label: def.short || def.label, color: def.color, text: vals.map(fmtInd).join(' / ') };
            })
        : [];
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
                        {shown.partial && chartType !== 'renko' && (
                            <span className="px-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {TIMEFRAME_DEFS[timeframe]?.partialLabel || 'In progress'}
                            </span>
                        )}
                        {indicatorLegend.length > 0 && (
                            <div className="basis-full flex flex-wrap gap-x-2.5 gap-y-0.5">
                                {indicatorLegend.map(({ id, label, color, text }) => (
                                    <span key={id} className="text-zinc-500 dark:text-zinc-400">
                                        <span style={{ color }}>{label}</span>
                                        <span className="ml-1 text-zinc-700 dark:text-zinc-300">{text}</span>
                                    </span>
                                ))}
                            </div>
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
