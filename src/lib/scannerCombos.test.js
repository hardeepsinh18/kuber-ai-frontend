import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    MAX_SCANNERS, conflictPairs, comboLabel, comboSummary,
    loadSavedCombos, saveCombo, deleteCombo, isComboSaved, MAX_SAVED,
} from './scannerCombos';
import { getComboMetric } from './scannerSignal';
import { formatComboResults } from './formatScanResults';

const memStore = () => {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: k => m.delete(k),
        _m: m,
    };
};

describe('combo limits and wording', () => {
    it('allows up to 3 scanners', () => {
        expect(MAX_SCANNERS).toBe(3);
    });

    it('labels match the backend combo_label', () => {
        expect(comboLabel(['A', 'B'], 'all')).toBe('A + B');
        expect(comboLabel(['A', 'B'], 'any')).toBe('A or B');
        expect(comboLabel(['A', 'B', 'C'], 'exclude', 'C')).toBe('A + B · not C');
    });

    it('explains the 2-of-3 fallback for a 3-way ALL', () => {
        expect(comboSummary(['A', 'B', 'C'], 'all')).toMatch(/2 of 3/);
        expect(comboSummary(['A', 'B'], 'all')).not.toMatch(/2 of 3/);
        expect(comboSummary(['A', 'B'], 'exclude', 'B')).toBe('Stocks matching A, but not B');
    });

    it('finds contradictory pairs once each', () => {
        expect(conflictPairs(['RSI Oversold', 'RSI Overbought', 'High ROE'])).toEqual([['RSI Oversold', 'RSI Overbought']]);
        expect(conflictPairs(['High ROE', 'Low P/E'])).toEqual([]);
    });
});

describe('saved combinations', () => {
    let store;
    beforeEach(() => { store = memStore(); });

    const combo = { scanners: ['RSI Oversold', 'High ROE'], mode: 'all', exclude: null, universe: 'nifty500' };

    it('round-trips per user, namespaced by user id', () => {
        saveCombo('u1', combo, store);
        expect(loadSavedCombos('u1', store)).toHaveLength(1);
        expect(loadSavedCombos('u2', store)).toHaveLength(0);
        expect([...store._m.keys()][0]).toMatch(/::u1$/);
    });

    it('never writes a shared bucket when there is no identity', () => {
        saveCombo(null, combo, store);
        expect(store._m.size).toBe(0);
        expect(loadSavedCombos(null, store)).toEqual([]);
    });

    it('dedupes the same combo regardless of scanner order', () => {
        saveCombo('u1', combo, store);
        saveCombo('u1', { ...combo, scanners: ['High ROE', 'RSI Oversold'] }, store);
        expect(loadSavedCombos('u1', store)).toHaveLength(1);
        expect(isComboSaved(loadSavedCombos('u1', store), { ...combo, scanners: ['High ROE', 'RSI Oversold'] })).toBe(true);
        expect(isComboSaved(loadSavedCombos('u1', store), { ...combo, mode: 'any' })).toBe(false);
    });

    it('keeps the newest first and caps the list', () => {
        const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        names.forEach(n => saveCombo('u1', { scanners: [n, 'Z'], mode: 'any', universe: 'nifty500' }, store));
        const list = loadSavedCombos('u1', store);
        expect(list).toHaveLength(MAX_SAVED);
        expect(list[0].scanners[0]).toBe('J');
    });

    it('deletes by id', () => {
        const [c] = saveCombo('u1', combo, store);
        expect(deleteCombo('u1', c.id, store)).toEqual([]);
    });

    it('rejects invalid combos and survives corrupt storage', () => {
        saveCombo('u1', { scanners: ['A'], mode: 'all' }, store);
        saveCombo('u1', { scanners: ['A', 'B'], mode: 'exclude', exclude: 'Q' }, store);
        expect(loadSavedCombos('u1', store)).toEqual([]);
        store.setItem('venty_scanner_combos_v1::u1', '{not json');
        expect(loadSavedCombos('u1', store)).toEqual([]);
    });
});

describe('each matched scanner shows its own value', () => {
    it('technical scanners show their indicator, not price', () => {
        expect(getComboMetric('RSI Oversold', { Close: 100, RSI: 24.13 }).label).toBe('RSI 24.13');
        expect(getComboMetric('Volume Surge', { Close: 100, Vol_Ratio: 3.2 }).label).toBe('Vol ×3.2');
        expect(getComboMetric('MACD Bearish Crossover', { MACD: -1, Signal: 0, Hist: -0.31 }).label).toBe('Hist -0.31');
    });

    it('fundamental scanners show their metric', () => {
        expect(getComboMetric('High ROE', { 'ROE_%': 45.2, PE: 30 }).label).toBe('ROE 45.2%');
    });

    it('scanners without a distinct metric fall back to price', () => {
        expect(getComboMetric('Supertrend Buy', { Close: 1234.5 }).label).toMatch(/₹1234.5/);
    });
});

describe('combo results as chat markdown', () => {
    const job = {
        scanner: 'RSI Oversold + High ROE + Volume Surge',
        scanners: ['RSI Oversold', 'High ROE', 'Volume Surge'],
        universe: 'Nifty 500', duration_seconds: 4.2, fallback: true, required: 2,
        results: [{
            Symbol: 'TCS', matched: ['RSI Oversold', 'High ROE'], missed: ['Volume Surge'], match_count: 2, of: 3,
            signals: { 'RSI Oversold': { RSI: 24.1, Close: 3500 }, 'High ROE': { 'ROE_%': 45.2 } },
        }],
    };

    it('lists each scanner with its value and flags the fallback', () => {
        const md = formatComboResults(job);
        expect(md).toContain('no stock matched all 3');
        expect(md).toContain('**TCS** _(2/3)_ — RSI Oversold: RSI 24.1 · High ROE: ROE 45.2%');
    });

    it('handles an empty result', () => {
        expect(formatComboResults({ ...job, results: [] })).toMatch(/found no matching stocks/);
    });
});

describe('panel contract', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const panel = fs.readFileSync(path.resolve(here, '../components/Chat/ScannerPanel.jsx'), 'utf8');

    it('is no longer single-select', () => {
        expect(panel).not.toContain('new Set([name])');
        expect(panel).toContain('next.size < MAX_SCANNERS');
    });

    it('combines on the server, never by intersecting capped single-scan lists', () => {
        expect(panel).toContain('COMBO_ENDPOINT');
        expect(panel).not.toMatch(/intersection/);
    });

    it('keeps one scanner on the original endpoint and payload', () => {
        expect(panel).toContain("startJob(SCANNER_ENDPOINT, { scanner: names[0], universe })");
        expect(panel).toContain('data-testid="scanner-run-button"');
    });
});
