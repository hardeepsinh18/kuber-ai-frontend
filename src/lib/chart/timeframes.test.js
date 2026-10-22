import { describe, it, expect } from 'vitest';
import { toTimeframe, isPartialPeriod, istClock, formatPeriodLabel, RANGES_BY_TIMEFRAME } from './timeframes';

// Weekdays only, like real trading data. 2026-10-21 is a Wednesday.
const weekdays = (from, to) => {
    const out = [];
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86400000) {
        const dow = new Date(t).getUTCDay();
        if (dow >= 1 && dow <= 5) out.push(new Date(t).toISOString().slice(0, 10));
    }
    return out;
};
const barsFor = (dates) => dates.map((time, i) => ({
    time, open: 100 + i, high: 110 + i, low: 90 + i, close: 105 + i, volume: 1000,
}));

// 11:30 IST on Wed 21 Oct 2026 (market open).
const WED_MIDDAY = new Date('2026-10-21T06:00:00Z');
// 16:00 IST same day (after close).
const WED_EVENING = new Date('2026-10-21T10:30:00Z');

describe('toTimeframe — weekly', () => {
    const bars = barsFor(weekdays('2026-10-12', '2026-10-21')); // Mon 12 .. Wed 21

    it('groups Mon–Fri into one candle stamped with the first trading day', () => {
        const w = toTimeframe(bars, 'W', WED_MIDDAY);
        expect(w.map((c) => c.time)).toEqual(['2026-10-12', '2026-10-19']);
    });

    it('takes first open, max high, min low, last close and summed volume', () => {
        const [first] = toTimeframe(bars, 'W', WED_MIDDAY);
        // Week 1 = bars 0..4
        expect(first).toMatchObject({ open: 100, high: 114, low: 90, close: 109, volume: 5000 });
    });

    it('flags only the running week as partial', () => {
        const w = toTimeframe(bars, 'W', WED_MIDDAY);
        expect(w.map((c) => c.partial)).toEqual([false, true]);
    });

    it('a week is complete once its Friday session has closed', () => {
        const fullWeek = barsFor(weekdays('2026-10-19', '2026-10-23'));
        const friEvening = new Date('2026-10-23T10:30:00Z'); // 16:00 IST Fri
        const satMorning = new Date('2026-10-24T03:00:00Z');
        const friMidday = new Date('2026-10-23T06:00:00Z');
        expect(toTimeframe(fullWeek, 'W', friMidday).at(-1).partial).toBe(true);
        expect(toTimeframe(fullWeek, 'W', friEvening).at(-1).partial).toBe(false);
        expect(toTimeframe(fullWeek, 'W', satMorning).at(-1).partial).toBe(false);
    });
});

describe('toTimeframe — monthly', () => {
    const bars = barsFor(weekdays('2026-08-03', '2026-10-21'));

    it('one candle per month, stamped with the first trading day', () => {
        const m = toTimeframe(bars, 'M', WED_MIDDAY);
        expect(m.map((c) => c.time)).toEqual(['2026-08-03', '2026-09-01', '2026-10-01']);
        expect(m.map((c) => c.partial)).toEqual([false, false, true]);
    });

    it('high/low cover the whole month', () => {
        const aug = bars.filter((b) => b.time.startsWith('2026-08'));
        const [m] = toTimeframe(bars, 'M', WED_MIDDAY);
        expect(m.high).toBe(Math.max(...aug.map((b) => b.high)));
        expect(m.low).toBe(Math.min(...aug.map((b) => b.low)));
        expect(m.close).toBe(aug.at(-1).close);
    });

    it('month ending on a weekend is complete after its last weekday closes', () => {
        // Oct 2026 ends Sat 31; last session Fri 30.
        const sat31 = new Date('2026-10-31T06:00:00Z');
        expect(isPartialPeriod('2026-10-01', 'M', istClock(sat31))).toBe(false);
        const fri30 = new Date('2026-10-30T06:00:00Z');
        expect(isPartialPeriod('2026-10-01', 'M', istClock(fri30))).toBe(true);
    });
});

describe('toTimeframe — daily', () => {
    const bars = barsFor(weekdays('2026-10-19', '2026-10-21'));

    it('passes bars through and flags today only while the session is open', () => {
        const open = toTimeframe(bars, 'D', WED_MIDDAY);
        expect(open).toHaveLength(3);
        expect(open.map((b) => b.partial)).toEqual([false, false, true]);
        expect(toTimeframe(bars, 'D', WED_EVENING).at(-1).partial).toBe(false);
    });

    it('a stale last bar (not today) is never partial', () => {
        const old = barsFor(weekdays('2026-10-12', '2026-10-16'));
        expect(toTimeframe(old, 'D', WED_MIDDAY).at(-1).partial).toBe(false);
    });
});

describe('toTimeframe — robustness', () => {
    it('empty input -> empty output', () => {
        expect(toTimeframe([], 'W')).toEqual([]);
        expect(toTimeframe(null, 'M')).toEqual([]);
    });

    it('rows with only a close still aggregate', () => {
        const bars = [
            { time: '2026-10-12', open: null, high: null, low: null, close: 100, volume: null },
            { time: '2026-10-13', open: null, high: null, low: null, close: 120, volume: null },
        ];
        const [w] = toTimeframe(bars, 'W', WED_MIDDAY);
        expect(w).toMatchObject({ open: 100, high: 120, low: 100, close: 120, volume: null });
    });

    it('IST clock: 19:00 UTC is already the next IST day', () => {
        const c = istClock(new Date('2026-10-20T19:00:00Z'));
        expect(new Date(c.today).toISOString().slice(0, 10)).toBe('2026-10-21');
    });
});

describe('labels and ranges', () => {
    it('formats weekly and monthly crosshair labels', () => {
        expect(formatPeriodLabel('2026-10-19', 'W')).toBe("Week of 19 Oct '26");
        expect(formatPeriodLabel('2026-10-01', 'M')).toBe('Oct 2026');
    });

    it('every timeframe reaches back ~10 years or has its longest range ≥ 5Y', () => {
        expect(RANGES_BY_TIMEFRAME.W.at(-1).label).toBe('10Y');
        expect(RANGES_BY_TIMEFRAME.M.at(-1).label).toBe('10Y');
        expect(RANGES_BY_TIMEFRAME.D.map((r) => r.label)).toEqual(['1M', '3M', '6M', '1Y', '5Y']);
    });
});
