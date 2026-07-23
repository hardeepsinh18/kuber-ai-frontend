// Draws detected chart-pattern geometry over the price series: sloped trendlines,
// the swing skeleton, rounding curves, channel band/midline, pivot markers and the
// neckline price tag.
//
// This is the lightweight-charts twin of PatternAnnotationLayer.jsx, which still
// serves FundamentalCard's Recharts mini-charts. Keep the two visually identical —
// same colours, same clamping, same deliberate omissions.
//
// Product rules carried over verbatim:
//   - Lines are confined to the PATTERN REGION (windowStartDate -> last annotation
//     date), never full width, so an old pattern doesn't smear across recent candles.
//   - Target/stop hlines and the measured-move projection are NOT drawn, on purpose.
//   - No price text on the lines; the neckline tag is the only label besides markers.
//
// Coordinates are recomputed every paint. Caching them strands the overlay during
// zoom and pan.

const TREND_COLOR = '#4FC3F7';
const SKELETON_COLOR = '#C9D2DD';
const MARKER_COLOR = '#FDD405';

class PatternPaneRenderer {
    constructor(source) {
        this._source = source;
    }

    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const { series, chart, _ann: ann, _bars: bars } = this._source;
            if (!series || !chart || !ann?.has || !bars?.length) return;

            const ctx = scope.context;
            const ts = chart.timeScale();
            const y = (p) => series.priceToCoordinate(p);

            // Annotation dates are often not exact bar dates, and timeToCoordinate
            // returns null for anything that isn't a bar. Fall back to the nearest
            // bar, mirroring getX() in PatternAnnotationLayer.
            const x = (target_) => {
                if (target_ == null) return null;
                const day = String(target_).slice(0, 10);
                const exact = ts.timeToCoordinate(day);
                if (exact != null) return exact;
                let best = null, bestD = Infinity;
                const t = +new Date(day);
                for (const b of bars) {
                    const diff = Math.abs(+new Date(b.time) - t);
                    if (diff < bestD) { bestD = diff; best = b.time; }
                }
                return best != null ? ts.timeToCoordinate(best) : null;
            };

            const finite = (...vs) => vs.every((v) => v != null && Number.isFinite(v));

            const cLeft = 0;
            const cRight = scope.mediaSize.width;
            const winX = ann.windowStartDate ? x(ann.windowStartDate) : cLeft;
            const leftBound = Math.max(cLeft, winX ?? cLeft);

            // Right edge of the pattern region: the rightmost date the annotation
            // actually mentions, not the chart's right edge.
            const annDates = [
                ...(ann.skeleton || []).map((p) => p?.date),
                // projection is never DRAWN (deliberate — see the omission note below),
                // but its dates still extend the pattern region, matching the reference
                // at PatternAnnotationLayer.jsx:87. Without it, a completed pattern's
                // lines clamp short of where the SVG twin draws them.
                ...(ann.projection || []).map((p) => p?.date),
                ...(ann.curve || []).map((p) => p?.date),
                ...(ann.midline || []).map((p) => p?.date),
                ...(ann.markers || []).map((m) => m?.date),
                ...(ann.trendlines || []).flat().map((p) => p?.date),
                ...(ann.band ? [...(ann.band.upper || []), ...(ann.band.lower || [])].map((p) => p?.date) : []),
            ].filter(Boolean);
            let rightBound = cRight;
            if (annDates.length) {
                let maxDate = annDates[0];
                for (const d of annDates) if (+new Date(d) > +new Date(maxDate)) maxDate = d;
                const rx = x(maxDate);
                if (finite(rx)) rightBound = Math.min(cRight, Math.max(leftBound + 8, rx));
            }

            // A 2-point line -> endpoints + slope evaluator.
            const lineXY = (ln) => {
                if (!ln || ln.length < 2) return null;
                const x1 = x(ln[0].date), y1 = y(ln[0].price);
                const x2 = x(ln[1].date), y2 = y(ln[1].price);
                if (!finite(x1, y1, x2, y2)) return null;
                const slope = x2 !== x1 ? (y2 - y1) / (x2 - x1) : 0;
                return { x1, y1, x2, y2, at: (xx) => y1 + slope * (xx - x1) };
            };

            const polyline = (pts, color) => {
                const proj = pts
                    .map((p) => ({ cx: x(p.date), cy: y(p.price) }))
                    .filter((p) => finite(p.cx, p.cy));
                if (proj.length < 2) return;
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.7;
                ctx.globalAlpha = 0.9;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                proj.forEach((p, i) => (i ? ctx.lineTo(p.cx, p.cy) : ctx.moveTo(p.cx, p.cy)));
                ctx.stroke();
                ctx.restore();
            };

