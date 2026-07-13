/* eslint-disable react-refresh/only-export-components -- shared answer-UI kit:
   formatters, parsers and presentational components intentionally live together */
import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * answerKit — shared building blocks for the structured answer layouts
 * (QuickAnswer + AnalystAnswer). One design system: brand-yellow bands,
 * near-black cards, donut score rings, tiny uppercase labels.
 */

export const BRAND = '#FDD405';

/* ─── formatters ─────────────────────────────────────────────────────────── */
export const fmtINR = (n, digits = 0) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits })}` : null;

export const fmtNum = (n) =>
    n != null ? Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : null;

export const fmtVol = (v) => {
    if (!v || v <= 0) return null;
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
};

/* ─── inline markdown (bold/italic/links only, no block wrappers) ────────── */
export const InlineMd = ({ children }) => (
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

/* ─── primitives ─────────────────────────────────────────────────────────── */
export const Card = ({ className, children }) => (
    <div className={clsx(
        'rounded-2xl border bg-white border-zinc-200 dark:bg-[#141312] dark:border-zinc-800',
        className
    )}>
        {children}
    </div>
);

export const CardHeader = ({ children }) => (
    <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white">{children}</h4>
);

/* Tiny uppercase label — "WHY THIS VERDICT", "KEY INDICATORS", … */
export const MiniLabel = ({ children, className }) => (
    <p className={clsx(
        'text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-600 dark:text-[#FDD405]',
        className
    )}>
        {children}
    </p>
);

/* Full-width yellow section banner — "KUBER AI SCORE", "PATTERN DETECTION" */
export const SectionBanner = ({ children }) => (
    <div className="rounded-xl px-4 py-2.5" style={{ backgroundColor: BRAND }}>
        <span className="text-[13px] font-black uppercase tracking-[0.15em] text-black">
            {children}
        </span>
    </div>
);

/* ─── donut score ring ───────────────────────────────────────────────────── */
export const ScoreRing = ({ score, size = 88, stroke = 9, color }) => {
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

export const scoreColor = (s) => (s >= 70 ? '#22c55e' : s >= 50 ? BRAND : '#ef4444');

/* ─── verdict helpers ────────────────────────────────────────────────────── */
export const deriveVerdict = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return null;
    if (/\b(buy|accumulate|bullish|breakout)\b/.test(raw)) return 'BUY';
    if (/\b(sell|exit|avoid|bearish|breakdown)\b/.test(raw)) return 'SELL';
    if (/\b(hold|wait|neutral|sideways)\b/.test(raw)) return 'HOLD';
    return null;
};

/* Parse ₹ levels (entry / stop loss / target) out of the answer text when the
   structured signal doesn't carry them. Handles "Entry ₹818", "🛑 Stop ₹802",
   "**Target** ₹850", "target of Rs 1,850" and ranges like "₹810–818". */
const LEVEL_CONNECT = '(?:\\s+(?:price|zone|level|point|of|at|near|around))?[\\*_]*\\s*[:=–—-]?\\s*[\\*_]*\\s*';
const LEVEL_NUM = '(?:rs\\.?|₹)?\\s*([\\d,]+(?:\\.\\d+)?)(?!\\s*%)(?:\\s*[–—-]\\s*(?:rs\\.?|₹)?\\s*([\\d,]+(?:\\.\\d+)?))?';
const LEVEL_RES = {
    entry:  new RegExp('\\bentry' + LEVEL_CONNECT + LEVEL_NUM, 'i'),
    stop:   new RegExp('\\bstop(?:[\\s-]*loss)?' + LEVEL_CONNECT + LEVEL_NUM, 'i'),
    target: new RegExp('\\btarget' + LEVEL_CONNECT + LEVEL_NUM, 'i'),
};

export const extractLevelsFromText = (text, refPrice = null) => {
    const t = String(text || '');
    const toNum = (s) => {
        const n = Number(String(s ?? '').replace(/,/g, ''));
        return Number.isFinite(n) && n > 0 ? n : null;
    };
    // Sanity: a real trading level sits in the vicinity of the current price —
    // rejects years ("2026"), percentages and stray small numbers.
    const plausible = (n) => n != null && (refPrice == null || (n >= refPrice * 0.3 && n <= refPrice * 3));
    const grab = (re) => {
        const m = t.match(re);
        if (!m) return null;
        const lo = toNum(m[1]);
        if (!plausible(lo)) return null;
        const hi = toNum(m[2]);
        return { lo, hi: plausible(hi) ? hi : null };
    };
    return {
        entry: grab(LEVEL_RES.entry),
        stop: grab(LEVEL_RES.stop),
        target: grab(LEVEL_RES.target),
    };
};

/* ─── Company card — name · NSE:SYM chips · price · day change ───────────── */
export const CompanyCard = ({ metadata = {}, symbolLabel = '' }) => {
    const aag = metadata?.at_a_glance || {};
    const companyName = aag.company_name || aag.display_name || symbolLabel;
    const price = aag.price != null ? Number(aag.price) : null;
    const pct = aag.change_percent != null ? Number(aag.change_percent) : null;
    const absChange = price != null && pct != null ? price - price / (1 + pct / 100) : null;
    const isUp = pct != null ? pct >= 0 : true;

    if (!companyName && price == null) return null;
    return (
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
    );
};

/* ─── KUBER VERDICT band — BUY/SELL/HOLD + Entry / Stop Loss / Target ────── */
export const VerdictBand = ({ signal, verdictText, content, aiTake, price }) => {
    const rec = signal?.recommendation
        ? String(signal.recommendation).toUpperCase()
        : deriveVerdict(verdictText || content);
    if (!rec) return null;

    const levelSourceText = [
        verdictText,
        content,
        ...(Array.isArray(signal?.why) ? signal.why : []),
        ...(Array.isArray(aiTake?.bullets) ? aiTake.bullets.map(b => b?.text) : []),
    ].filter(Boolean).join('\n');
    const textLevels = extractLevelsFromText(levelSourceText, price);
    const fmtLevel = (sigVal, parsed) => {
        if (sigVal != null) return fmtINR(sigVal, 2);
        if (!parsed) return null;
        return parsed.hi ? `₹${fmtNum(parsed.lo)}–${fmtNum(parsed.hi)}` : fmtINR(parsed.lo, 2);
    };
    const levels = [
        { label: 'Entry', value: fmtLevel(signal?.ideal_entry, textLevels.entry) },
        { label: 'Stop Loss', value: fmtLevel(signal?.stop_loss, textLevels.stop) },
        { label: 'Target', value: fmtLevel(signal?.target, textLevels.target) },
    ].filter(l => l.value);

    return (
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
    );
};

/* ─── Today's Market Stats card ──────────────────────────────────────────── */
export const buildMarketStats = (aag = {}) => [
    aag.open != null && { label: 'Open', value: fmtINR(aag.open) },
    aag.high != null && { label: 'High', value: fmtINR(aag.high) },
    aag.low != null && { label: 'Low', value: fmtINR(aag.low) },
    aag.high != null && aag.low != null && { label: 'Range', value: `${fmtNum(aag.low)}–${fmtNum(aag.high)}` },
    aag.volume > 0 && { label: 'Volume', value: fmtVol(aag.volume) },
    aag['52w_low'] != null && aag['52w_high'] != null && { label: '52w', value: `${fmtNum(aag['52w_low'])}–${fmtNum(aag['52w_high'])}` },
].filter(Boolean);

export const MarketStatsCard = ({ stats }) => {
    if (!stats?.length) return null;
    return (
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
    );
};

/* ─── KUBER AI SCORE — overall donut + technical/fundamental/sentimental ─── */
export const getScores = (scoreCard, managementSentiment) => {
    const comp = scoreCard?.overall?.components || {};
    const normalize = (v) => (v != null && v <= 10 ? v * 10 : v);
    return {
        overall: scoreCard?.overall?.score ?? null,
        technical: comp.technical ?? scoreCard?.technical?.score ?? null,
        fundamental: comp.financial ?? normalize(scoreCard?.fundamental?.score) ?? null,
        sentimental: comp.management ?? managementSentiment?.tone_score ?? null,
    };
};

export const ScoreGrid = ({ scoreCard, managementSentiment }) => {
    const { overall, technical, fundamental, sentimental } = getScores(scoreCard, managementSentiment);
    const subScores = [
        { key: 'TECHNICAL', score: technical, desc: 'Price, momentum, volume' },
        { key: 'FUNDAMENTAL', score: fundamental, desc: 'Financial health, valuation' },
        { key: 'SENTIMENTAL', score: sentimental, desc: 'News, filings, mood' },
    ].filter(s => s.score != null);
    if (overall == null && subScores.length === 0) return null;

    return (
        <div className={clsx('grid gap-3 grid-cols-1',
            subScores.length > 0 ? 'sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]' : '')}>
            {overall != null && (
                <Card className="p-4 flex items-center gap-4 sm:col-span-2 lg:col-span-1 !border-[#FDD405]/70 dark:!border-[#FDD405]/50">
                    <div className="flex-shrink-0">
                        <ScoreRing score={overall} size={92} color={BRAND} />
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
    );
};

/* ─── Scorecard section header — icon circle + title + score/label ───────── */
export const ScorecardHeader = ({ icon: Icon, title, score, label }) => (
    <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: BRAND }}>
            <Icon size={16} className="text-black" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
            <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight">{title}</p>
            {score != null && (
                <p className="text-[11px] font-extrabold tracking-wider text-amber-600 dark:text-[#FDD405] mt-0.5 uppercase">
                    {Math.round(score)}/100{label ? ` · ${label}` : ''}
                </p>
            )}
        </div>
    </div>
);

/* ─── metric cell — tiny label / big value / footnote ────────────────────── */
export const MetricCell = ({ label, value, note }) => (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/30 px-3 py-2.5 min-w-0">
        <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-1 truncate">{label}</p>
        <p className="text-[17px] font-extrabold text-zinc-900 dark:text-white leading-none truncate">{value}</p>
        {note && <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1.5 uppercase tracking-wide truncate">{note}</p>}
    </div>
);
