// Chart indicators. Each one is computed from whatever candles the chart is
// currently showing, so switching D/W/M recalculates it on that timeframe's
// candles (BRD: "Indicators recalculated separately for each timeframe") — a
// 20 EMA on the weekly chart is 20 weeks, not 20 days resampled.
//
// All functions take an array of numbers and return an array of the same
// length, with null where the indicator is not yet defined (warm-up period).

export const sma = (values, period) => {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
    }
    return out;
};

// Seeded with the SMA of the first `period` values (the standard convention).
export const ema = (values, period) => {
    const out = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
};

// Wilder's RSI — same smoothing as the backend's technical engine.
export const rsi = (values, period = 14) => {
    const out = new Array(values.length).fill(null);
    if (values.length <= period) return out;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const ch = values[i] - values[i - 1];
        if (ch >= 0) gain += ch; else loss -= ch;
    }
    let avgG = gain / period;
    let avgL = loss / period;
    const val = () => (avgL === 0 ? (avgG === 0 ? 50 : 100) : 100 - 100 / (1 + avgG / avgL));
    out[period] = val();
    for (let i = period + 1; i < values.length; i++) {
        const ch = values[i] - values[i - 1];
        avgG = (avgG * (period - 1) + Math.max(ch, 0)) / period;
        avgL = (avgL * (period - 1) + Math.max(-ch, 0)) / period;
        out[i] = val();
    }
    return out;
};

export const macd = (values, fast = 12, slow = 26, signal = 9) => {
    const f = ema(values, fast);
    const s = ema(values, slow);
    const line = values.map((_, i) => (f[i] != null && s[i] != null ? f[i] - s[i] : null));
    const firstIdx = line.findIndex((v) => v != null);
    const sig = new Array(values.length).fill(null);
    if (firstIdx >= 0) {
        const e = ema(line.slice(firstIdx), signal);
        e.forEach((v, j) => { sig[firstIdx + j] = v; });
    }
    const hist = line.map((v, i) => (v != null && sig[i] != null ? v - sig[i] : null));
    return { line, signal: sig, hist };
};

export const bollinger = (values, period = 20, mult = 2) => {
    const mid = sma(values, period);
    const upper = new Array(values.length).fill(null);
    const lower = new Array(values.length).fill(null);
    for (let i = period - 1; i < values.length; i++) {
        let sq = 0;
        for (let j = i - period + 1; j <= i; j++) sq += (values[j] - mid[i]) ** 2;
        const sd = Math.sqrt(sq / period);
        upper[i] = mid[i] + mult * sd;
        lower[i] = mid[i] - mult * sd;
    }
    return { upper, mid, lower };
};

// Catalogue the chart's Indicators menu is built from. `pane: 'price'` draws
// over the candles; 'own' gets its own pane below.
export const INDICATOR_DEFS = {
    ema20: { label: 'EMA 20', pane: 'price', color: '#f59e0b' },
    ema50: { label: 'EMA 50', pane: 'price', color: '#3b82f6' },
    ema200: { label: 'EMA 200', pane: 'price', color: '#a855f7' },
    bb: { label: 'Bollinger Bands (20, 2)', short: 'BB 20', pane: 'price', color: '#64748b' },
    volume: { label: 'Volume', pane: 'own', color: '#94a3b8' },
    rsi: { label: 'RSI (14)', short: 'RSI 14', pane: 'own', color: '#8b5cf6' },
    macd: { label: 'MACD (12, 26, 9)', short: 'MACD', pane: 'own', color: '#0ea5e9' },
};

export const INDICATOR_ORDER = ['ema20', 'ema50', 'ema200', 'bb', 'volume', 'rsi', 'macd'];

/**
 * Compute every selected indicator on `bars`. Returns
 * { [id]: { lines: [{ key, values, color }], hist?: values } } aligned to bars.
 */
export const computeIndicators = (bars, selected) => {
    const closes = bars.map((b) => b.close);
    const out = {};
    for (const id of selected) {
        const def = INDICATOR_DEFS[id];
        if (!def) continue;
        if (id.startsWith('ema')) {
            out[id] = { lines: [{ key: id, values: ema(closes, Number(id.slice(3))), color: def.color }] };
        } else if (id === 'bb') {
            const b = bollinger(closes);
            out[id] = {
                lines: [
                    { key: 'bb_u', values: b.upper, color: def.color },
                    { key: 'bb_m', values: b.mid, color: def.color, dashed: true },
                    { key: 'bb_l', values: b.lower, color: def.color },
                ],
            };
        } else if (id === 'rsi') {
            out[id] = { lines: [{ key: 'rsi', values: rsi(closes), color: def.color }], levels: [70, 30] };
        } else if (id === 'macd') {
            const m = macd(closes);
            out[id] = {
                lines: [
                    { key: 'macd', values: m.line, color: def.color },
                    { key: 'macd_sig', values: m.signal, color: '#f97316' },
                ],
                hist: m.hist,
            };
        } else if (id === 'volume') {
            out[id] = { hist: bars.map((b) => (Number.isFinite(b.volume) && b.volume > 0 ? b.volume : null)) };
        }
    }
    return out;
};
