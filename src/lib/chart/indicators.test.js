import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd, bollinger, computeIndicators } from './indicators';

const close = (arr) => arr.map((c, i) => ({ time: `2026-01-${String(i + 1).padStart(2, '0')}`, open: c, close: c, volume: 10 }));

describe('moving averages', () => {
    it('sma warms up then averages the window', () => {
        expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    });

    it('ema seeds with the SMA and then smooths', () => {
        const e = ema([1, 2, 3, 4, 5], 3);
        expect(e.slice(0, 2)).toEqual([null, null]);
        expect(e[2]).toBe(2);
        expect(e[3]).toBeCloseTo(3); // 4*0.5 + 2*0.5
        expect(e[4]).toBeCloseTo(4);
    });

    it('too little data -> all null', () => {
        expect(ema([1, 2], 5)).toEqual([null, null]);
    });
});

describe('rsi', () => {
    it('is 100 on a straight rise and 0 on a straight fall', () => {
        const up = Array.from({ length: 30 }, (_, i) => 100 + i);
        const down = Array.from({ length: 30 }, (_, i) => 200 - i);
        expect(rsi(up).at(-1)).toBe(100);
        expect(rsi(down).at(-1)).toBe(0);
        expect(rsi(up)[13]).toBeNull();
        expect(rsi(up)[14]).not.toBeNull();
    });

    it('stays within 0..100', () => {
        const zig = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 10);
        for (const v of rsi(zig).filter((x) => x != null)) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
        }
    });
});

describe('macd / bollinger', () => {
    it('macd histogram = line - signal once both exist', () => {
        const vals = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5 + Math.sin(i));
        const m = macd(vals);
        const i = 59;
        expect(m.hist[i]).toBeCloseTo(m.line[i] - m.signal[i]);
        expect(m.signal[25 + 7]).toBeNull();
        expect(m.signal[25 + 8]).not.toBeNull();
    });

    it('bollinger bands are symmetric around the SMA', () => {
        const vals = Array.from({ length: 25 }, (_, i) => 100 + (i % 3));
        const b = bollinger(vals);
        const i = 24;
        expect(b.upper[i] - b.mid[i]).toBeCloseTo(b.mid[i] - b.lower[i]);
        expect(b.upper[18]).toBeNull();
    });
});

describe('computeIndicators', () => {
    it('computes only what is selected, aligned to the bars', () => {
        const bars = close(Array.from({ length: 30 }, (_, i) => 100 + i));
        const out = computeIndicators(bars, ['ema20', 'rsi', 'volume']);
        expect(Object.keys(out).sort()).toEqual(['ema20', 'rsi', 'volume']);
        expect(out.ema20.lines[0].values).toHaveLength(30);
        expect(out.rsi.levels).toEqual([70, 30]);
        expect(out.volume.hist.every((v) => v === 10)).toBe(true);
    });

    it('recalculates per timeframe: same id on different candles gives different values', () => {
        const daily = close(Array.from({ length: 40 }, (_, i) => 100 + i));
        const weekly = close(Array.from({ length: 40 }, (_, i) => 100 + i * 5));
        const d = computeIndicators(daily, ['ema20']).ema20.lines[0].values.at(-1);
        const w = computeIndicators(weekly, ['ema20']).ema20.lines[0].values.at(-1);
        expect(d).not.toBeCloseTo(w);
    });

    it('ignores unknown ids', () => {
        expect(computeIndicators(close([1, 2, 3]), ['nope'])).toEqual({});
    });
});
