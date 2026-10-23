/**
 * Display helpers for news items in chat answers.
 *
 * Stored news (the backend's 10-minute news worker) carries sentiment_label,
 * category, published (ISO, IST), sources_count and symbol_tag. Items from the
 * live-feed fallback carry only title/url/source/sentiment and render as before.
 */

const SENTIMENTS = {
    positive: { label: 'Positive', dot: 'bg-emerald-400' },
    negative: { label: 'Negative', dot: 'bg-rose-400' },
    mixed: { label: 'Mixed', dot: 'bg-amber-400' },
    neutral: { label: 'Neutral', dot: 'bg-zinc-300 dark:bg-zinc-600' },
    uncertain: { label: 'Uncertain', dot: 'bg-zinc-300 dark:bg-zinc-600' },
};

// Venty's older bullish/bearish/neutral vocabulary, still sent on every item.
const FROM_VENTY = { bullish: 'positive', bearish: 'negative' };

const CATEGORIES = {
    results: 'Results',
    mna: 'M&A',
    orders: 'Order win',
    corporate_action: 'Corporate action',
    management: 'Management',
    regulatory: 'Regulatory',
    economy: 'Economy',
    markets: 'Markets',
};

export const newsSentiment = (h) => {
    const key = SENTIMENTS[h?.sentiment_label]
        ? h.sentiment_label
        : FROM_VENTY[String(h?.sentiment || '').toLowerCase()] || 'neutral';
    return { key, ...SENTIMENTS[key] };
};

export const timeAgo = (iso, now = Date.now()) => {
    const t = Date.parse(iso || '');
    if (Number.isNaN(t)) return null;
    const mins = Math.max(1, Math.round((now - t) / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

/** ["Mixed", "Results", "3h ago", "4 sources"] for stored news; [] for live-feed items. */
export const newsMetaParts = (h, now = Date.now()) => {
    if (!h?.sentiment_label) return [];
    return [
        newsSentiment(h).label,
        CATEGORIES[h.category],
        timeAgo(h.published, now),
        h.sources_count > 1 ? `${h.sources_count} sources` : null,
    ].filter(Boolean);
};

/** "Mint, Economic Times, NDTV Profit" — every publisher that ran the story. */
export const newsSourceList = (h) =>
    (Array.isArray(h?.sources) ? h.sources : []).map(s => s?.source).filter(Boolean).join(', ');
