/**
 * The parser feeds a financial surface, so the priority is NOT extracting as
 * much as possible — it is never inventing a row. Every "returns []" test here
 * is a case where the UI must fall back to the original prose untouched.
 */
import { describe, it, expect } from 'vitest';
import { parseScreenerRows, screenerProse } from './screenerRows';

// Verbatim from the reported screenshot ("highest pe ratio i it sector"),
// including the takeaway sentence running onto the end of the last row.
const REAL = `Highest P/E Ratios in the IT Sector

Looking for sky-high valuations? Here are the IT stocks with the highest price-to-earnings (P/E) ratios from your list:

**LENSKART**: P/E of 210.0 | ROE: 6.3%

**IXIGO**: P/E of 117.0 | ROE: 5.5%

**CPPLUS**: P/E of 109.0 | ROE: 25.4% | Dividend yield: 5.00% These three stand out for their extreme valuations. LENSKART leads by a huge margin with a P/E of 210.0, but its return on equity (ROE) is just 6.3%, which is on the lower side.`;

describe('parseScreenerRows', () => {
    it('extracts every stock and its metrics from a real screener answer', () => {
        const rows = parseScreenerRows(REAL);
        expect(rows.map((r) => r.symbol)).toEqual(['LENSKART', 'IXIGO', 'CPPLUS']);
        expect(rows[0].metrics).toEqual([
            { label: 'P/E', value: '210.0' },
            { label: 'ROE', value: '6.3%' },
        ]);
        expect(rows[2].metrics).toEqual([
            { label: 'P/E', value: '109.0' },
            { label: 'ROE', value: '25.4%' },
            { label: 'Dividend yield', value: '5.00%' },
        ]);
    });

    it('handles numbered lists and plain (unbolded) symbols', () => {
        const rows = parseScreenerRows(
            '1. TCS: P/E of 28.4 | ROE: 51.8%\n2. INFY: P/E of 24.1 | ROE: 31.2%'
        );
        expect(rows.map((r) => r.symbol)).toEqual(['TCS', 'INFY']);
    });

    it('accepts symbols containing & - .', () => {
        const rows = parseScreenerRows(
            'M&M: P/E of 18.2\nBAJAJ-AUTO: P/E of 31.5'
        );
        expect(rows.map((r) => r.symbol)).toEqual(['M&M', 'BAJAJ-AUTO']);
    });

    it('does not repeat a symbol that appears twice', () => {
        const rows = parseScreenerRows(
            'TCS: P/E of 28.4\nINFY: P/E of 24.1\nTCS: P/E of 28.4'
        );
        expect(rows.map((r) => r.symbol)).toEqual(['TCS', 'INFY']);
    });

    // ── everything below must fall back to prose ──────────────────────────────

    it('returns [] for ordinary prose', () => {
        expect(parseScreenerRows(
            'ICICI Bank is fundamentally strong and trending up, but the Hanging Man candle says do not chase at highs.'
        )).toEqual([]);
    });

    it('returns [] for a single-stock answer', () => {
        // One match is more likely a sentence than a list, and single-stock
        // answers already have their own layout.
        expect(parseScreenerRows('TCS: P/E of 28.4 | ROE: 51.8%')).toEqual([]);
    });

    it('returns [] when a capitalised sentence merely contains a colon and number', () => {
        expect(parseScreenerRows(
            'Note: the market fell 2.3% today\nWarning: volatility of 18.5 is elevated'
        )).toEqual([]);
    });

    it('returns [] for empty, null and non-string input', () => {
        expect(parseScreenerRows('')).toEqual([]);
        expect(parseScreenerRows(null)).toEqual([]);
        expect(parseScreenerRows(undefined)).toEqual([]);
        expect(parseScreenerRows(42)).toEqual([]);
        expect(parseScreenerRows({})).toEqual([]);
    });

    it('never throws on adversarial input', () => {
        const nasty = ['::::', '|||', 'A'.repeat(5000), '\n\n\n', '**:**', '1. : of'];
        for (const s of nasty) {
            expect(() => parseScreenerRows(s)).not.toThrow();
        }
    });

    it('caps metrics per row so a card stays readable', () => {
        const rows = parseScreenerRows(
            'TCS: P/E of 1 | ROE: 2 | ROCE: 3 | Margin: 4 | Yield: 5 | Beta: 6\n' +
            'INFY: P/E of 1 | ROE: 2'
        );
        expect(rows[0].metrics.length).toBeLessThanOrEqual(4);
    });
});

describe('screenerProse', () => {
    it('keeps the lead-in and the takeaway, dropping the row lines and heading', () => {
        const { intro, outro } = screenerProse(REAL);
        expect(intro).toContain('Looking for sky-high valuations');
        expect(intro).not.toContain('LENSKART');
        // The takeaway is glued to the end of the last row line upstream.
        expect(outro).toContain('These three stand out');
    });

    it('returns empty strings for empty input', () => {
        expect(screenerProse('')).toEqual({ intro: '', outro: '' });
        expect(screenerProse(null)).toEqual({ intro: '', outro: '' });
    });
});
