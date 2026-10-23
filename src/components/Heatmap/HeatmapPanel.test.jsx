import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import HeatmapPanel from './HeatmapPanel';

// Mobile width → tile list (no ResizeObserver/treemap needed in jsdom).
const payload = (key, symbol, tf = '1D') => ({
    index: { key, label: key, ltp: 100, pChange: 1 },
    tf, since: null, market_open: false, as_of: '2026-10-23T16:00:00+05:30', count: 1,
    sectors: [{ name: 'Financial Services', pChange: 1, mcap: 10, stocks: [
        { symbol, name: symbol, ltp: 10, pChange: 1, volume: 5, mcap: 10 },
    ] }],
});

const deferred = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
};
const ok = (body) => ({ ok: true, json: async () => body });

describe('HeatmapPanel data loading', () => {
    let calls;
    beforeEach(() => {
        window.innerWidth = 400;
        calls = [];
        vi.stubGlobal('fetch', vi.fn((url) => {
            const d = deferred();
            calls.push({ url, ...d });
            return d.promise;
        }));
    });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

    it('ignores a slow response for a tab the user already left', async () => {
        render(<HeatmapPanel onClose={() => {}} onAnalyze={() => {}} />);
        fireEvent.click(screen.getByText('Bank Nifty'));
        expect(calls).toHaveLength(2);

        await act(async () => calls[1].resolve(ok(payload('BANKNIFTY', 'HDFCBANK'))));
        expect(screen.getByText('HDFCBANK')).toBeTruthy();

        // The original Nifty 50 request finishes last — it must not repaint.
        await act(async () => calls[0].resolve(ok(payload('NIFTY50', 'RELIANCE'))));
        expect(screen.queryByText('RELIANCE')).toBeNull();
        expect(screen.getByText('HDFCBANK')).toBeTruthy();
    });

    it('does not show the previous tab’s stocks while the new tab loads', async () => {
        render(<HeatmapPanel onClose={() => {}} onAnalyze={() => {}} />);
        await act(async () => calls[0].resolve(ok(payload('NIFTY50', 'RELIANCE'))));
        expect(screen.getByText('RELIANCE')).toBeTruthy();

        fireEvent.click(screen.getByText('1W'));
        expect(screen.queryByText('RELIANCE')).toBeNull();   // skeleton, not 1D data under "1W"
        await act(async () => calls[1].resolve(ok(payload('NIFTY50', 'RELIANCE', '1W'))));
        expect(screen.getByText('RELIANCE')).toBeTruthy();
    });

    it('shows an error with retry when a load fails', async () => {
        render(<HeatmapPanel onClose={() => {}} onAnalyze={() => {}} />);
        await act(async () => calls[0].resolve({ ok: false, status: 503, json: async () => ({}) }));
        expect(screen.getByText(/Could not load the heat map/)).toBeTruthy();
        fireEvent.click(screen.getByText('Retry'));
        await act(async () => calls[1].resolve(ok(payload('NIFTY50', 'RELIANCE'))));
        expect(screen.getByText('RELIANCE')).toBeTruthy();
    });
});
