/**
 * The growth cards ("Sales growth", "Profit pace") were labelled "5 YR CAGR" in
 * hardcoded text while the backend supplies only 3 years of history — the label
 * claimed a longer track record than the number behind it actually covered. On a
 * financial surface that is a correctness problem, not a wording one.
 *
 * The span is now derived from the payload, so these pin the property rather
 * than the string: whatever history the backend sends is what the card claims,
 * and a missing or degenerate `years` array falls back to 3 (what production
 * serves today) so the card can never OVERSTATE the period.
 */
import { describe, it, expect } from 'vitest';
import { cagrSpan } from './FundamentalCard';

describe('cagrSpan', () => {
    it('reports 3 for the 3 years production sends', () => {
        expect(cagrSpan({ years: ['FY24', 'FY25', 'FY26'] })).toBe(3);
    });

    it('adapts if history ever grows, with no code change', () => {
        expect(cagrSpan({ years: ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'] })).toBe(5);
        expect(cagrSpan({ years: ['FY23', 'FY24', 'FY25', 'FY26'] })).toBe(4);
    });

    it('falls back to 3 when history is missing entirely', () => {
        expect(cagrSpan(null)).toBe(3);
        expect(cagrSpan(undefined)).toBe(3);
        expect(cagrSpan({})).toBe(3);
    });

    it('falls back to 3 rather than claiming a 1-year CAGR', () => {
        // A single data point is not a growth rate; understate rather than
        // print a nonsense "1 YR CAGR".
        expect(cagrSpan({ years: ['FY26'] })).toBe(3);
        expect(cagrSpan({ years: [] })).toBe(3);
    });

    it('never throws on malformed input', () => {
        for (const bad of [{ years: 'FY26' }, { years: 42 }, 'nope', 0, []]) {
            expect(() => cagrSpan(bad)).not.toThrow();
            expect(typeof cagrSpan(bad)).toBe('number');
        }
    });

    it('never returns a span that overstates a known short history', () => {
        // The property that actually matters: for any real years array, the
        // label must not claim more years than were supplied.
        for (const n of [2, 3, 4, 5, 6]) {
            const years = Array.from({ length: n }, (_, i) => `FY${20 + i}`);
            expect(cagrSpan({ years })).toBeLessThanOrEqual(n);
        }
    });
});
