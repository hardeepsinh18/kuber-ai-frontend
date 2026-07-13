import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import StockChart from './StockChart';

/**
 * QuickAnswer — the "instant read" layout for Quick (snap) mode.
 * Verdict, live chart, overall score and reasoning, all on one screen:
 *   1. QUICK ANSWER header + tagline
 *   2. Company card (name · NSE:SYM · price · day change)
 *   3. Yellow KUBER VERDICT band (BUY/SELL/HOLD + Entry / Stop Loss / Target)
 *   4. Chart card (Area default) + Today's Market Stats side card
 *   5. KUBER AI SCORE banner + Overall Health donut + Technical/Fundamental/Sentimental
 *   6. Key Takeaway bullets
 *   7. Recent News
 * Every section renders only when its data exists.
 */

const BRAND = '#FDD405';

const fmtINR = (n, digits = 0) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits })}` : null;

const fmtNum = (n) =>
    n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : null;

const fmtVol = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

/* Inline markdown (bold/italic) without block wrappers — for bullets */
const InlineMd = ({ children }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            p: ({ children: c }) => <>{c}</>,
            strong: ({ children: c }) => <strong className="font-bold text-zinc-900 dark:text-white">{c}</strong>,
            em: ({ children: c }) => <em className="italic">{c}</em>,
            a: ({ href, children: c }) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="underline underline-offset-2 text-amber-700 dark:text-[#FDD405]">{c}</a>
            ),
        }}
    >
        {children}
    </ReactMarkdown>
);

/* Donut score ring */
const ScoreRing = ({ score, size = 88, stroke = 9, color }) => {
    const s = Math.min(100, Math.max(0, Math.round(score)));
    const r = (size - stroke) / 2 - 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const filled = (s / 100) * circ;
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Score ${s} out of 100`}>
            <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke}
                    className="stroke-zinc-200 dark:stroke-white/10" />
            <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${c} ${c})`} />
            <text x={c} y={c - 2} textAnchor="middle" fontSize={size * 0.26} fontWeight="800"
                  fontFamily="Inter,sans-serif" className="fill-zinc-900 dark:fill-white">{s}</text>
            <text x={c} y={c + size * 0.16} textAnchor="middle" fontSize={size * 0.1}
                  fontFamily="Inter,sans-serif" className="fill-zinc-400 dark:fill-white/40">/100</text>
        </svg>
    );
};

const scoreColor = (s) => (s >= 70 ? '#22c55e' : s >= 50 ? BRAND : '#ef4444');

/* Section card shell */
const Card = ({ className, children }) => (
    <div className={clsx(
        'rounded-2xl border bg-white border-zinc-200 dark:bg-[#141312] dark:border-zinc-800',
        className
    )}>
        {children}
    </div>
);

const CardHeader = ({ children }) => (
    <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white">{children}</h4>
);

/* Derive verdict word when the backend signal is missing */
const deriveVerdict = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return null;
    if (/\b(buy|accumulate|bullish|breakout)\b/.test(raw)) return 'BUY';
    if (/\b(sell|exit|avoid|bearish|breakdown)\b/.test(raw)) return 'SELL';
    if (/\b(hold|wait|neutral|sideways)\b/.test(raw)) return 'HOLD';
    return null;
};

/* Pull up to 4 takeaway bullets: verdict line → signal.why → aiTake → content bullets */
const buildTakeaways = (verdictText, signal, aiTake, content) => {
    const out = [];
    const push = (t) => {
        const clean = String(t || '')
            .replace(/^\s*[>*•\-–]\s*/, '')
            .replace(/^\**\s*verdict\s*:?\**\s*/i, '')
            .trim();
        if (clean && !out.some(o => o.toLowerCase() === clean.toLowerCase())) out.push(clean);
    };
    if (verdictText) push(verdictText);
    (Array.isArray(signal?.why) ? signal.why : []).forEach(push);
    (Array.isArray(aiTake?.bullets) ? aiTake.bullets : []).forEach(b => push(b?.text));
    if (out.length < 2 && typeof content === 'string') {
        content.split('\n')
            .filter(l => /^\s*[-*•]\s+\S/.test(l))
            .filter(l => !/disclaimer|consult a sebi|education only/i.test(l))
            .forEach(push);
    }
    return out.slice(0, 4);
};

const QuickAnswer = ({
    content,
    verdictText = null,
    metadata = {},
    signal = null,
    scoreCard = null,
    managementSentiment = null,
    aiTake = null,
    chartData = null,
    news = [],
    symbolLabel = '',
    patternSummary = null,
}) => {
    const aag = metadata?.at_a_glance || {};
    const companyName = aag.company_name || aag.display_name || symbolLabel;

    /* day change: absolute derived from price + change % */
    const price = aag.price != null ? Number(aag.price) : null;
    const pct = aag.change_percent != null ? Number(aag.change_percent) : null;
    const absChange = price != null && pct != null ? price - price / (1 + pct / 100) : null;
    const isUp = pct != null ? pct >= 0 : true;

    /* verdict band */
    const rec = signal?.recommendation
        ? String(signal.recommendation).toUpperCase()
        : deriveVerdict(verdictText || content);
    const levels = [
        { label: 'Entry', value: fmtINR(signal?.ideal_entry) },
        { label: 'Stop Loss', value: fmtINR(signal?.stop_loss) },
        { label: 'Target', value: fmtINR(signal?.target) },
    ].filter(l => l.value);

    /* chart — single primary chart in quick view */
    const chart = Array.isArray(chartData)
        ? chartData.find(cd => cd && !cd.error) || null
        : (chartData && !chartData.error ? chartData : null);

    /* market stats side card */
    const stats = [
        aag.open != null && { label: 'Open', value: fmtINR(aag.open) },
        aag.high != null && { label: 'High', value: fmtINR(aag.high) },
        aag.low != null && { label: 'Low', value: fmtINR(aag.low) },
        aag.high != null && aag.low != null && { label: 'Range', value: `${fmtNum(aag.low)}–${fmtNum(aag.high)}` },
        aag.volume > 0 && { label: 'Volume', value: fmtVol(aag.volume) },
        aag['52w_low'] != null && aag['52w_high'] != null && { label: '52w', value: `${fmtNum(aag['52w_low'])}–${fmtNum(aag['52w_high'])}` },
    ].filter(Boolean);

    /* scores — components from the blended overall are the most reliable source */
    const comp = scoreCard?.overall?.components || {};
    const normalize = (v) => (v != null && v <= 10 ? v * 10 : v);
    const overallScore = scoreCard?.overall?.score ?? null;
    const techScore = comp.technical ?? scoreCard?.technical?.score ?? null;
    const fundScore = comp.financial ?? normalize(scoreCard?.fundamental?.score) ?? null;
    const sentScore = comp.management ?? managementSentiment?.tone_score ?? null;
    const subScores = [
        { key: 'TECHNICAL', score: techScore, desc: 'Price, momentum, volume' },
        { key: 'FUNDAMENTAL', score: fundScore, desc: 'Financial health, valuation' },
        { key: 'SENTIMENTAL', score: sentScore, desc: 'News, filings, mood' },
    ].filter(s => s.score != null);
    const hasScores = overallScore != null || subScores.length > 0;

    const takeaways = buildTakeaways(verdictText, signal, aiTake, content);
    const newsItems = (Array.isArray(news) ? news : []).slice(0, 5);

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div>
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[26px] sm:text-[30px] font-black uppercase tracking-tight leading-none text-zinc-900 dark:text-white">
                        Quick Answer
                    </h2>
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600 mt-1.5 flex-shrink-0">
                        Kuber AI
                    </span>
                </div>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                    The instant read. Verdict, live chart, overall score and reasoning, all on one screen, understood in under ten seconds.
                </p>
            </div>

            {/* ── Company card ───────────────────────────────────── */}
            {(companyName || price != null) && (
                <Card className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        {companyName && (
                            <p className="text-[16px] font-bold text-zinc-900 dark:text-white leading-tight truncate">
                                {companyName}
                            </p>
                        )}
                        {symbolLabel && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                    NSE
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">:</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                                    {symbolLabel}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                        {price != null && (
                            <span className="text-[24px] font-extrabold text-zinc-900 dark:text-white leading-none">
                                {fmtINR(price, 2)}
                            </span>
                        )}
                        {pct != null && (
                            <span className={clsx(
                                'inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[11px] font-semibold',
                                isUp
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                            )}>
                                {isUp ? '▲' : '▼'}
                                {absChange != null ? ` ${Math.abs(absChange).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ''}
                                {` (${Math.abs(pct).toFixed(2)}%) today`}
                            </span>
                        )}
                    </div>
                </Card>
            )}

            {/* ── KUBER VERDICT band ─────────────────────────────── */}
            {rec && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: BRAND }}>
                    <div className={clsx('grid divide-x divide-black/15',
                        levels.length === 3 ? 'grid-cols-2 sm:grid-cols-4' : levels.length === 2 ? 'grid-cols-3' : levels.length === 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                        <div className="px-4 py-3">
                            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/60 mb-1">
                                Kuber Verdict
                            </p>
                            <p className="text-[26px] font-black text-black leading-none">{rec}</p>
                        </div>
                        {levels.map(({ label, value }) => (
                            <div key={label} className="px-4 py-3">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/60 mb-1">
                                    {label}
                                </p>
                                <p className="text-[20px] font-extrabold text-black leading-none">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Chart + Today's Market Stats ───────────────────── */}
            {(chart || stats.length > 0) && (
                <div className={clsx('grid gap-3', chart && stats.length > 0 ? 'lg:grid-cols-[1fr_230px]' : 'grid-cols-1')}>
                    {chart && (
                        <Card className="p-3 min-w-0">
                            <StockChart
                                chartData={chart}
                                symbol={symbolLabel}
                                patternOverlays={patternSummary}
                                variant="quick"
                                defaultType="area"
                            />
                        </Card>
                    )}
                    {stats.length > 0 && (
                        <Card className="px-4 py-3.5 self-start">
                            <CardHeader>Today's Market Stats</CardHeader>
                            <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                                {stats.map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between gap-2 py-2">
                                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
                                        <span className="text-[12px] font-semibold text-zinc-900 dark:text-white text-right">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* ── KUBER AI SCORE ─────────────────────────────────── */}
            {hasScores && (
                <>
                    <div className="rounded-xl px-4 py-2.5" style={{ backgroundColor: BRAND }}>
                        <span className="text-[13px] font-black uppercase tracking-[0.15em] text-black">
                            Kuber AI Score
                        </span>
                    </div>
                    <div className={clsx('grid gap-3 grid-cols-1',
                        subScores.length > 0 ? 'sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]' : '')}>
                        {overallScore != null && (
                            <Card className="p-4 flex items-center gap-4 sm:col-span-2 lg:col-span-1 !border-[#FDD405]/70 dark:!border-[#FDD405]/50">
                                <div className="flex-shrink-0">
                                    <ScoreRing score={overallScore} size={92} color={BRAND} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight">
                                        Overall Health
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                                        The stock's combined Kuber AI Score across all three lenses.
                                    </p>
                                </div>
                            </Card>
                        )}
                        {subScores.map(({ key, score, desc }) => (
                            <Card key={key} className="p-4 flex flex-col items-center text-center">
                                <ScoreRing score={score} size={76} stroke={8} color={scoreColor(score)} />
                                <span className="mt-2.5 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider text-black"
                                      style={{ backgroundColor: scoreColor(score) }}>
                                    {key}
                                </span>
                                <span className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{desc}</span>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* ── Key Takeaway ───────────────────────────────────── */}
            {takeaways.length > 0 && (
                <Card className="px-4 py-3.5">
                    <CardHeader>Key Takeaway</CardHeader>
                    <ul className="mt-2 space-y-2">
                        {takeaways.map((t, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
                                <span className="flex-1 min-w-0"><InlineMd>{t}</InlineMd></span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* ── Recent News ────────────────────────────────────── */}
            {newsItems.length > 0 && (
                <Card className="px-4 py-3.5">
                    <CardHeader>Recent News</CardHeader>
                    <div className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                        {newsItems.map((h, i) => {
                            const meta = h?.time_ago || h?.published || h?.source || '';
                            return (
                                <div key={`${i}-${(h?.title || '').slice(0, 40)}`} className="flex items-center justify-between gap-3 py-2.5">
                                    {h?.url ? (
                                        <a href={h.url} target="_blank" rel="noopener noreferrer"
                                           className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 hover:text-amber-700 dark:hover:text-[#FDD405] hover:underline transition-colors flex-1 min-w-0">
                                            {h.title || 'Untitled'}
                                        </a>
                                    ) : (
                                        <p className="text-[12.5px] text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2 flex-1 min-w-0">
                                            {h?.title || 'Untitled'}
                                        </p>
                                    )}
                                    {meta && (
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0 text-right text-amber-700 dark:text-[#FDD405]">
                                            {meta}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* ── Footer strip ───────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Say Kuber to the market
                </span>
                <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
                    Kuber AI
                </span>
            </div>
        </div>
    );
};

export default QuickAnswer;
