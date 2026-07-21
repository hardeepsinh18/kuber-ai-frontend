// Formatting for the price chart. Locale is en-IN throughout: prices carry the
// rupee symbol and lakh/crore grouping, matching the Market Stats panel and the
// rest of the app. Dates are always unambiguous about which year they belong to
// — a 12-month chart spans two calendar years and users misread bare months.

const LOCALE = 'en-IN';

const priceFmt = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const priceCompactFmt = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 0,
});

export const formatPrice = (value) =>
    value == null || !Number.isFinite(value) ? '—' : `₹${priceFmt.format(value)}`;

export const formatPriceCompact = (value) =>
    value == null || !Number.isFinite(value) ? '—' : `₹${priceCompactFmt.format(value)}`;

export const formatVolume = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 'YYYY-MM-DD' -> Date at UTC midnight. Parsing as UTC keeps the calendar date
// stable regardless of the viewer's timezone; a local-time parse shifts the day
// backwards for anyone west of Greenwich.
const parseDay = (time) => {
    const [y, m, d] = String(time).slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

export const formatCrosshairDate = (time) => {
    const dt = parseDay(time);
    const yy = String(dt.getUTCFullYear()).slice(2);
    return `${DAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} '${yy}`;
};

// TickMarkType: 0 Year, 1 Month, 2 DayOfMonth, 3 Time, 4 TimeWithSeconds.
// Year boundaries render the full year so Jan '26 can never read as Jan '25.
export const formatTickMark = (time, tickMarkType) => {
    const dt = parseDay(time);
    switch (tickMarkType) {
        case 0:
            return String(dt.getUTCFullYear());
        case 1:
            return MONTHS[dt.getUTCMonth()];
        default:
            return String(dt.getUTCDate());
    }
};
