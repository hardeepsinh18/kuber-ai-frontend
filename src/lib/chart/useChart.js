import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { formatCrosshairDate, formatTickMark } from './formatters';

// LWC has no CSS awareness — every colour is passed explicitly and re-applied
// when the app theme flips.
const palette = (isDark) => ({
    layout: {
        background: { color: 'transparent' },
        textColor: isDark ? '#a1a1aa' : '#52525b',
        attributionLogo: false,
    },
    grid: {
        vertLines: { color: isDark ? '#27272a' : '#f4f4f5' },
        horzLines: { color: isDark ? '#27272a' : '#f4f4f5' },
    },
    rightPriceScale: { borderColor: isDark ? '#3f3f46' : '#e4e4e7' },
    timeScale: { borderColor: isDark ? '#3f3f46' : '#e4e4e7' },
});

export const useChart = (containerRef, { theme }) => {
    const chartRef = useRef(null);
    const isDark = theme === 'dark';

    // Create once. Theme lands via applyOptions below rather than a rebuild,
    // which would drop all series and their data.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const chart = createChart(el, {
            ...palette(isDark),
            autoSize: true,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { labelVisible: true },
                horzLine: { labelVisible: true },
            },
            // No chart-wide priceFormatter: LWC lets it override every
            // series, which put ₹ on the RSI/MACD/Volume panes. The ₹ format
            // is set per price series instead (PRICE_FORMAT in ChartPanel).
            localization: {
                locale: 'en-IN',
                timeFormatter: formatCrosshairDate,
            },
            timeScale: {
                ...palette(isDark).timeScale,
                tickMarkFormatter: formatTickMark,
                rightOffset: 4,
                barSpacing: 8,
                // Keep horizontal panning bounded to the actual data range too
                // (belt-and-suspenders alongside the price-axis fix below).
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            handleScroll: true,
            handleScale: {
                mouseWheel: true,
                pinch: true,
                axisPressedMouseMove: {
                    time: true,
                    // Confirmed via screen recording: dragging the right-side
                    // price axis manually rescales the Y range with NO limit —
                    // drag far enough and the real candles scroll entirely off
                    // the visible range (price axis ends up showing e.g.
                    // ₹17,500–21,745 while the actual data sits at
                    // ₹22,000–25,600), leaving a totally empty chart. There is
                    // no "snap back" once that happens short of a page reload.
                    // Disabling this one gesture removes the failure mode
                    // outright; autoScale (the default) already keeps the
                    // price axis correctly fit to the visible candles, so nothing
                    // is lost — this was never a feature anyone was relying on.
                    price: false,
                },
            },
        });

        chartRef.current = chart;

        return () => {
            chart.remove();
            chartRef.current = null;
        };
        // Mount/unmount only — theme is applied by the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        chartRef.current?.applyOptions(palette(isDark));
    }, [isDark]);

    return { chartRef };
};
