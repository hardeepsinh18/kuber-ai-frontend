// chartData (parallel arrays from the backend) -> lightweight-charts series data.
//
// LWC throws on unsorted or duplicate times, so sorting and deduping here is a
// correctness requirement rather than tidiness. Charts are always daily, so
// times are truncated to a calendar day.

const toDay = (d) => String(d).slice(0, 10);

export const normalizeOhlc = (chartData) => {
    if (!chartData || chartData.error) return [];
    const { dates, open, high, low, close, volume } = chartData;
    if (!Array.isArray(dates) || !Array.isArray(close)) return [];

    const bars = dates
        .map((date, i) => ({
            time: toDay(date),
            open: open?.[i] ?? null,
            high: high?.[i] ?? null,
            low: low?.[i] ?? null,
            close: close?.[i] ?? null,
            volume: volume?.[i] ?? null,
        }))
        // Same rule as the Recharts implementation: a zero close is stale DB data,
        // not a real price.
        .filter((b) => b.close != null && b.close > 0);

    bars.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

    // Later rows win — a refetched bar supersedes the earlier copy.
    const byTime = new Map();
    for (const b of bars) byTime.set(b.time, b);
    return [...byTime.values()];
};

export const toAreaData = (bars) => bars.map((b) => ({ time: b.time, value: b.close }));

// Candles need a complete, real OHLC set. Two rules, both ported from the
// Recharts implementation this replaces:
//   - A row with a valid close but an absent open/high/low is legitimate for
//     the area view (which only reads close), so normalizeOhlc keeps it — but
//     CandlestickSeries cannot render it, so it is dropped here. Mirrors the
//     render-time skip at StockChart.jsx:80.
//   - A zero or NaN price is stale DB data, not a real price. The legacy row
//     mapper coerced these to null via `||`, which the candle skip then
//     dropped. normalizeOhlc uses `??` and preserves them, so the check has to
//     live here instead — otherwise a stale zero draws a wick down to ₹0.
const isRealPrice = (v) => Number.isFinite(v) && v > 0;

export const toCandleData = (bars) =>
    bars
        .filter((b) => isRealPrice(b.open) && isRealPrice(b.high) && isRealPrice(b.low) && isRealPrice(b.close))
        .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));