            // Channel band first, behind everything.
            if (ann.band) {
                const U = lineXY(ann.band.upper);
                const L = lineXY(ann.band.lower);
                if (U && L) {
                    const xL = Math.max(leftBound, Math.min(U.x1, U.x2));
                    const xR = rightBound;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(xL, U.at(xL));
                    ctx.lineTo(xR, U.at(xR));
                    ctx.lineTo(xR, L.at(xR));
                    ctx.lineTo(xL, L.at(xL));
                    ctx.closePath();
                    ctx.fillStyle = TREND_COLOR;
                    ctx.globalAlpha = 0.12;
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Dashed channel midline.
            if ((ann.midline || []).length >= 2) {
                const M = lineXY(ann.midline);
                if (M) {
                    const xL = Math.max(leftBound, Math.min(M.x1, M.x2));
                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([5, 4]);
                    ctx.strokeStyle = TREND_COLOR;
                    ctx.lineWidth = 1.2;
                    ctx.globalAlpha = 0.8;
                    ctx.moveTo(xL, M.at(xL));
                    ctx.lineTo(rightBound, M.at(rightBound));
                    ctx.stroke();
                    ctx.restore();
                }
            }

            if ((ann.curve || []).length >= 2) polyline(ann.curve, SKELETON_COLOR);

            // Sloped trendlines — from the first pivot, extended to rightBound.
            (ann.trendlines || []).forEach((tl) => {
                const L = lineXY(tl);
                if (!L) return;
                const startX = Math.max(leftBound, Math.min(L.x1, L.x2));
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = tl[0].color || TREND_COLOR;
                ctx.lineWidth = 1.6;
                ctx.globalAlpha = 0.9;
                ctx.lineCap = 'round';
                ctx.moveTo(startX, L.at(startX));
                ctx.lineTo(rightBound, L.at(rightBound));
                ctx.stroke();
                ctx.restore();
            });

            if ((ann.skeleton || []).length >= 2) polyline(ann.skeleton, SKELETON_COLOR);

            // ann.projection and ann.hlines are deliberately NOT drawn — product
            // decision to keep the pattern chart clean. Do not "fix" this.

            // Neckline price tag — pinned to the right end of the pattern region.
            if (ann.neckline && ann.neckline.price != null) {
                const cy = y(ann.neckline.price);
                if (finite(cy)) {
                    const label = ann.neckline.label || `₹${ann.neckline.price}`;
                    const w = label.length * 6.2 + 10;
                    const bx = rightBound - w - 2;
                    ctx.save();
                    ctx.globalAlpha = 0.95;
                    ctx.fillStyle = '#141308';
                    ctx.strokeStyle = '#FFFF00';
                    ctx.lineWidth = 0.75;
                    ctx.beginPath();
                    ctx.roundRect(bx, cy - 8, w, 16, 3);
                    ctx.fill();
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#FFE24D';
                    ctx.font = '600 10px ui-monospace, Menlo, monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, bx + w / 2, cy);
                    ctx.restore();
                }
            }

            // Pivot markers + labels.
            (ann.markers || []).forEach((m) => {
                const cx = x(m.date);
                const cy = y(m.price);
                if (!finite(cx, cy)) return;
                const color = m.color || MARKER_COLOR;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#0b0b0b';
                ctx.lineWidth = 0.75;
                ctx.stroke();
                if (m.label) {
                    const above = m.at === 'high';
                    ctx.font = '600 9px Montserrat, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = '#0b0b0b';
                    ctx.lineWidth = 0.5;
                    ctx.strokeText(m.label, cx, above ? cy - 9 : cy + 15);
                    ctx.fillStyle = color;
                    ctx.fillText(m.label, cx, above ? cy - 9 : cy + 15);
                }
                ctx.restore();
            });
        });
    }
}

class PatternPaneView {
    constructor(source) {
        this._renderer = new PatternPaneRenderer(source);
    }
    renderer() {
        return this._renderer;
    }
    zOrder() {
        return 'top';
    }
}

export class PatternPrimitive {
    constructor(ann, bars) {
        this._ann = ann;
        this._bars = bars;
        this._paneViews = [new PatternPaneView(this)];
        this.series = null;
        this.chart = null;
    }

    attached({ chart, series, requestUpdate }) {
        this.chart = chart;
        this.series = series;
        this._requestUpdate = requestUpdate;
    }

    detached() {
        this.chart = null;
        this.series = null;
        this._requestUpdate = undefined;
    }

    updateData(ann, bars) {
        this._ann = ann;
        this._bars = bars;
        this._requestUpdate?.();
    }

    paneViews() {
        return this._paneViews;
    }
}
