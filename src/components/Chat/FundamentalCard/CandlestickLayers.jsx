/* ─── Mini SVG candlestick chart ─────────────────────────────────────────── */
const CANDLE_PRESETS = {
    'Hammer':           [{ o:78,h:82,l:35,c:76 },{ o:76,h:79,l:60,c:72 },{ o:72,h:74,l:25,c:71 }],
    'Inverted Hammer':  [{ o:60,h:64,l:55,c:58 },{ o:58,h:62,l:52,c:56 },{ o:56,h:90,l:54,c:58 }],
    'Doji':             [{ o:65,h:74,l:57,c:68 },{ o:68,h:76,l:62,c:65 },{ o:65,h:80,l:50,c:65 }],
    'Engulfing':        [{ o:72,h:75,l:66,c:68 },{ o:65,h:76,l:62,c:74 }],
    'Morning Star':     [{ o:78,h:80,l:70,c:72 },{ o:70,h:72,l:62,c:64 },{ o:66,h:78,l:64,c:76 }],
    'Dark Cloud Cover': [{ o:62,h:74,l:60,c:72 },{ o:78,h:80,l:62,c:63 }],
    'Shooting Star':    [{ o:60,h:64,l:55,c:62 },{ o:62,h:66,l:58,c:64 },{ o:64,h:92,l:62,c:63 }],
    'Inside Bar':       [{ o:56,h:80,l:50,c:72 },{ o:68,h:76,l:60,c:63 }],
    '_default':         [{ o:62,h:74,l:58,c:70 },{ o:70,h:78,l:65,c:74 },{ o:74,h:80,l:68,c:72 }],
};

export const CandleChart = ({ patternName }) => {
    const candles = CANDLE_PRESETS[patternName] ?? CANDLE_PRESETS['_default'];
    const W = 100, H = 62, padX = 8, padY = 6;
    const n = candles.length;
    const slotW = (W - padX * 2) / n;
    const bodyW = slotW * 0.55;
    const mapY  = (v) => padY + ((100 - v) / 100) * (H - padY * 2);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 54, display: 'block' }}>
            {candles.map((c, i) => {
                const cx = padX + i * slotW + slotW / 2;
                const isBull = c.c >= c.o;
                const clr = isBull ? '#22c55e' : '#ef4444';
                const top = mapY(Math.max(c.o, c.c));
                const bot = mapY(Math.min(c.o, c.c));
                const bh  = Math.max(bot - top, 2);
                return (
                    <g key={i}>
                        <line x1={cx} y1={mapY(c.h)} x2={cx} y2={mapY(c.l)} stroke={clr} strokeWidth={1.5} />
                        <rect x={cx - bodyW / 2} y={top} width={bodyW} height={bh} fill={clr} rx={1} />
                    </g>
                );
            })}
        </svg>
    );
};

/* ─── Real mini candlestick layer for pattern cards ─────────────────────── */
export const MiniCandleLayer = ({ xAxisMap, yAxisMap, data }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;
    const bandwidth = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 8;
    const halfW = Math.max(bandwidth * 0.42, 2);
    return (
        <g>
            {data.map((pt, i) => {
                if (pt.open == null || pt.close == null || pt.high == null || pt.low == null) return null;
                const isBull = pt.close >= pt.open;
                const color = isBull ? '#26a69a' : '#ef5350';
                const xPos = xAxis.scale(pt.date);
                if (xPos == null || isNaN(xPos)) return null;
                const cx = xPos + bandwidth / 2;
                const yH = yAxis.scale(pt.high);
                const yL = yAxis.scale(pt.low);
                const bodyTop = yAxis.scale(Math.max(pt.open, pt.close));
                const bodyBot = yAxis.scale(Math.min(pt.open, pt.close));
                if ([yH, yL, bodyTop, bodyBot].some(v => v == null || isNaN(v))) return null;
                const bodyH = Math.max(Math.abs(bodyBot - bodyTop), 1.5);
                return (
                    <g key={i}>
                        <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth={1.2} opacity={0.9} />
                        <rect x={cx - halfW} y={bodyTop} width={halfW * 2} height={bodyH}
                              fill={color} stroke={color} strokeWidth={0.5} rx={0.5} />
                    </g>
                );
            })}
        </g>
    );
};

/* ─── Hollow ring around the pattern's candle group (Recharts <Customized>) ─── */
// Draws a single amber ellipse enclosing all candles whose date is in
// `patternDates` (wick + body), replacing the old vertical column highlight.
export const PatternCircleLayer = ({ xAxisMap, yAxisMap, data = [], patternDates }) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length || !patternDates) return null;
    const want = patternDates instanceof Set ? patternDates : new Set(patternDates);
    if (!want.size) return null;
    const bandwidth = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 8;
    const half = bandwidth / 2;
    const xs = [], highs = [], lows = [];
    data.forEach(d => {
        if (!want.has(d.date)) return;
        const x = xAxis.scale(d.date);
        if (x == null || isNaN(x)) return;
        xs.push(x + half);
        if (d.high != null) highs.push(d.high);
        if (d.low != null) lows.push(d.low);
    });
    if (!xs.length || !highs.length || !lows.length) return null;
    const yTop = yAxis.scale(Math.max(...highs));
    const yBot = yAxis.scale(Math.min(...lows));
    if ([yTop, yBot].some(v => v == null || isNaN(v))) return null;
    const padX = half + 4;
    const padY = 6;
    const x0 = Math.min(...xs) - padX;
    const x1 = Math.max(...xs) + padX;
    const cx = (x0 + x1) / 2;
    const cy = (yTop + yBot) / 2;
    const rx = Math.max((x1 - x0) / 2, 6);
    const ry = Math.max(Math.abs(yBot - yTop) / 2 + padY, 8);
    return (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
                 fill="none" stroke="#FDD405" strokeWidth={1.6} opacity={0.9} />
    );
};
