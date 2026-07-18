import { describe, it, expect } from 'vitest';
import { renkoData, renkoTickFormatter, renkoVisibleRange } from './renkoSeries';

const bricks = [
    { idx: 0, date: '2026-07-01', open: 100, close: 110, dir: 1 },
    { idx: 1, date: '2026-07-01', open: 110, close: 120, dir: 1 },
    { idx: 2, date: '2026-07-02', open: 120, close: 110, dir: -1 },
];

describe('renkoData', () => {
    it('assigns unique ascending synthetic times to same-day bricks', () => {
        const data = renkoData(bricks);
        const times = data.map((d) => d.time);
        expect(new Set(times).size).toBe(3);
        expect([...times].sort()).toEqual(times);
    });

    it('preserves the real completion date and direction', () => {
        const data = renkoData(bricks);
        expect(data[1].realDate).toBe('2026-07-01');
        expect(data[2].dir).toBe(-1);
    });

    it('returns an empty array for no bricks', () => {
        expect(renkoData([])).toEqual([]);
    });
});

describe('renkoTickFormatter', () => {
    it('maps a synthetic time back to the real date label', () => {
        const data = renkoData(bricks);
        const fmt = renkoTickFormatter(data);
        expect(fmt(data[1].time)).toBe("Wed 1 Jul '26");
    });

    it('returns an empty string for an unknown time', () => {
        expect(renkoTickFormatter(renkoData(bricks))('1999-01-01')).toBe('');
    });
});

describe('renkoVisibleRange', () => {
    const bars = Array.from({ length: 10 }, (_, i) => ({ time: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    const bricks = [
        { idx: 0, date: '2026-07-02', open: 100, close: 110, dir: 1 },
        { idx: 1, date: '2026-07-04', open: 110, close: 120, dir: 1 },
        { idx: 2, date: '2026-07-07', open: 120, close: 110, dir: -1 },
        { idx: 3, date: '2026-07-09', open: 110, close: 100, dir: -1 },
    ];

    it('returns null when there are no bricks', () => {
        expect(renkoVisibleRange([], bars, 3)).toBeNull();
    });

    it('spans all bricks when the range covers the whole history', () => {
        expect(renkoVisibleRange(bricks, bars, 10)).toEqual({ from: 0, to: 3 });
    });

    it('windows bricks by DATE cutoff, not by brick count', () => {
        // range 3 -> cutoff = bars[10-3] = bars[7] = '2026-07-08'; only the 07-09 brick (index 3) qualifies
        expect(renkoVisibleRange(bricks, bars, 3)).toEqual({ from: 3, to: 3 });
    });

    it('falls back to the full brick span when bars are missing', () => {
        expect(renkoVisibleRange(bricks, [], 3)).toEqual({ from: 0, to: 3 });
        expect(renkoVisibleRange(bricks, bars, 0)).toEqual({ from: 0, to: 3 });
    });
});
