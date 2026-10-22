// Pure helpers for the market heat map: squarified treemap layout, the % change
// colour scale and number formatting. No React here so it's unit-testable.

export const INDEX_TABS = [
    { key: 'NIFTY50', label: 'Nifty 50' },
    { key: 'BANKNIFTY', label: 'Bank Nifty' },
];

export const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'];

// % move that saturates the colour, per timeframe — a 3% day is big, a 3% year isn't.
const SATURATION = { '1D': 3, '1W': 5, '1M': 8, '3M': 15, '6M': 20, '1Y': 30, YTD: 25 };

export const saturationFor = (tf) => SATURATION[tf] ?? 3;

const GREENS = ['#1f5f3a', '#1d7a43', '#16994d', '#0fb858'];
const REDS = ['#6b2a2a', '#8f2c2c', '#b62f2f', '#d93636'];
export const NEUTRAL = '#3f3f46';
export const MISSING = '#27272a';

// Bucketed (not continuous) like NSE's map: easier to read at a glance and every
// step in the legend corresponds to a colour that actually appears on screen.
export function colorFor(pct, tf = '1D') {
    if (pct == null || Number.isNaN(pct)) return MISSING;
    const sat = saturationFor(tf);
    if (Math.abs(pct) < sat * 0.05) return NEUTRAL;
    const step = Math.min(3, Math.floor((Math.abs(pct) / sat) * 4));
    return pct > 0 ? GREENS[step] : REDS[step];
}

export function legendStops(tf = '1D') {
    const sat = saturationFor(tf);
    return [-1, -0.5, 0, 0.5, 1].map((f) => ({ value: f * sat, color: colorFor(f * sat, tf) }));
}

export const formatPct = (pct) =>
    pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;

export const formatPrice = (p) =>
    p == null ? '—' : `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function formatVolume(v) {
    if (!v) return '—';
    if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
    return v.toLocaleString('en-IN');
}

// Squarified treemap (Bruls, Huizing & van Wijk). items: [{ value, data }].
// Returns [{ x, y, w, h, data }] tiling `rect` with areas proportional to value.
export function squarify(items, rect) {
    const usable = items.filter((i) => i.value > 0);
    const total = usable.reduce((s, i) => s + i.value, 0);
    if (!total || rect.w <= 0 || rect.h <= 0) return [];

    const scale = (rect.w * rect.h) / total;
    const nodes = usable
        .map((i) => ({ area: i.value * scale, data: i.data }))
        .sort((a, b) => b.area - a.area);

    const out = [];
    let { x, y, w, h } = rect;

    const worst = (row, side) => {
        let sum = 0, max = 0, min = Infinity;
        for (const n of row) {
            sum += n.area;
            if (n.area > max) max = n.area;
            if (n.area < min) min = n.area;
        }
        const s2 = sum * sum, side2 = side * side;
        return Math.max((side2 * max) / s2, s2 / (side2 * min));
    };

    const place = (row) => {
        const sum = row.reduce((s, n) => s + n.area, 0);
        if (w >= h) {
            const cw = sum / h;
            let cy = y;
            for (const n of row) {
                const ch = n.area / cw;
                out.push({ x, y: cy, w: cw, h: ch, data: n.data });
                cy += ch;
            }
            x += cw; w -= cw;
        } else {
            const rh = sum / w;
            let cx = x;
            for (const n of row) {
                const cw = n.area / rh;
                out.push({ x: cx, y, w: cw, h: rh, data: n.data });
                cx += cw;
            }
            y += rh; h -= rh;
        }
    };

    let row = [];
    let i = 0;
    while (i < nodes.length) {
        const side = Math.min(w, h);
        const next = [...row, nodes[i]];
        if (row.length === 0 || worst(next, side) <= worst(row, side)) {
            row = next;
            i += 1;
        } else {
            place(row);
            row = [];
        }
    }
    if (row.length) place(row);
    return out;
}

const SECTOR_HEADER = 18;

// Two-level layout: sectors tile the canvas, stocks tile each sector below a
// header strip (dropped when the sector box is too small to label).
export function layoutHeatmap(sectors, width, height) {
    // Unknown mcap still gets a (small) box rather than vanishing from the map.
    const weight = (m) => (m && m > 0 ? m : 1);
    const sectorRects = squarify(
        sectors.map((s) => ({ value: s.stocks.reduce((a, st) => a + weight(st.mcap), 0), data: s })),
        { x: 0, y: 0, w: width, h: height },
    );
    return sectorRects.map((r) => {
        const showHeader = r.h > SECTOR_HEADER * 2.5 && r.w > 70;
        const top = showHeader ? SECTOR_HEADER : 0;
        const stocks = squarify(
            r.data.stocks.map((st) => ({ value: weight(st.mcap), data: st })),
            { x: r.x, y: r.y + top, w: r.w, h: r.h - top },
        );
        return { ...r, showHeader, headerHeight: top, stocks };
    });
}
