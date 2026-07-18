import { describe, it, expect } from 'vitest';
import { renkoData, renkoTickFormatter } from './renkoSeries';

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
