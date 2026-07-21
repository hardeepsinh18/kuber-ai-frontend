import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { formatPriceCompact, formatCrosshairDate, formatTickMark } from './formatters';

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
            localization: {
                locale: 'en-IN',
                priceFormatter: formatPriceCompact,
                timeFormatter: formatCrosshairDate,
            },
            timeScale: {
                ...palette(isDark).timeScale,
                tickMarkFormatter: formatTickMark,
                rightOffset: 4,
                barSpacing: 8,
            },
            handleScroll: true,
            handleScale: true,
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
