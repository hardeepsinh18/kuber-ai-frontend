// Daily / weekly / monthly candles (BRD: Multi-Timeframe Candles).
//
// Weekly and monthly candles are built here from the daily series, so all
// three timeframes come from one set of numbers and can never disagree. Each
// aggregated candle is stamped with the date of its FIRST trading day (the
// TradingView convention) — a Sunday/month-end stamp would put the running
// candle at a date that hasn't happened yet.
//
// The candle whose period is still trading (today's session, this week, this
// month) is flagged `partial: true` so the chart can draw it as incomplete.
// "Still trading" = a weekday session remains in the period, counting today
// until the 15:30 IST close. NSE holidays are not modelled: on a holiday the
// running candle just stays flagged until the period's last weekday passes.

export const TIMEFRAMES = ['D', 'W', 'M'];

export const TIMEFRAME_DEFS = {
    D: { label: 'D', name: 'Daily', unit: 'day', partialLabel: 'Session in progress' },
    W: { label: 'W', name: 'Weekly', unit: 'week', partialLabel: 'Week in progress' },
    M: { label: 'M', name: 'Monthly', unit: 'month', partialLabel: 'Month in progress' },
};

// Range chips per timeframe, as a count of that timeframe's candles. 1M on a
// monthly chart would be a single candle, so each timeframe gets ranges that
// make sense for it.
export const RANGES_BY_TIMEFRAME = {
    D: [
        { label: '1M', bars: 22 },
        { label: '3M', bars: 66 },
        { label: '6M', bars: 132 },
        { label: '1Y', bars: 252 },
        { label: '5Y', bars: 1260 },
    ],
    W: [
        { label: '1Y', bars: 52 },
        { label: '3Y', bars: 156 },
        { label: '5Y', bars: 260 },
        { label: '10Y', bars: 522 },
    ],
    M: [
        { label: '3Y', bars: 36 },
        { label: '5Y', bars: 60 },
        { label: '10Y', bars: 120 },
    ],
};

export const DEFAULT_RANGE_BY_TIMEFRAME = { D: 66, W: 156, M: 120 };

const IST_OFFSET_MS = 330 * 60 * 1000;
const CLOSE_MINUTES = 15 * 60 + 30; // NSE close, 15:30 IST

const DAY_MS = 86400000;
const parseDay = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const isWeekday = (ms) => {
    const dow = new Date(ms).getUTCDay();
    return dow >= 1 && dow <= 5;
};

// Today's IST calendar date (UTC-midnight ms) and minutes since IST midnight.
export const istClock = (now = new Date()) => {
    const shifted = new Date(now.getTime() + IST_OFFSET_MS);
    const today = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
    return { today, minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
};

// Monday of the ISO week containing `ms`.
const weekStart = (ms) => {
    const dow = new Date(ms).getUTCDay(); // 0 = Sun
    return ms - ((dow + 6) % 7) * DAY_MS;
};
const monthStart = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const monthEnd = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - DAY_MS;
};

const periodBounds = (ms, tf) => {
    if (tf === 'W') {
        const s = weekStart(ms);
        return [s, s + 6 * DAY_MS];
    }
    if (tf === 'M') return [monthStart(ms), monthEnd(ms)];
    return [ms, ms];
};

// Is a session still to come (or still open) within [today, periodEnd]?
const sessionRemaining = (periodEnd, clock) => {
    if (isWeekday(clock.today) && clock.minutes < CLOSE_MINUTES) return true;
    for (let d = clock.today + DAY_MS; d <= periodEnd; d += DAY_MS) {
        if (isWeekday(d)) return true;
    }
    return false;
};

// Whether the period that starts with candle time `time` is still trading.
export const isPartialPeriod = (time, tf, clock) => {
    const [start, end] = periodBounds(parseDay(time), tf);
    if (clock.today < start || clock.today > end) return false;
    return sessionRemaining(end, clock);
};

const bucketKey = (ms, tf) => (tf === 'W' ? weekStart(ms) : tf === 'M' ? monthStart(ms) : ms);

const num = (v) => (Number.isFinite(v) ? v : null);

/**
 * Daily bars ({time, open, high, low, close, volume}, sorted) -> candles for
 * timeframe `tf`, each carrying `partial`. Daily bars pass through unchanged
 * apart from the flag.
 */
export const toTimeframe = (dailyBars, tf = 'D', now = new Date()) => {
    if (!Array.isArray(dailyBars) || !dailyBars.length) return [];
    const clock = istClock(now);

    if (tf === 'D') {
        const last = dailyBars.length - 1;
        return dailyBars.map((b, i) => (
            i === last ? { ...b, partial: isPartialPeriod(b.time, 'D', clock) } : { ...b, partial: false }
        ));
    }

    const out = [];
    let cur = null;
    let curKey = null;
    for (const b of dailyBars) {
        const key = bucketKey(parseDay(b.time), tf);
        const o = num(b.open) ?? b.close;
        const h = num(b.high) ?? b.close;
        const l = num(b.low) ?? b.close;
        if (key !== curKey) {
            if (cur) out.push(cur);
            curKey = key;
            cur = { time: b.time, open: o, high: h, low: l, close: b.close, volume: num(b.volume) ?? 0 };
        } else {
            cur.high = Math.max(cur.high, h);
            cur.low = Math.min(cur.low, l);
            cur.close = b.close;
            cur.volume += num(b.volume) ?? 0;
        }
    }
    if (cur) out.push(cur);

    return out.map((c, i) => ({
        ...c,
        volume: c.volume || null,
        partial: i === out.length - 1 && isPartialPeriod(c.time, tf, clock),
    }));
};

// Crosshair label for an aggregated candle: "Week of 13 Oct '26" / "Oct 2026".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatPeriodLabel = (time, tf) => {
    const d = new Date(parseDay(time));
    if (tf === 'M') return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const yy = String(d.getUTCFullYear()).slice(2);
    return `Week of ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} '${yy}`;
};
