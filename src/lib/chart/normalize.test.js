import { describe, it, expect } from 'vitest';
import { normalizeOhlc, toAreaData, toCandleData } from './normalize';

const chartData = {
    dates: ['2026-07-01', '2026-07-02', '2026-07-03'],
    open: [100, 102, 104],
    high: [105, 106, 108],
    low: [99, 101, 103],
    close: [102, 104, 106],
    volume: [1000, 2000, 3000],
};

describe('normalizeOhlc', () => {
    it('maps parallel arrays into LWC bars', () => {
        expect(normalizeOhlc(chartData)).toEqual([
            { time: '2026-07-01', open: 100, high: 105, low: 99, close: 102, volume: 1000 },
            { time: '2026-07-02', open: 102, high: 106, low: 101, close: 104, volume: 2000 },
            { time: '2026-07-03', open: 104, high: 108, low: 103, close: 106, volume: 3000 },
        ]);
    });

    it('drops rows with zero or null close', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01', '2026-07-02', '2026-07-03'],
            open: [100, 0, 104], high: [105, 0, 108], low: [99, 0, 103],
            close: [102, 0, null], volume: [1000, 0, 3000],
        });
        expect(bars).toHaveLength(1);
        expect(bars[0].time).toBe('2026-07-01');
    });

    it('sorts ascending by time', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-03', '2026-07-01', '2026-07-02'],
            open: [104, 100, 102], high: [108, 105, 106], low: [103, 99, 101],
            close: [106, 102, 104], volume: [3000, 1000, 2000],
        });
        expect(bars.map(b => b.time)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    });

    it('dedupes by time, keeping the last occurrence', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01', '2026-07-01'],
            open: [100, 200], high: [105, 205], low: [99, 199],
            close: [102, 202], volume: [1000, 2000],
        });
        expect(bars).toHaveLength(1);
        expect(bars[0].close).toBe(202);
    });

    it('truncates timestamps to a calendar day', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01T09:15:00'],
            open: [100], high: [105], low: [99], close: [102], volume: [1000],
        });
        expect(bars[0].time).toBe('2026-07-01');
    });

    it('returns an empty array for null or error chartData', () => {
        expect(normalizeOhlc(null)).toEqual([]);
        expect(normalizeOhlc({ error: 'boom' })).toEqual([]);
        expect(normalizeOhlc({})).toEqual([]);
    });

    it('tolerates a missing volume array', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01'], open: [100], high: [105], low: [99], close: [102],
        });
        expect(bars[0].volume).toBeNull();
    });
});

describe('toAreaData', () => {
    it('projects close onto value', () => {
        expect(toAreaData(normalizeOhlc(chartData))[0]).toEqual({ time: '2026-07-01', value: 102 });
    });

    it('keeps rows with null OHLC — area only needs close', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01'], close: [102], volume: [1000],
        });
        expect(toAreaData(bars)).toEqual([{ time: '2026-07-01', value: 102 }]);
    });
});

describe('toCandleData', () => {
    it('drops volume and keeps OHLC', () => {
        expect(toCandleData(normalizeOhlc(chartData))[0]).toEqual({
            time: '2026-07-01', open: 100, high: 105, low: 99, close: 102,
        });
    });

    it('drops rows with a null open, high or low so LWC never sees null OHLC', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'],
            open: [100, null, 104, 106],
            high: [105, 106, null, 111],
            low: [99, 101, 103, null],
            close: [102, 104, 106, 108],
            volume: [1000, 2000, 3000, 4000],
        });
        // normalizeOhlc keeps all four rows — every close is valid and positive.
        expect(bars).toHaveLength(4);
        // toCandleData keeps only the row with a complete OHLC set.
        const candles = toCandleData(bars);
        expect(candles).toHaveLength(1);
        expect(candles[0].time).toBe('2026-07-01');
    });

    it('tolerates a missing open/high/low array entirely', () => {
        const bars = normalizeOhlc({
            dates: ['2026-07-01'], close: [102], volume: [1000],
        });
        expect(bars).toHaveLength(1);
        expect(toCandleData(bars)).toHaveLength(0);
    });
});
