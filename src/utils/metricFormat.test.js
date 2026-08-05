import { describe, it, expect } from 'vitest';
import { fmtNum, fmtPct, fmtMultiple, fmtRatio, METRIC_DECIMALS } from './metricFormat';

describe('metricFormat', () => {
    it('keeps both decimals instead of rounding to a whole number', () => {
        // The reported bug: an ROE of 51.7981 rendered as "₹52" and "+52% PER YEAR"
        // inside the Money-engine visual (Math.round) while the tile footer read
        // "51.80%". One formatter, one answer.
        expect(fmtPct(51.7981)).toBe('51.80%');
        expect(fmtNum(51.7981)).toBe('51.80');
    });

    it('does not drop a real digit the way 1-decimal rounding did', () => {
        expect(fmtPct(8.91)).toBe('8.91%');   // was "8.9%"
        expect(fmtPct(51.8)).toBe('51.80%');
    });

    it('formats units consistently', () => {
        expect(fmtMultiple(23.2)).toBe('23.20x');
        expect(fmtRatio(0.34)).toBe('0.34');
        expect(fmtPct(0)).toBe('0.00%');
        expect(fmtPct(-4.5)).toBe('-4.50%');
    });

    it('returns null for values it cannot render, so callers skip the row', () => {
        for (const bad of [null, undefined, '', 'n/a', NaN, Infinity, -Infinity]) {
            expect(fmtNum(bad)).toBeNull();
            expect(fmtPct(bad)).toBeNull();
            expect(fmtMultiple(bad)).toBeNull();
        }
    });

    it('accepts numeric strings from the API', () => {
        expect(fmtPct('51.7981')).toBe('51.80%');
    });

    it('the ROE visual and the tile footer derive from the same number', () => {
        // ROEViz prints fmtNum(roe) for "₹{profit}" and "+{profit}% PER YEAR";
        // the MetricCard footer prints fmtPct(roe). The digits must match.
        const roe = 51.7981;
        expect(fmtPct(roe)).toBe(`${fmtNum(roe)}%`);
    });

    it('exposes the shared precision so surfaces cannot drift apart', () => {
        expect(METRIC_DECIMALS).toBe(2);
    });
});
