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

// Candles need a complete OHLC set. A row with a valid close but a null open,
// high or low is legitimate for the area view and must survive normalizeOhlc —
// but lightweight-charts' CandlestickSeries cannot render it, so it is dropped
// here. This mirrors the render-time skip the previous Recharts CandleLayer did
// (StockChart.jsx:80) while keeping the row available to toAreaData.
export const toCandleData = (bars) =>
    bars
        .filter((b) => b.open != null && b.high != null && b.low != null && b.close != null)
        .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));
