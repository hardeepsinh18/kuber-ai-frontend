import { describe, it, expect } from 'vitest';
import {
    squarify, layoutHeatmap, colorFor, MISSING, NEUTRAL, formatPct, formatVolume,
} from './heatmapLayout';

const area = (r) => r.w * r.h;

describe('squarify', () => {
    it('tiles the rect with areas proportional to value', () => {
        const rects = squarify(
            [{ value: 6, data: 'a' }, { value: 3, data: 'b' }, { value: 1, data: 'c' }],
            { x: 0, y: 0, w: 100, h: 50 },
        );
        expect(rects).toHaveLength(3);
        const total = rects.reduce((s, r) => s + area(r), 0);
        expect(total).toBeCloseTo(5000, 6);
        const byData = Object.fromEntries(rects.map((r) => [r.data, area(r)]));
        expect(byData.a).toBeCloseTo(3000, 6);
        expect(byData.c).toBeCloseTo(500, 6);
        for (const r of rects) {
            expect(r.x).toBeGreaterThanOrEqual(-1e-9);
            expect(r.y).toBeGreaterThanOrEqual(-1e-9);
            expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-9);
            expect(r.y + r.h).toBeLessThanOrEqual(50 + 1e-9);
        }
    });

    it('drops zero/negative values and handles empty input', () => {
        expect(squarify([], { x: 0, y: 0, w: 10, h: 10 })).toEqual([]);
        expect(squarify([{ value: 0, data: 1 }, { value: 2, data: 2 }], { x: 0, y: 0, w: 10, h: 10 }))
            .toHaveLength(1);
    });
});

describe('layoutHeatmap', () => {
    it('keeps stocks inside their sector, below the header strip', () => {
        const sectors = [
            { name: 'Banks', stocks: [{ symbol: 'A', mcap: 300 }, { symbol: 'B', mcap: 100 }] },
            { name: 'IT', stocks: [{ symbol: 'C', mcap: 200 }, { symbol: 'D', mcap: null }] },
        ];
        const out = layoutHeatmap(sectors, 800, 500);
        expect(out).toHaveLength(2);
        for (const s of out) {
            for (const st of s.stocks) {
                expect(st.y).toBeGreaterThanOrEqual(s.y + s.headerHeight - 1e-9);
                expect(st.x + st.w).toBeLessThanOrEqual(s.x + s.w + 1e-9);
            }
        }
        // mcap-less stock still gets a box
        expect(out.flatMap((s) => s.stocks).map((s) => s.data.symbol)).toContain('D');
    });
});

describe('colorFor', () => {
    it('separates gain, loss, flat and missing', () => {
        expect(colorFor(null)).toBe(MISSING);
        expect(colorFor(0.01)).toBe(NEUTRAL);
        expect(colorFor(2)).not.toBe(colorFor(-2));
        // saturates: 3% and 10% on a day are the same deepest shade
        expect(colorFor(3)).toBe(colorFor(10));
        // a 3% move over a year is mild, not saturated
        expect(colorFor(3, '1Y')).not.toBe(colorFor(3, '1D'));
    });

    it('gets deeper (darker) as the move grows, on both sides', () => {
        const luminance = (hex) => {
            const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        for (const sign of [1, -1]) {
            const shades = [0.5, 1.2, 2, 3].map((p) => luminance(colorFor(sign * p)));
            for (let i = 1; i < shades.length; i += 1) expect(shades[i]).toBeLessThan(shades[i - 1]);
        }
        // the reported case: +3% must read deeper than +2%
        expect(luminance(colorFor(3))).toBeLessThan(luminance(colorFor(2)));
    });
});

describe('formatters', () => {
    it('formats % and Indian volume units', () => {
        expect(formatPct(1.234)).toBe('+1.23%');
        expect(formatPct(-0.5)).toBe('-0.50%');
        expect(formatPct(null)).toBe('—');
        expect(formatVolume(2_50_00_000)).toBe('2.50 Cr');
        expect(formatVolume(3_40_000)).toBe('3.40 L');
    });
});
