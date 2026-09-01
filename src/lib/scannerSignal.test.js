/**
 * VNTY-002: a technical/pattern scanner can price a matched row off a candle
 * several trading days old (backend lookback), while "Analyze" on the same
 * stock reads a live quote — so the two surfaces can legitimately disagree.
 * getScannerSignal must surface that gap instead of presenting a stale Close
 * as if it were current.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getScannerSignal } from './scannerSignal';

describe('getScannerSignal price fallback (VNTY-002)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-27T10:00:00Z'));
    });
    afterEach(() => { vi.useRealTimers(); });

    it('shows a plain price with no date when Scan_Date is today', () => {
        const row = { Close: 685.4, Scan_Date: '2026-08-27' };
        expect(getScannerSignal('Evening Star', row)).toEqual({ label: '₹685.4', type: 'price' });
    });

    it('appends the real candle date when Scan_Date is in the past', () => {
        const row = { Close: 753.1, Scan_Date: '2026-08-20' };
        expect(getScannerSignal('Evening Star', row)).toEqual({ label: '₹753.1 · 20 Aug', type: 'price' });
    });

    it('appends the date to the Chg_% branch too', () => {
        const row = { Close: 753.1, 'Chg_%': -2.3, Scan_Date: '2026-08-20' };
        expect(getScannerSignal('Short Term Breakouts', row))
            .toEqual({ label: '₹753.1 (-2.3%) · 20 Aug', type: 'bear' });
    });

    it('is a no-op when Scan_Date is missing (older cached rows)', () => {
        const row = { Close: 685.4 };
        expect(getScannerSignal('Evening Star', row)).toEqual({ label: '₹685.4', type: 'price' });
    });
});

describe('getScannerSignal MACD Crossover fields (bug: was showing Close as "Signal")', () => {
    it('shows MACD/Signal/Hist, not Close, for a bullish crossover row', () => {
        // Real APARINDS row from app/scanners/engine.py, 2026-08-27.
        const row = { Symbol: 'APARINDS', Close: 673.19, Scan_Date: '2026-08-27', MACD: 673.19, Signal: 646.44, Hist: 26.75 };
        expect(getScannerSignal('MACD Bullish Crossover', row))
            .toEqual({ label: 'MACD 673.19 · Signal 646.44 · Hist +26.75', type: 'bull' });
    });

    it('types as bear when Hist is negative', () => {
        const row = { Symbol: 'FOO', Close: 100, MACD: 12.5, Signal: 14.1, Hist: -1.6 };
        expect(getScannerSignal('MACD Bearish Crossover', row))
            .toEqual({ label: 'MACD 12.5 · Signal 14.1 · Hist -1.6', type: 'bear' });
    });

    it('still falls back to price when MACD fields are absent', () => {
        const row = { Close: 100 };
        expect(getScannerSignal('MACD Bullish Crossover', row)).toEqual({ label: '₹100', type: 'price' });
    });
});
