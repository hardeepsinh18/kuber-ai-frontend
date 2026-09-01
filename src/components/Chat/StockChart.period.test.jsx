/**
 * VNTY-011 (QA report, 24-25 Aug 2026, P2): "Chart ignores the period that was
 * asked for." A suggestion card like "Show Nifty 50 chart for last 6 months"
 * always opened the chart on the hardcoded 3M default. StockChart already had
 * a requestedPeriod mechanism (chartData.period -> PERIOD_TO_BARS -> initial
 * range) — nothing in the pipeline ever populated chartData.period, so it was
 * always null and the range fell through to the 66-bar (3M) fallback.
 */
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import StockChart from './StockChart';

// jsdom has no window.matchMedia, which lightweight-charts' canvas sizing
// (fancy-canvas) needs — nothing else in this suite has rendered a real
// chart panel before, so this polyfill has never been needed until now.
beforeAll(() => {
    if (!window.matchMedia) {
        window.matchMedia = () => ({
            matches: false, media: '', onchange: null,
            addListener: () => {}, removeListener: () => {},
            addEventListener: () => {}, removeEventListener: () => {},
            dispatchEvent: () => false,
        });
    }
});

afterEach(cleanup);

const renderChart = (props) => render(<ThemeProvider><StockChart {...props} /></ThemeProvider>);

// 150 daily bars — enough to distinguish 3M (66 bars) from 6M (132 bars).
function buildChartData(period) {
    const dates = [], open = [], high = [], low = [], close = [], volume = [];
    const start = new Date('2026-01-01T00:00:00Z');
    for (let i = 0; i < 150; i++) {
        const d = new Date(start.getTime() + i * 86400000);
        dates.push(d.toISOString().slice(0, 10));
        const p = 100 + i;
        open.push(p); high.push(p + 1); low.push(p - 1); close.push(p); volume.push(1000);
    }
    return { dates, open, high, low, close, volume, timeframe: 'daily', period, chart_metadata: { symbol: 'NIFTY50' } };
}

const activeButtonLabel = () => {
    for (const label of ['1M', '3M', '6M', '1Y']) {
        const btn = screen.getByText(label).closest('button');
        if (btn && btn.className.includes('bg-zinc-800')) return label;
    }
    return null;
};

describe('StockChart initial range honors the requested period', () => {
    it('defaults to 3M when no period was requested (existing behavior)', () => {
        renderChart({ chartData: buildChartData(null), symbol: 'NIFTY50' });
        expect(activeButtonLabel()).toBe('3M');
    });

    it('opens on 6M when chartData.period is "6m"', () => {
        renderChart({ chartData: buildChartData('6m'), symbol: 'NIFTY50' });
        expect(activeButtonLabel()).toBe('6M');
    });

    it('opens on 1M when chartData.period is "1m"', () => {
        renderChart({ chartData: buildChartData('1m'), symbol: 'NIFTY50' });
        expect(activeButtonLabel()).toBe('1M');
    });

    it('is case-insensitive ("6M" from the backend works the same as "6m")', () => {
        renderChart({ chartData: buildChartData('6M'), symbol: 'NIFTY50' });
        expect(activeButtonLabel()).toBe('6M');
    });
});
