/* eslint-disable react-refresh/only-export-components -- dev-only entry point, full reload is fine */
// Dev-only preview harness for StockChart — served by Vite at /chart-preview.html.
// Renders every chart type in light and dark themes against deterministic mock
// OHLCV data so chart changes can be eyeballed without a live backend.
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import StockChart from './components/Chat/StockChart';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Deterministic PRNG so every reload renders the identical series
const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const genChartData = () => {
    const rnd = mulberry32(42);
    const dates = [], open = [], high = [], low = [], close = [], volume = [];
    let price = 1450;
    const d = new Date('2025-07-14T00:00:00');
    while (dates.length < 252) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const bar = dates.length;
        // three regimes: drift down, trend up, sell off — exercises renko reversals
        const drift = bar < 60 ? -0.9 : bar < 150 ? 2.1 : -1.6;
        const shock = (rnd() - 0.5) * 34;
        const o = price;
        const c = Math.max(price + drift + shock, 100);
        const h = Math.max(o, c) + rnd() * 14;
        const l = Math.min(o, c) - rnd() * 14;
        dates.push(d.toISOString().slice(0, 10));
        open.push(+o.toFixed(2));
        high.push(+h.toFixed(2));
        low.push(+l.toFixed(2));
        close.push(+c.toFixed(2));
        volume.push(Math.floor(1e6 + rnd() * 9e6));
        price = c;
    }
    return {
        dates, open, high, low, close, volume,
        timeframe: 'daily',
        chart_metadata: {
            symbol: 'MOCKSTOCK',
            data_points: dates.length,
            start_date: dates[0],
            end_date: dates[dates.length - 1],
        },
    };
};

const chartData = genChartData();
const atAGlance = {
    open: 1330, high: 1345, low: 1318, volume: 14200000,
    '52w_low': 1235, '52w_high': 1615,
};

const TYPE_ARIA = {
    area: 'Area chart',
    candle: 'Candlestick chart',
    heikin: 'Heikin-Ashi chart',
    renko: 'Renko chart',
};

// Clicks the wanted chart-type button after mount so each preview cell shows a
// different view of the same (stateful) component.
const AutoType = ({ type, children }) => {
    const ref = useRef(null);
    useEffect(() => {
        ref.current?.querySelector(`button[aria-label="${TYPE_ARIA[type]}"]`)?.click();
    }, [type]);
    return <div ref={ref}>{children}</div>;
};

const ThemeRow = ({ theme }) => (
    <div className={theme === 'dark' ? 'dark' : ''} data-theme-row={theme}>
        <div className={theme === 'dark' ? 'bg-zinc-950 p-6' : 'bg-zinc-50 p-6'}>
            <h2 className={`text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {theme} mode
            </h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {Object.keys(TYPE_ARIA).map((t) => (
                    <div key={t} data-testid={`chart-${theme}-${t}`}>
                        <AutoType type={t}>
                            <StockChart
                                chartData={chartData}
                                symbol="MOCKSTOCK"
                                atAGlance={theme === 'light' ? atAGlance : null}
                            />
                        </AutoType>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* StockChart calls useTheme() (for the lightweight-charts palette), which
            throws outside a ThemeProvider — this harness renders StockChart
            directly, so it needs its own provider just like App.jsx's does. */}
        <ThemeProvider>
            <div>
                <ThemeRow theme="light" />
                <ThemeRow theme="dark" />
                {/* Dedicated target for the Playwright suite (e2e/chart.spec.js).
                    The grid above mounts 8 StockChart/ChartPanel instances at
                    once for visual review, and ChartPanel's dev-only
                    window.__chartVisibleRange__ hook (see ChartPanel.jsx) is a
                    single global — whichever instance's effect commits *last*
                    wins the assignment. Mounting this chart last in the tree,
                    after the whole grid, makes it deterministically the one
                    the hook (and therefore the zoom test) observes. */}
                <div className="bg-zinc-50 p-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide mb-3 text-zinc-600">
                        e2e target
                    </h2>
                    <div className="max-w-2xl" data-testid="chart-default">
                        <StockChart chartData={chartData} symbol="MOCKSTOCK" />
                    </div>
                </div>
            </div>
        </ThemeProvider>
    </React.StrictMode>
);
