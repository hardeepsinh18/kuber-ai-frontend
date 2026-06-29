import React, { useState } from 'react';

/**
 * Management Sentiment card — derived from earnings-call & annual-report disclosures
 * (transcript_sentiment, precomputed). Shows an overall management-tone gauge,
 * per-aspect sentiment chips, a quarter-over-quarter trend, and verbatim pull-quotes.
 *
 * Props: data = {
 *   symbol, tone_score (0-100), tone_label, period, filing_date,
 *   aspects: [{ key, label, sentiment }], trend: { direction, delta, prev_quarter, prev_score },
 *   summary, quotes: [{ text, source }]
 * }
 */

const toneColor = (s) =>
    s >= 70 ? '#22c55e' :
    s >= 50 ? '#FDD405' :
    s >= 35 ? '#fb923c' : '#ef4444';

const SENT = {
    bullish: { color: '#22c55e', label: 'Positive', dot: '▲' },
    neutral: { color: '#FDD405', label: 'Neutral', dot: '■' },
    bearish: { color: '#ef4444', label: 'Cautious', dot: '▼' },
};

// For the "risks" aspect the polarity is inverted in plain language:
// bullish (low risk) reads as "Contained", bearish (elevated) reads as "Elevated".
const aspectText = (key, sentiment) => {
    const s = (sentiment || 'neutral').toLowerCase();
    if (key === 'risks') {
        return s === 'bullish' ? 'Contained' : s === 'bearish' ? 'Elevated' : 'Moderate';
    }
    return (SENT[s] || SENT.neutral).label;
};

const ManagementSentiment = ({ data }) => {
    const [open, setOpen] = useState(true);
    if (!data || data.tone_score == null) return null;

    const score = Math.round(data.tone_score);
    const color = toneColor(score);
    const aspects = Array.isArray(data.aspects) ? data.aspects : [];
    const quotes = Array.isArray(data.quotes) ? data.quotes.filter(q => q && q.text) : [];
    const trend = data.trend;

    // SVG gauge geometry (matches Kuber Score banner)
    const r = 34, cx = 44, cy = 44, circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;

    const trendMeta = trend && {
        up: { c: '#22c55e', a: '↑', t: `Improving vs ${trend.prev_quarter || 'prev qtr'}` },
        down: { c: '#ef4444', a: '↓', t: `Softening vs ${trend.prev_quarter || 'prev qtr'}` },
        flat: { c: '#a1a1aa', a: '→', t: `Stable vs ${trend.prev_quarter || 'prev qtr'}` },
    }[trend.direction];

    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }} />
            <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-900/60">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                        Management Sentiment
                    </span>
                    {data.period && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: `${color}18`, color }}>
                            🎙️ {data.period}
                        </span>
                    )}
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-normal">
                        from earnings calls
                    </span>
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="ml-auto text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label="Toggle details"
                    >
                        {open ? '▲' : '▼'}
                    </button>
                </div>

                {/* Gauge + tone + trend */}
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <svg viewBox="0 0 88 88" width={80} height={80}>
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={7} />
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
                                strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`} />
                            <text x={cx} y={cy - 3} textAnchor="middle" fill={color} fontSize={20} fontWeight="800"
                                fontFamily="Inter,sans-serif">{score}</text>
                            <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(128,128,128,0.7)" fontSize={9}
                                fontFamily="Inter,sans-serif">/100</text>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[18px] font-extrabold leading-tight" style={{ color }}>
                                {data.tone_label || 'Balanced'}
                            </span>
                            {trendMeta && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                      style={{ background: `${trendMeta.c}18`, color: trendMeta.c }}>
                                    {trendMeta.a} {trend.delta > 0 ? '+' : ''}{trend.delta}
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                            Management tone {trendMeta ? `· ${trendMeta.t}` : ''}
                        </div>
                        {data.summary && (
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                {data.summary}
                            </div>
                        )}
                    </div>
                </div>

                {open && (
                    <>
                        {/* Aspect chips */}
                        {aspects.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {aspects.map((a) => {
                                    const meta = SENT[(a.sentiment || 'neutral').toLowerCase()] || SENT.neutral;
                                    return (
                                        <span key={a.key}
                                              className="text-[11px] px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5 border"
                                              style={{ background: `${meta.color}12`, color: meta.color, borderColor: `${meta.color}30` }}>
                                            <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{a.label}</span>
                                            <span style={{ color: meta.color }}>{aspectText(a.key, a.sentiment)}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pull-quotes */}
                        {quotes.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {quotes.map((q, i) => (
                                    <div key={i}
                                         className="text-[11.5px] italic text-zinc-600 dark:text-zinc-300 leading-relaxed pl-3 border-l-2"
                                         style={{ borderColor: `${color}66` }}>
                                        “{q.text}”
                                        {q.source && (
                                            <a href={q.source} target="_blank" rel="noopener noreferrer"
                                               className="not-italic ml-1 text-[10px] font-semibold"
                                               style={{ color }}>↗ source</a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 text-[9.5px] text-zinc-400 dark:text-zinc-600">
                            Derived from management commentary, guidance &amp; Q&amp;A in company filings. Not investment advice.
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ManagementSentiment;
