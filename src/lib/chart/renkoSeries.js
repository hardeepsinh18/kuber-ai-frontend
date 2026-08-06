import { formatCrosshairDate } from './formatters';

const BULL = '#26a69a';
const BEAR = '#ef5350';

// Renko's x-axis tracks price movement, not time. Multiple bricks can complete
// on the same day and LWC rejects duplicate times, so bricks sit at synthetic
// sequential days; the real date is carried alongside and recovered in the
// formatters. Epoch is arbitrary — only the ordering matters.
const EPOCH = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;

const syntheticTime = (i) => new Date(EPOCH + i * DAY_MS).toISOString().slice(0, 10);

export const renkoData = (bricks) =>
    bricks.map((b, i) => ({
        time: syntheticTime(i),
        brickOpen: b.open,
        brickClose: b.close,
        dir: b.dir,
        realDate: b.date,
        live: !!b.live,
        // LWC needs a numeric `value` per point for autoscaling.
        value: b.close,
    }));

export const renkoTickFormatter = (data) => {
    const byTime = new Map(data.map((d) => [d.time, d.realDate]));
    return (time) => {
        const real = byTime.get(time);
        return real ? formatCrosshairDate(real) : '';
    };
};

// Range chips count DAILY bars, but the Renko series is indexed by brick, and
// bricks.length is decoupled from bars.length (a brick forms only on a full
// brick-size move). Translate the daily-bar window into the brick logical range
// [from, last] by date cutoff — mirroring the date filter the Recharts renko
// view used. Returns null if there are no bricks; falls back to the full span
// when bars/range are unavailable so the view is never blank.
export const renkoVisibleRange = (bricks, bars, rangeBars) => {
    if (!bricks?.length) return null;
    const to = bricks.length - 1;
    if (!bars?.length || !rangeBars) return { from: 0, to };
    const cutoffIdx = Math.max(bars.length - rangeBars, 0);
    const cutoff = String(bars[cutoffIdx]?.time ?? '').slice(0, 10);
    if (!cutoff) return { from: 0, to };
    const first = bricks.findIndex((b) => String(b.date).slice(0, 10) >= cutoff);
    return { from: first < 0 ? to : first, to };
};

class RenkoSeriesRenderer {
    _data = null;
    _options = null;

    update(data, options) {
        this._data = data;
        this._options = options;
    }

    draw(target, priceConverter) {
        target.useBitmapCoordinateSpace((scope) => {
            const data = this._data;
            if (!data?.bars?.length || data.visibleRange === null) return;

            const ctx = scope.context;
            const ratio = scope.horizontalPixelRatio;
            // Leave a surface gap between bricks; clamp so sparse charts don't
            // render as giant slabs (mirrors the old Recharts RenkoLayer).
            const gap = Math.max(Math.min(data.barSpacing * 0.15, 3), 1.5);
            const w = Math.min(Math.max(data.barSpacing - gap, 2), 30);

            let prevDate = null;
            let prevX = null;
            for (let i = data.visibleRange.from; i < data.visibleRange.to; i++) {
                const bar = data.bars[i];
                const item = bar.originalData;
                if (item?.brickOpen == null || item?.brickClose == null) {
                    prevDate = null;
                    continue;
                }

                const yO = priceConverter(item.brickOpen);
                const yC = priceConverter(item.brickClose);
                if (!Number.isFinite(yO) || !Number.isFinite(yC)) continue;

                const color = item.dir === 1 ? BULL : BEAR;
                const x = bar.x * ratio;
                const halfW = (w * ratio) / 2;
                const top = Math.min(yO, yC) * scope.verticalPixelRatio;
                const h = Math.max(Math.abs(yC - yO) * scope.verticalPixelRatio, 1.5);

                // A single trading day that moves 2+ brick sizes produces 2+
                // bricks sharing one date — correct Renko math, but with the
                // usual per-brick gap it reads as two unrelated bricks that
                // happen to land on the same date. Consecutive same-day bricks
                // are always price-contiguous (this brick's open is the last
                // one's close), so bridge the gap with a thin band right at
                // that shared price level to read as one continued move.
                if (item.realDate === prevDate && prevX != null) {
                    const boundaryY = yO * scope.verticalPixelRatio;
                    const thickness = Math.max(2 * ratio, 1);
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.7;
                    ctx.fillRect(prevX + halfW, boundaryY - thickness / 2, x - halfW - (prevX + halfW), thickness);
                    ctx.globalAlpha = 1;
                }

                // The live brick tracks today's close before it has completed a
                // full brick move — drawn hollow/dashed so it never reads as a
                // confirmed brick, but still anchors the chart to today's date.
                if (item.live) {
                    ctx.globalAlpha = 0.35;
                    ctx.fillStyle = color;
                    ctx.fillRect(x - halfW, top, halfW * 2, h);
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3 * ratio, 2 * ratio]);
                    ctx.strokeRect(x - halfW, top, halfW * 2, h);
                    ctx.setLineDash([]);
                } else {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.92;
                    ctx.fillRect(x - halfW, top, halfW * 2, h);
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x - halfW, top, halfW * 2, h);
                }

                prevDate = item.realDate;
                prevX = x;
            }
        });
    }
}

export class RenkoSeries {
    _renderer = new RenkoSeriesRenderer();

    priceValueBuilder(plotRow) {
        return [plotRow.brickOpen, plotRow.brickClose, plotRow.brickClose];
    }

    isWhitespace(data) {
        return data.brickClose === undefined;
    }

    renderer() {
        return this._renderer;
    }

    update(data, options) {
        this._renderer.update(data, options);
    }

    defaultOptions() {
        return { lastValueVisible: false, priceLineVisible: false };
    }
}
