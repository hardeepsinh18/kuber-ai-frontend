/**
 * BRD — Multi-Timeframe Candles: D/W/M toggle on the stock chart.
 *  - Daily stays the default and needs no extra request (chat payload only).
 *  - W/M fetch long history once, and the range chips change per timeframe.
 *  - Selected indicators survive a timeframe switch.
 */
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import StockChart from './StockChart';
import { _clearChartHistoryCache } from '../../lib/chart/chartHistory';

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

const daily = (n, startIso = '2025-01-01') => {
    const dates = [], open = [], high = [], low = [], close = [], volume = [];
    let t = Date.parse(`${startIso}T00:00:00Z`);
    while (dates.length < n) {
        const dow = new Date(t).getUTCDay();
        if (dow >= 1 && dow <= 5) {
            const p = 100 + dates.length;
            dates.push(new Date(t).toISOString().slice(0, 10));
            open.push(p); high.push(p + 1); low.push(p - 1); close.push(p); volume.push(1000);
        }
        t += 86400000;
    }
    return { dates, open, high, low, close, volume };
};

let fetchMock;
beforeEach(() => {
    _clearChartHistoryCache();
    fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ ...daily(2500, '2016-11-01'), adjustment: 'split_bonus', timeframe: 'daily' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const chartData = () => ({ ...daily(150), timeframe: 'daily', period: null, chart_metadata: { symbol: 'RELIANCE' } });
const renderChart = () => render(<ThemeProvider><StockChart chartData={chartData()} symbol="RELIANCE" /></ThemeProvider>);
const tfButton = (name) => screen.getByRole('button', { name: `${name} candles` });

describe('StockChart timeframe toggle', () => {
    it('opens on Daily with no extra network request', () => {
        renderChart();
        expect(tfButton('Daily').getAttribute('aria-pressed')).toBe('true');
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.getByText('3M')).toBeTruthy();
    });

    it('Weekly fetches 10Y history once and swaps in weekly ranges', async () => {
        renderChart();
        fireEvent.click(tfButton('Weekly'));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/market/chart?symbol=RELIANCE&years=10');
        expect(screen.getByText('10Y')).toBeTruthy();
        expect(screen.queryByText('1M')).toBeNull();
        await waitFor(() => expect(screen.getByText(/weekly chart •/)).toBeTruthy());
        expect(screen.getByText(/adjusted for splits & bonus/)).toBeTruthy();

        fireEvent.click(tfButton('Monthly'));
        expect(screen.getByText('3Y')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(1); // shared cache
    });

    it('keeps the selected indicators when switching timeframe', async () => {
        renderChart();
        fireEvent.click(screen.getByRole('button', { name: 'Indicators' }));
        fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'EMA 20' }));
        expect(screen.getByRole('menuitemcheckbox', { name: 'EMA 20' }).getAttribute('aria-checked')).toBe('true');

        fireEvent.mouseDown(document.body); // outside click closes the menu
        expect(screen.queryByRole('menuitemcheckbox', { name: 'EMA 20' })).toBeNull();

        fireEvent.click(tfButton('Weekly'));
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Indicators' }));
        expect(screen.getByRole('menuitemcheckbox', { name: 'EMA 20' }).getAttribute('aria-checked')).toBe('true');
    });

    it('falls back to the chat data with a note when history fails', async () => {
        fetchMock.mockImplementation(async () => ({ ok: false, status: 503, json: async () => ({}) }));
        renderChart();
        fireEvent.click(tfButton('Monthly'));
        await waitFor(() => expect(screen.getByText(/Longer history unavailable/)).toBeTruthy());
    });
});
