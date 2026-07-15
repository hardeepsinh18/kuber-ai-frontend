// Pure OHLC series transforms for StockChart — no React/DOM dependencies.
//
// Both transforms consume the chart data rows StockChart already builds:
//   { date, open, high, low, close, volume }
// Rows may have null open/high/low (sparse DB data); close is always present.

/**
 * Heikin-Ashi transform — smoothed candles that filter noise so trends read
 * as unbroken runs of one color.
 *   HA close = (O + H + L + C) / 4
 *   HA open  = midpoint of the previous HA bar (seeded from the first raw bar)
 *   HA high/low = extremes of raw H/L and the HA body
 */
export const toHeikinAshi = (data) => {
    const out = [];
    for (const d of data) {
        const o = d.open ?? d.close;
        const h = d.high ?? d.close;
        const l = d.low ?? d.close;
        const haClose = (o + h + l + d.close) / 4;
        const prev = out[out.length - 1];
        const haOpen = prev ? (prev.open + prev.close) / 2 : (o + d.close) / 2;
        out.push({
            date: d.date,
            open: haOpen,
            high: Math.max(h, haOpen, haClose),
            low: Math.min(l, haOpen, haClose),
            close: haClose,
            volume: d.volume,
            price: haClose,
        });
    }
    return out;
};

// Snap a raw ATR value to a "nice" brick size on the 1 / 2 / 2.5 / 5 ladder
// so the Renko grid lands on round rupee levels.
export const niceBrickSize = (x) => {
    if (!(x > 0)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(x)));
    const n = x / mag;
    const step = n < 1.5 ? 1 : n < 2.25 ? 2 : n < 3.75 ? 2.5 : n < 7.5 ? 5 : 10;
    return step * mag;
};

/**
 * Close-based Renko with the classic 2-brick reversal rule.
 *
 * Brick size defaults to ATR(14) snapped to a nice number. The last brick's
 * [bottom, top] bounds are one brick apart, so the same thresholds encode
 * both rules: continuation needs 1 brick beyond the last brick's far edge,
 * reversal needs 2 bricks from its near edge.
 *
 * Returns { bricks, brickSize } where each brick is
 * { idx, date, open, close, dir } — dir is +1 (up) or -1 (down), and date is
 * the bar on which the brick completed (several bricks can share a date).
 */
export const buildRenko = (data, brickSizeOverride = null) => {
    if (!data || data.length < 2) return { bricks: [], brickSize: 0 };

    let brickSize = brickSizeOverride;
    if (!brickSize) {
        const trs = [];
        for (let i = 1; i < data.length; i++) {
            const h = data[i].high ?? data[i].close;
            const l = data[i].low ?? data[i].close;
            const pc = data[i - 1].close;
            trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        }
        const window = trs.slice(-14);
        const atr = window.reduce((s, v) => s + v, 0) / window.length;
        brickSize = niceBrickSize(atr);
    }

    const bricks = [];
    // Seed a degenerate zero-height "brick" at the first close snapped to the
    // grid; the first real brick then needs a full 1-brick move either way.
    let top = Math.round(data[0].close / brickSize) * brickSize;
    let bottom = top;

    for (let i = 1; i < data.length; i++) {
        const c = data[i].close;
        const date = data[i].date;
        if (c >= top + brickSize) {
            while (c >= top + brickSize) {
                bricks.push({ idx: bricks.length, date, open: top, close: top + brickSize, dir: 1 });
                bottom = top;
                top += brickSize;
            }
        } else if (c <= bottom - brickSize) {
            while (c <= bottom - brickSize) {
                bricks.push({ idx: bricks.length, date, open: bottom, close: bottom - brickSize, dir: -1 });
                top = bottom;
                bottom -= brickSize;
            }
        }
    }

    return { bricks, brickSize };
};
