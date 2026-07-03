import React from 'react';

/**
 * PatternAnnotationLayer
 * ──────────────────────
 * SVG overlay that draws chart-pattern geometry inside a Recharts chart via
 * <Customized>. Renders, per the detected pattern's `annotations`:
 *   - trendlines : sloped lines anchored to pivot points (e.g. descending
 *                  triangle = flat support + descending upper line, H&S neckline)
 *   - hlines     : horizontal levels (neckline / support / resistance / target / stop)
 *   - markers    : labelled pivots (Left Shoulder / Head / Right Shoulder, Top 1/2 …)
 *   - curve      : smooth polyline for rounding bottom
 *
 * Rules (per product spec):
 *   - Lines are confined to the PATTERN REGION: from `window_start_date` (or the
 *     first pivot) to the chart's right edge (now). Never full-width across all
 *     history, so they don't slice through unrelated candles.
 *   - No price-text on the lines (prices live in the pattern caption). No fill.
 *
 * Shared by StockChart (in-chat) and FundamentalCard (expanded modal).
 */

const TREND_COLOR = '#4FC3F7';

const PatternAnnotationLayer = ({
    xAxisMap,
    yAxisMap,
    trendlines = [],
    hlines = [],
    markers = [],
    curve = [],
    skeleton = [],
    neckline = null,
    windowStartDate = null,
    data = [],
}) => {
    const xAxis = xAxisMap && (xAxisMap[0] ?? xAxisMap['0'] ?? Object.values(xAxisMap)[0]);
    const yAxis = yAxisMap && (yAxisMap[0] ?? yAxisMap['0'] ?? Object.values(yAxisMap)[0]);
    if (!xAxis?.scale || !yAxis?.scale || !data?.length) return null;

    const bandwidth = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 0;
    const half = bandwidth / 2;

    // date → center-x pixel map for the bars actually plotted
    const dateX = {};
    data.forEach(d => {
        const x = xAxis.scale(d.date);
        if (x != null && !isNaN(x)) dateX[d.date] = x + half;
    });
    const dateList = Object.keys(dateX);
    if (!dateList.length) return null;

    const getX = (target) => {
        if (target == null) return null;
        if (dateX[target] != null) return dateX[target];
        // nearest-date fallback (annotation date may not be an exact bar date)
        let best = null, bestD = Infinity;
        for (const d of dateList) {
            const diff = Math.abs(+new Date(d) - +new Date(target));
            if (diff < bestD) { bestD = diff; best = d; }
        }
        return best != null ? dateX[best] : null;
    };

    const cLeft  = xAxis.x ?? 0;
    const cRight = (xAxis.x ?? 0) + (xAxis.width ?? 0);
    // Left boundary of the pattern region (fallback: chart left edge)
    const winX = windowStartDate ? getX(windowStartDate) : cLeft;
    const leftBound = Math.max(cLeft, winX ?? cLeft);

    return (
        <g>
            {/* Smooth curve (rounding bottom) */}
            {curve.length >= 2 && (() => {
                const pts = curve
                    .map(p => ({ x: getX(p.date), y: yAxis.scale(p.price) }))
                    .filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y));
                if (pts.length < 2) return null;
                const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                return (
                    <path d={dPath} fill="none" stroke={TREND_COLOR} strokeWidth={1.6}
                          opacity={0.9} strokeLinecap="round" strokeLinejoin="round" />
                );
            })()}

            {/* Sloped trendlines — from the first pivot, extended to the right edge (now) */}
            {trendlines.map((tl, i) => {
                if (!tl?.length || tl.length < 2) return null;
                const x1 = getX(tl[0].date), x2 = getX(tl[1].date);
                const y1 = yAxis.scale(tl[0].price), y2 = yAxis.scale(tl[1].price);
                if ([x1, x2, y1, y2].some(v => v == null || isNaN(v))) return null;
                const slope = x2 !== x1 ? (y2 - y1) / (x2 - x1) : 0;
                const startX = Math.max(leftBound, Math.min(x1, x2));
                const startY = y1 + slope * (startX - x1);
                const endY = y1 + slope * (cRight - x1);
                return (
                    <line key={`tl${i}`} x1={startX} y1={startY} x2={cRight} y2={endY}
                          stroke={tl[0].color || TREND_COLOR} strokeWidth={1.6}
                          opacity={0.9} strokeLinecap="round" />
                );
            })}

            {/* Blue skeleton — traces the pattern's swings so the shape is obvious */}
            {skeleton.length >= 2 && (() => {
                const pts = skeleton
                    .map(p => ({ x: getX(p.date), y: yAxis.scale(p.price) }))
                    .filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y));
                if (pts.length < 2) return null;
                const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                return (
                    <path d={dPath} fill="none" stroke="#4FC3F7" strokeWidth={2.2}
                          opacity={0.95} strokeLinecap="round" strokeLinejoin="round" />
                );
            })()}

            {/* Horizontal levels — confined to the pattern region, no price text */}
            {hlines.map((hl, j) => {
                const y = yAxis.scale(hl.price);
                if (y == null || isNaN(y)) return null;
                const dash = hl.linestyle === ':' ? '2 4' : '5 3';
                return (
                    <line key={`hl${j}`} x1={leftBound} y1={y} x2={cRight} y2={y}
                          stroke={hl.color || '#FDD405'} strokeWidth={1.2}
                          strokeDasharray={dash} opacity={0.85} />
                );
            })}

            {/* Neckline price tag — pinned to the right end of the neckline */}
            {neckline && neckline.price != null && (() => {
                const y = yAxis.scale(neckline.price);
                if (y == null || isNaN(y)) return null;
                const label = neckline.label || `₹${neckline.price}`;
                const w = label.length * 6.2 + 10;
                const x = cRight - w - 2;
                return (
                    <g>
                        <rect x={x} y={y - 8} width={w} height={16} rx={3}
                              fill="#141308" stroke="#FFFF00" strokeWidth={0.75} opacity={0.95} />
                        <text x={x + w / 2} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight={600}
                              fill="#FFE24D" fontFamily="ui-monospace, Menlo, monospace"
                              style={{ pointerEvents: 'none' }}>
                            {label}
                        </text>
                    </g>
                );
            })()}

            {/* Pivot markers + labels */}
            {markers.map((m, k) => {
                const x = getX(m.date), y = yAxis.scale(m.price);
                if (x == null || y == null || isNaN(x) || isNaN(y)) return null;
                const above = m.at === 'high';
                const labelY = above ? y - 9 : y + 15;
                return (
                    <g key={`mk${k}`}>
                        <circle cx={x} cy={y} r={3} fill={m.color || '#FDD405'}
                                stroke="#0b0b0b" strokeWidth={0.75} />
                        {m.label && (
                            <text x={x} y={labelY} textAnchor="middle" fontSize={9} fontWeight={600}
                                  fill={m.color || '#FDD405'} stroke="#0b0b0b" strokeWidth={0.5}
                                  paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                                {m.label}
                            </text>
                        )}
                    </g>
                );
            })}
        </g>
    );
};

export default PatternAnnotationLayer;
