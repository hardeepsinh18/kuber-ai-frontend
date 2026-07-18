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

            for (let i = data.visibleRange.from; i < data.visibleRange.to; i++) {
                const bar = data.bars[i];
                const item = bar.originalData;
                if (item?.brickOpen == null || item?.brickClose == null) continue;

                const yO = priceConverter(item.brickOpen);
                const yC = priceConverter(item.brickClose);
                if (!Number.isFinite(yO) || !Number.isFinite(yC)) continue;

                const color = item.dir === 1 ? BULL : BEAR;
                const x = bar.x * ratio;
                const halfW = (w * ratio) / 2;
                const top = Math.min(yO, yC) * scope.verticalPixelRatio;
                const h = Math.max(Math.abs(yC - yO) * scope.verticalPixelRatio, 1.5);

                ctx.fillStyle = color;
                ctx.globalAlpha = 0.92;
                ctx.fillRect(x - halfW, top, halfW * 2, h);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = color;
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x - halfW, top, halfW * 2, h);
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
