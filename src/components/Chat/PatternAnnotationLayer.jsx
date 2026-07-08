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
    projection = [],
    neckline = null,
    band = null,
    midline = [],
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

    // Right boundary of the pattern region — the rightmost date present in the
    // annotation geometry (last skeleton/projection/marker point). Lines are clamped
    // to this instead of the chart's right edge so a pattern that formed weeks ago
    // doesn't smear its neckline/trendlines across unrelated recent candles. On the
    // candle view (auto-scrolled to "now") that smear is what looked cluttered.
    // Forming patterns naturally reach ~now (their skeleton tail is the latest close),
    // so they still extend to the right; completed patterns stop at the pattern's end.
    const _annDates = [
        ...skeleton.map(p => p?.date),
        ...projection.map(p => p?.date),
        ...curve.map(p => p?.date),
        ...midline.map(p => p?.date),
        ...markers.map(m => m?.date),
        ...trendlines.flat().map(p => p?.date),
        ...(band ? [...(band.upper || []), ...(band.lower || [])].map(p => p?.date) : []),
    ].filter(Boolean);
    let rightBound = cRight;
    if (_annDates.length) {
        let maxDate = _annDates[0];
        for (const d of _annDates) if (+new Date(d) > +new Date(maxDate)) maxDate = d;
        const rx = getX(maxDate);
        if (rx != null && !isNaN(rx)) rightBound = Math.min(cRight, Math.max(leftBound + 8, rx));
    }

    // A 2-point line [{date,price},{date,price}] → pixel endpoints + a slope evaluator.
    const lineXY = (ln) => {
        if (!ln || ln.length < 2) return null;
        const x1 = getX(ln[0].date), y1 = yAxis.scale(ln[0].price);
        const x2 = getX(ln[1].date), y2 = yAxis.scale(ln[1].price);
        if ([x1, y1, x2, y2].some(v => v == null || isNaN(v))) return null;
        const slope = x2 !== x1 ? (y2 - y1) / (x2 - x1) : 0;
        return { x1, y1, x2, y2, at: (x) => y1 + slope * (x - x1) };
    };

    return (
        <g>
            {/* Shaded channel band between the two parallel lines (drawn first, behind) */}
            {band && (() => {
                const U = lineXY(band.upper), L = lineXY(band.lower);
                if (!U || !L) return null;
                const xL = Math.max(leftBound, Math.min(U.x1, U.x2));
                const xR = rightBound;
                const pts = `${xL},${U.at(xL)} ${xR},${U.at(xR)} ${xR},${L.at(xR)} ${xL},${L.at(xL)}`;
                return <polygon points={pts} fill="#4FC3F7" opacity={0.12} stroke="none" />;
            })()}

            {/* Dashed channel midline */}
            {midline.length >= 2 && (() => {
                const M = lineXY(midline);
                if (!M) return null;
                const xL = Math.max(leftBound, Math.min(M.x1, M.x2));
                return <line x1={xL} y1={M.at(xL)} x2={rightBound} y2={M.at(rightBound)}
                             stroke="#4FC3F7" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.8} />;
            })()}

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
                const endY = y1 + slope * (rightBound - x1);
                return (
                    <line key={`tl${i}`} x1={startX} y1={startY} x2={rightBound} y2={endY}
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

            {/* Dashed projection — after the neckline break, extend down/up to the measured target */}
            {projection.length >= 2 && (() => {
                const pts = projection
                    .map(p => ({ x: getX(p.date), y: yAxis.scale(p.price) }))
                    .filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y));
                if (pts.length < 2) return null;
                const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                return (
                    <path d={dPath} fill="none" stroke="#4FC3F7" strokeWidth={1.8}
                          strokeDasharray="6 5" opacity={0.9}
                          strokeLinecap="round" strokeLinejoin="round" />
                );
            })()}

            {/* Horizontal levels — Target (green) and Stop-loss (red), each with a price chip
                pinned to the right end so it's clear which line is which. */}
            {hlines.map((hl, j) => {
                const y = yAxis.scale(hl.price);
                if (y == null || isNaN(y)) return null;
                const label = hl.label || '';
                const isTarget = /^\s*target/i.test(label);
                const isStop   = /^\s*(stop|sl)/i.test(label);
                const color = isTarget ? '#00FF88' : isStop ? '#FF4444' : (hl.color || '#FDD405');
                const dash = hl.linestyle === ':' ? '2 4' : '5 3';
                const chip = isTarget ? `Target ₹${Number(hl.price).toFixed(2)}`
                           : isStop   ? `SL ₹${Number(hl.price).toFixed(2)}`
                           : null;
                const w = chip ? chip.length * 6.0 + 12 : 0;
                const cx = rightBound - w - 2;
                return (
                    <g key={`hl${j}`}>
                        <line x1={leftBound} y1={y} x2={chip ? cx - 2 : rightBound} y2={y}
                              stroke={color} strokeWidth={1.3}
                              strokeDasharray={dash} opacity={0.9} />
                        {chip && (
                            <g>
                                <rect x={cx} y={y - 8} width={w} height={16} rx={3}
                                      fill="#0b0b0b" stroke={color} strokeWidth={0.75} opacity={0.95} />
                                <text x={cx + w / 2} y={y + 3.5} textAnchor="middle" fontSize={9.5}
                                      fontWeight={600} fill={color}
                                      fontFamily="ui-monospace, Menlo, monospace"
                                      style={{ pointerEvents: 'none' }}>
                                    {chip}
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}

            {/* Neckline price tag — pinned to the right end of the neckline */}
            {neckline && neckline.price != null && (() => {
                const y = yAxis.scale(neckline.price);
                if (y == null || isNaN(y)) return null;
                const label = neckline.label || `₹${neckline.price}`;
                const w = label.length * 6.2 + 10;
                const x = rightBound - w - 2;
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
