// Draws a single amber ellipse around the candle(s) forming a detected
// candlestick pattern (Hammer, Engulfing, Harami, Morning/Evening Star, ...).
//
// This is the lightweight-charts twin of FundamentalCard's Recharts
// PatternCircleLayer — same look (hollow amber ellipse, wick + body enclosed),
// ported here as its own primitive so it can attach alongside PatternPrimitive
// (chart-pattern geometry) without touching that class.
//
// Coordinates are recomputed every paint, matching PatternPrimitive's own rule
// — caching them would strand the ellipse during zoom and pan.

const CIRCLE_COLOR = '#FDD405';

class CandlestickCirclePaneRenderer {
    constructor(source) {
        this._source = source;
    }

    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const { series, chart, _dates: dates, _bars: bars } = this._source;
            if (!series || !chart || !dates?.size || !bars?.length) return;

            const ctx = scope.context;
            const ts = chart.timeScale();
            const y = (p) => series.priceToCoordinate(p);

            const xs = [];
            const highs = [];
            const lows = [];
            for (const b of bars) {
                if (!dates.has(b.time)) continue;
                const cx = ts.timeToCoordinate(b.time);
                if (cx == null || !Number.isFinite(cx)) continue;
                xs.push(cx);
                if (b.high != null) highs.push(b.high);
                if (b.low != null) lows.push(b.low);
            }
            if (!xs.length || !highs.length || !lows.length) return;

            const yTop = y(Math.max(...highs));
            const yBot = y(Math.min(...lows));
            if (yTop == null || yBot == null || !Number.isFinite(yTop) || !Number.isFinite(yBot)) return;

            // Half the bar spacing, so the ellipse hugs the candle body/wick
            // width instead of a fixed pixel guess.
            const barSpacing = ts.options().barSpacing ?? 6;
            const half = barSpacing / 2;
            const padX = half + 4;
            const padY = 6;
            const x0 = Math.min(...xs) - padX;
            const x1 = Math.max(...xs) + padX;
            const cx = (x0 + x1) / 2;
            const cy = (yTop + yBot) / 2;
            const rx = Math.max((x1 - x0) / 2, 8);
            const ry = Math.max(Math.abs(yBot - yTop) / 2 + padY, 10);

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = CIRCLE_COLOR;
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = 0.9;
            ctx.stroke();
            ctx.restore();
        });
    }
}

class CandlestickCirclePaneView {
    constructor(source) {
        this._renderer = new CandlestickCirclePaneRenderer(source);
    }
    renderer() {
        return this._renderer;
    }
    zOrder() {
        return 'top';
    }
}

export class CandlestickCirclePrimitive {
    constructor(dates, bars) {
        this._dates = dates;
        this._bars = bars;
        this._paneViews = [new CandlestickCirclePaneView(this)];
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

    updateData(dates, bars) {
        this._dates = dates;
        this._bars = bars;
        this._requestUpdate?.();
    }

    paneViews() {
        return this._paneViews;
    }
}
