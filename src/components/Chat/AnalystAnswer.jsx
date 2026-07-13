import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Gauge, PieChart, Newspaper, ChevronDown, ChevronUp, ExternalLink, BookText, Mic2, BarChart3, Megaphone, FileText } from 'lucide-react';
import StockChart from './StockChart';
import {
    BRAND, fmtINR, InlineMd, Card, MiniLabel, SectionBanner,
    CompanyCard, VerdictBand, MarketStatsCard, buildMarketStats,
    ScoreGrid, getScores, ScorecardHeader, MetricCell,
} from './answerKit';
import {
    TechnicalScoreCard as TechnicalDetailCard,
    FinancialScoreCard as FinancialDetailCard,
    FiveYearScoreCard,
} from './FundamentalCard';

/**
 * AnalystAnswer — "one tap deeper" layout for Analyst mode.
 * Same stock, same verdict, now with the full working behind it:
 *   1. Company card + KUBER VERDICT band (same as Quick)
 *   2. WHY THIS VERDICT card (+ expandable full analysis)
 *   3. Chart + Today's Market Stats
 *   4. PATTERN DETECTION — candle chart with overlays + pattern/volume/bias cells
 *   5. KUBER AI SCORE — same donut row as Quick
 *   6. Technical Scorecard — key indicators grid + commentary
 *   7. Fundamental Scorecard — health report grid + pros and cons
 *   8. Sentimental Scorecard — annual report intel, announcements, filings
 * Every section renders only when its data exists.
 */

/* label classifiers — mirror FundamentalCard's rating buckets */
const isGoodLabel = (l) =>
    /EXCEPTIONAL|STRONG|CHEAP|ELITE|ZERO.?DEBT|ATTRACTIVE|ABOVE.?AVG|RISING|#\d|STABLE.?HIGH|NEW/i.test(l || '');
const isNeutralLabel = (l) =>
    /AVERAGE|MODERATE|WATCH|STABILIZ|FAIR/i.test(l || '');

const scoreWord = (s, kind) => {
    if (s == null) return null;
    if (kind === 'sent') return s >= 70 ? 'Positive' : s >= 50 ? 'Balanced' : 'Cautious';
    return s >= 70 ? 'Strong' : s >= 50 ? 'Moderate' : 'Weak';
};

/* Use the backend's own label only when it belongs to the score being shown —
   otherwise derive one, so "78/100" never pairs with a stale "Neutral". */
const labelFor = (providedLabel, ownScore, shownScore, kind) => {
    const own = ownScore != null && ownScore <= 10 ? ownScore * 10 : ownScore;
    if (providedLabel && own != null && shownScore != null && Math.abs(own - shownScore) <= 2) return providedLabel;
    return scoreWord(shownScore, kind);
};

/* Compact markdown for the expandable full analysis */
const proseComponents = {
    p: ({ children }) => <p className="mb-3 last:mb-0 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-zinc-900 dark:text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-zinc-500 dark:text-zinc-400">{children}</em>,
    h1: ({ children }) => <p className="mt-4 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-zinc-800 dark:text-zinc-100">{children}</p>,
    h2: ({ children }) => <p className="mt-4 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-zinc-800 dark:text-zinc-100">{children}</p>,
    h3: ({ children }) => <p className="mt-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">{children}</p>,
    ul: ({ children }) => <ul className="my-2 space-y-1.5 list-none pl-0">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 space-y-1.5 list-decimal list-inside">{children}</ol>,
    li: ({ children }) => (
        <li className="flex items-start gap-2 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
            <span className="mt-[7px] w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
            <span className="flex-1 min-w-0">{children}</span>
        </li>
    ),
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer"
           className="underline underline-offset-2 text-amber-700 dark:text-[#FDD405]">{children}</a>
    ),
    table: ({ children }) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full border-collapse text-[12px]">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-[#FDD405]">{children}</thead>,
    th: ({ children }) => <th className="px-3 py-2 text-left font-bold text-black">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300 border-t border-zinc-100 dark:border-zinc-800">{children}</td>,
    blockquote: ({ children }) => <div className="my-2 pl-3 border-l-2 border-[#FDD405] text-zinc-600 dark:text-zinc-300">{children}</div>,
    hr: () => <hr className="my-3 border-zinc-200 dark:border-zinc-800" />,
    code: ({ children }) => <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">{children}</code>,
};

/* First real paragraph of the answer — the "why" summary when no verdict text */
const firstParagraph = (md) => {
    const blocks = String(md || '').split(/\n{2,}/);
    for (const b of blocks) {
        const t = b.trim();
        if (!t) continue;
        if (/^#{1,6}\s/.test(t) || /^[-*•]\s/.test(t) || /^\|/.test(t) || /^>/.test(t)) continue;
        return t;
    }
    return null;
};

/* ─── WHY THIS VERDICT ───────────────────────────────────────────────────── */
const WhyThisVerdict = ({ verdictText, content, signal }) => {
    const [open, setOpen] = React.useState(false);
    const summary = verdictText
        || firstParagraph(content)
        || (Array.isArray(signal?.why) && signal.why.length ? signal.why.join(' ') : null);
    const hasFull = typeof content === 'string' && content.trim().length > (summary || '').length + 80;
    if (!summary && !hasFull) return null;

    return (
        <Card className="px-4 py-3.5">
            <MiniLabel>Why this verdict</MiniLabel>
            {summary && (
                <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    <InlineMd>{summary.replace(/^\**\s*verdict\s*:?\**\s*/i, '')}</InlineMd>
                </div>
            )}
            {hasFull && (
                <>
                    {open && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.15em]
                                   text-zinc-400 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-[#FDD405] transition-colors">
                        {open ? <>Hide full analysis <ChevronUp size={11} /></> : <>Read full analysis <ChevronDown size={11} /></>}
                    </button>
                </>
            )}
        </Card>
    );
};

/* ─── PATTERN DETECTION ──────────────────────────────────────────────────── */
const PatternSection = ({ patternSummary, chartData, symbolLabel, indicatorsTable }) => {
    if (!patternSummary) return null;
    const cp = (Array.isArray(patternSummary.chart_pattern_details) ? patternSummary.chart_pattern_details : [])
        .find(p => p && (p.name || p.direction)) || null;
    const support = patternSummary.support;
    const resistance = patternSummary.resistance;
    const summaryText = patternSummary.summary;

    const chart = Array.isArray(chartData)
        ? chartData.find(cd => cd && !cd.error) || null
        : (chartData && !chartData.error ? chartData : null);

    const volRow = (Array.isArray(indicatorsTable) ? indicatorsTable : [])
        .find(r => /volume/i.test(r?.indicator || ''));

    const patternCellText = cp
        ? `${cp.name || 'Pattern'}${resistance != null ? `, breakout above ${fmtINR(resistance)}` : cp.direction ? ` — ${cp.direction}` : ''}`
        : summaryText;
    const volumeCellText = volRow
        ? `${volRow.value || ''}${volRow.signal ? ` — ${volRow.signal}` : ''}`.trim()
        : null;
    const biasCellText = (() => {
        const dir = cp?.direction;
        if (dir === 'bearish' && resistance != null) return `Bearish below ${fmtINR(resistance)} resistance`;
        if (dir === 'bearish' && support != null) return `Bearish while under ${fmtINR(support)}`;
        if (support != null) return `Bullish while above ${fmtINR(support)} support`;
        if (resistance != null) return `Watch ${fmtINR(resistance)} resistance`;
        return null;
    })();
    const cells = [
        patternCellText && { label: 'Pattern', text: patternCellText },
        volumeCellText && { label: 'Volume', text: volumeCellText },
        biasCellText && { label: 'Bias', text: biasCellText },
    ].filter(Boolean);

    if (!chart && cells.length === 0) return null;

    return (
        <>
            <SectionBanner>Pattern Detection</SectionBanner>
            <Card className="p-3">
                {chart && (
                    <StockChart
                        chartData={chart}
                        symbol={symbolLabel}
                        patternOverlays={patternSummary}
                        variant="quick"
                        defaultType="candle"
                    />
                )}
                {cells.length > 0 && (
                    <div className={clsx('grid gap-3 mt-1', cells.length === 3 ? 'sm:grid-cols-3' : cells.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
                        {cells.map(({ label, text }) => (
                            <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/30 px-3 py-2.5">
                                <MiniLabel className="mb-1">{label}</MiniLabel>
                                <p className="text-[11.5px] leading-snug text-zinc-700 dark:text-zinc-200">{text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </>
    );
};

/* ─── TECHNICAL SCORECARD ────────────────────────────────────────────────── */
const TechnicalScorecard = ({ tech, technicalSummary, indicatorsTable, score }) => {
    const rows = Array.isArray(indicatorsTable) ? indicatorsTable.slice(0, 8) : [];
    const fallbackCells = [];
    if (!rows.length && technicalSummary) {
        const { rsi, macd_line, macd, bb_pct_b, volatility_30d_pct } = technicalSummary;
        const macdVal = macd_line ?? macd;
        if (rsi != null) fallbackCells.push({ label: 'RSI', value: Number(rsi).toFixed(1), note: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Momentum healthy' });
        if (macdVal != null) fallbackCells.push({ label: 'MACD', value: macdVal > 0 ? '+ve' : '-ve', note: macdVal > 0 ? 'Bullish crossover' : 'Bearish momentum' });
        if (bb_pct_b != null) fallbackCells.push({ label: 'Bollinger %B', value: `${Math.round(bb_pct_b * 100)}%`, note: 'Band position' });
        if (volatility_30d_pct != null) fallbackCells.push({ label: '30d Volatility', value: `${Number(volatility_30d_pct).toFixed(1)}%`, note: 'Annualized' });
    }
    const cells = rows.length
        ? rows.map(r => ({ label: r.indicator, value: r.value || '—', note: r.signal }))
        : fallbackCells;
    const commentary = Array.isArray(tech?.commentary) ? tech.commentary.slice(0, 3) : [];
    if (score == null && cells.length === 0 && commentary.length === 0) return null;

    return (
        <Card className="p-4">
            <ScorecardHeader icon={Gauge} title="Technical Scorecard"
                             score={score} label={labelFor(tech?.label, tech?.score, score)} />
            {cells.length > 0 && (
                <>
                    <MiniLabel className="mt-4">Key indicators</MiniLabel>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {cells.map((c, i) => <MetricCell key={`${c.label}-${i}`} {...c} />)}
                    </div>
                </>
            )}
            {commentary.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                    {commentary.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
                            {t}
                        </li>
                    ))}
                </ul>
            )}

            {/* Original interactive detail — full score breakdown */}
            {tech && <TechnicalDetailCard tech={tech} />}
        </Card>
    );
};

/* ─── FUNDAMENTAL SCORECARD ──────────────────────────────────────────────── */
const RATIO_DEFS = {
    pe_ratio:       { label: 'P/E Ratio',    fmt: (v) => `${Number(v).toFixed(1)}x`,  noteFromThr: (t) => t != null ? `Sector ${Number(t).toFixed(1)}` : null, name: 'P/E' },
    roe:            { label: 'ROE',           fmt: (v) => `${Number(v).toFixed(1)}%`, name: 'ROE' },
    roce:           { label: 'ROCE',          fmt: (v) => `${Number(v).toFixed(1)}%`, name: 'ROCE' },
    net_margin:     { label: 'Net Margin',    fmt: (v) => `${Number(v).toFixed(1)}%`, name: 'Net margin' },
    debt_equity:    { label: 'Debt/Equity',   fmt: (v) => Number(v).toFixed(2),       name: 'Debt/equity' },
    revenue_growth: { label: 'Rev Growth',    fmt: (v) => `${Number(v).toFixed(1)}%`, note: 'YoY',  name: 'Revenue growth' },
    profit_growth:  { label: 'Profit Growth', fmt: (v) => `${Number(v).toFixed(1)}%`, note: 'YoY',  name: 'Profit growth' },
    dividend_yield: { label: 'Div Yield',     fmt: (v) => `${Number(v).toFixed(2)}%`, name: 'Dividend yield' },
};

const getRatio = (v) => {
    if (v == null) return [null, null, null];
    if (Array.isArray(v)) return [v[0] ?? null, v[1] ?? null, v[2] ?? null];
    if (typeof v === 'object') return [v.value ?? null, v.threshold ?? null, v.label ?? null];
    return [v, null, null];
};

const FundamentalScorecard = ({ fund, score, symbolLabel }) => {
    if (!fund) return null;
    const ratios = fund.ratios || {};

    const cells = [];
    const pros = [];
    const cons = [];
    Object.entries(RATIO_DEFS).forEach(([key, def]) => {
        const [value, threshold, label] = getRatio(ratios[key]);
        if (value == null) return;
        if (cells.length < 8) {
            cells.push({
                label: def.label,
                value: def.fmt(value),
                note: label || (def.noteFromThr ? def.noteFromThr(threshold) : def.note) || null,
            });
        }
        if (label) {
            const line = `${def.name} ${def.fmt(value)} — ${String(label).toLowerCase()}`;
            if (isGoodLabel(label)) pros.push(line);
            else if (!isNeutralLabel(label)) cons.push(line);
            else cons.push(line); // neutral reads as a caution in the pros/cons split
        }
    });

    if (score == null && cells.length === 0) return null;

    return (
        <Card className="p-4">
            <ScorecardHeader icon={PieChart} title="Fundamental Scorecard"
                             score={score} label={labelFor(fund.label, fund.score, score)} />
            {fund.summary && (
                <p className="mt-2 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{fund.summary}</p>
            )}
            {cells.length > 0 && (
                <>
                    <MiniLabel className="mt-4">Health report</MiniLabel>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {cells.map((c, i) => <MetricCell key={`${c.label}-${i}`} {...c} />)}
                    </div>
                </>
            )}
            {(pros.length > 0 || cons.length > 0) && (
                <>
                    <MiniLabel className="mt-4">Pros and cons</MiniLabel>
                    <div className="mt-2 grid sm:grid-cols-2 gap-2.5">
                        {pros.length > 0 && (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">Pros</p>
                                <ul className="space-y-1">
                                    {pros.slice(0, 4).map((t, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                                            <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0 bg-emerald-500" />
                                            {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {cons.length > 0 && (
                            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">Cons</p>
                                <ul className="space-y-1">
                                    {cons.slice(0, 4).map((t, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
                                            <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0 bg-amber-500" />
                                            {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Original interactive detail — full ratio tables, 5-year history, peer rank */}
            <FinancialDetailCard fund={fund} symbol={symbolLabel} />
            {fund?.historical && <FiveYearScoreCard fund={fund} />}
        </Card>
    );
};

/* ─── SENTIMENTAL SCORECARD ──────────────────────────────────────────────── */
/* Collapsible dropdown block — yellow mini-label header, chevron toggle */
const SentimentBlock = ({ label, badge = null, defaultOpen = true, children }) => {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/30 px-3.5 py-3">
            <button onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                    aria-expanded={open}>
                <span className="flex items-center gap-2 min-w-0">
                    <MiniLabel>{label}</MiniLabel>
                    {badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-[#FDD405]/10 text-amber-600 dark:text-[#FDD405]/90 flex-shrink-0">
                            {badge}
                        </span>
                    )}
                </span>
                {open ? <ChevronUp size={13} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                      : <ChevronDown size={13} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />}
            </button>
            {open && (
                <div className="mt-2 text-[11.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
            )}
        </div>
    );
};

const fmtDevDate = (d) => {
    if (!d) return '';
    try {
        const dt = new Date(d);
        return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return ''; }
};

/* ── management tone — same data/behaviour as the classic Management Sentiment card ── */
const toneColor = (s) =>
    s >= 70 ? '#22c55e' :
    s >= 50 ? BRAND :
    s >= 35 ? '#fb923c' : '#ef4444';

const SENT_META = {
    bullish: { color: '#22c55e', label: 'Positive' },
    neutral: { color: '#FDD405', label: 'Neutral' },
    bearish: { color: '#ef4444', label: 'Cautious' },
};

const aspectText = (key, sentiment) => {
    const s = (sentiment || 'neutral').toLowerCase();
    if (key === 'risks') return s === 'bullish' ? 'Contained' : s === 'bearish' ? 'Elevated' : 'Moderate';
    return (SENT_META[s] || SENT_META.neutral).label;
};

/* Compact multi-quarter tone sparkline */
const ToneSparkline = ({ history, color }) => {
    if (!Array.isArray(history) || history.length < 2) return null;
    const w = 132, h = 34, pad = 4;
    const scores = history.map(p => p.score);
    const min = Math.min(...scores, 0), max = Math.max(...scores, 100);
    const span = max - min || 1;
    const x = (i) => pad + (i * (w - 2 * pad)) / (history.length - 1);
    const y = (s) => h - pad - ((s - min) / span) * (h - 2 * pad);
    const pts = history.map((p, i) => `${x(i)},${y(p.score)}`).join(' ');
    const last = history[history.length - 1];
    return (
        <div className="flex flex-col items-end">
            <svg width={w} height={h} className="overflow-visible">
                <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75}
                    strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
                {history.map((p, i) => (
                    <circle key={i} cx={x(i)} cy={y(p.score)} r={i === history.length - 1 ? 3 : 2}
                        fill={i === history.length - 1 ? color : 'rgba(128,128,128,0.5)'} />
                ))}
            </svg>
            <div className="flex justify-between w-[132px] mt-0.5">
                <span className="text-[8.5px] text-zinc-400 dark:text-zinc-600">{history[0].period}</span>
                <span className="text-[8.5px] font-semibold" style={{ color }}>{last.period}</span>
            </div>
        </div>
    );
};

const MgmtToneContent = ({ data }) => {
    const [showBreakdown, setShowBreakdown] = React.useState(false);
    const score = Math.round(data.tone_score);
    const color = toneColor(score);
    const aspects = Array.isArray(data.aspects) ? data.aspects : [];
    const quotes = Array.isArray(data.quotes) ? data.quotes.filter(q => q && q.text) : [];
    const breakdown = Array.isArray(data.breakdown) ? data.breakdown : [];
    const history = Array.isArray(data.history) ? data.history : [];
    const trend = data.trend;

    const r = 34, cx = 44, cy = 44, circ = 2 * Math.PI * r;
    const filled = (score / 100) * circ;

    const trendMeta = trend && {
        up: { c: '#22c55e', a: '↑', t: `Improving vs ${trend.prev_quarter || 'prev qtr'}` },
        down: { c: '#ef4444', a: '↓', t: `Softening vs ${trend.prev_quarter || 'prev qtr'}` },
        flat: { c: '#a1a1aa', a: '→', t: `Stable vs ${trend.prev_quarter || 'prev qtr'}` },
    }[trend.direction];

    return (
        <>
            {/* Gauge + tone + sparkline */}
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
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">{data.summary}</div>
                    )}
                </div>
                {history.length >= 2 && (
                    <div className="flex-shrink-0 hidden sm:block">
                        <div className="text-[8.5px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600 text-right mb-0.5">Tone trend</div>
                        <ToneSparkline history={history} color={color} />
                    </div>
                )}
            </div>

            {/* Aspect chips */}
            {aspects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {aspects.map((a) => {
                        const meta = SENT_META[(a.sentiment || 'neutral').toLowerCase()] || SENT_META.neutral;
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

            {/* Expandable management breakdown */}
            {breakdown.length > 0 && (
                <div className="mt-3">
                    <button onClick={() => setShowBreakdown(s => !s)}
                        className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 inline-flex items-center gap-1">
                        {showBreakdown ? '▾' : '▸'} Management breakdown
                    </button>
                    {showBreakdown && (
                        <div className="mt-2 space-y-2">
                            {breakdown.map((b) => (
                                <div key={b.key} className="text-[11.5px] leading-relaxed">
                                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">{b.label}: </span>
                                    <span className="text-zinc-500 dark:text-zinc-400">{b.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
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
                                   className="not-italic ml-1 text-[10px] font-semibold" style={{ color }}>↗ source</a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3 text-[9.5px] text-zinc-400 dark:text-zinc-600">
                Derived from management commentary, guidance &amp; Q&amp;A in company filings. Not investment advice.
            </div>
        </>
    );
};

/* ── filings chips — same data/behaviour as the classic Company Filings panel ── */
const FILING_ICON = {
    annual_report: BookText,
    transcript: Mic2,
    investor_presentation: BarChart3,
    announcement: Megaphone,
    quarterly_results: FileText,
};

const fmtFilingDate = (d) => {
    if (!d) return null;
    try {
        const dt = new Date(d);
        return isNaN(dt) ? null : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return null; }
};

// Announcements rarely have a clean quarter — prefer the date; else the period; else a clipped title.
const filingChipLabel = (type, item) => {
    if (type === 'announcement') return fmtFilingDate(item.date) || item.period || (item.title || '').slice(0, 22);
    return item.period || fmtFilingDate(item.date) || (item.title || '').slice(0, 22);
};

const SEV_COLOR = { high: '#ef4444', medium: '#fb923c', low: '#22c55e' };

/* Clickable doc/announcement title — opens the source in a new tab */
const DocLink = ({ url, children }) => url ? (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="inline-flex items-start gap-1 text-zinc-700 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-[#FDD405] hover:underline transition-colors">
        <span className="flex-1 min-w-0">{children}</span>
        <ExternalLink size={10} className="mt-[3px] flex-shrink-0 opacity-60" />
    </a>
) : <span>{children}</span>;

const SentimentalScorecard = ({ managementSentiment, annualReportIntelligence, recentDevelopments, companyFilings, score }) => {
    const ari = annualReportIntelligence;
    const devItems = Array.isArray(recentDevelopments?.items) ? recentDevelopments.items.slice(0, 4) : [];
    const filingGroups = Array.isArray(companyFilings?.groups) ? companyFilings.groups.filter(g => g?.count > 0) : [];
    const hasAny = score != null || managementSentiment?.summary || ari?.company_story || devItems.length > 0 || filingGroups.length > 0;
    if (!hasAny) return null;

    const drivers = Array.isArray(ari?.growth_drivers) ? ari.growth_drivers.slice(0, 3) : [];
    const risks = Array.isArray(ari?.risk_radar) ? ari.risk_radar.slice(0, 4) : [];

    return (
        <Card className="p-4">
            <ScorecardHeader icon={Newspaper} title="Sentimental Scorecard"
                             score={score}
                             label={labelFor(managementSentiment?.tone_label, managementSentiment?.tone_score, score, 'sent')} />
            {/* Management tone — gauge, aspects, breakdown, quotes (themed block) */}
            {managementSentiment?.tone_score != null && (
                <SentimentBlock label="Management sentiment"
                                badge={managementSentiment.period ? `${managementSentiment.period} · earnings calls` : 'from earnings calls'}>
                    <MgmtToneContent data={managementSentiment} />
                </SentimentBlock>
            )}

            {ari?.company_story && (
                <SentimentBlock label="Annual report intelligence"
                                badge={ari.fiscal_year || (ari.confidence != null ? `${Math.round(ari.confidence * 100)}% confidence` : null)}>
                    {ari.company_story}
                    {ari.future_outlook ? ` ${ari.future_outlook}` : ''}
                    {drivers.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {drivers.map((d, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                    <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
                                    {d}
                                </li>
                            ))}
                        </ul>
                    )}
                    {risks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {risks.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold border"
                                      style={{ color: SEV_COLOR[r?.severity] || SEV_COLOR.medium,
                                               borderColor: `${SEV_COLOR[r?.severity] || SEV_COLOR.medium}55` }}>
                                    {r?.title || r}
                                </span>
                            ))}
                        </div>
                    )}
                    {ari.pdf_url && (
                        <a href={ari.pdf_url} target="_blank" rel="noopener noreferrer"
                           className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]
                                      text-amber-700 dark:text-[#FDD405] hover:underline">
                            Read the full annual report{ari.fiscal_year ? ` ${ari.fiscal_year}` : ''} <ExternalLink size={10} />
                        </a>
                    )}
                </SentimentBlock>
            )}

            {devItems.length > 0 && (
                <SentimentBlock label="Announcements" badge={`${devItems.length} recent`}>
                    <ul className="space-y-2">
                        {devItems.map((it, i) => (
                            <li key={i}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <DocLink url={it.url}>{it.title}</DocLink>
                                    </div>
                                    {fmtDevDate(it.date) && (
                                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-[#FDD405] flex-shrink-0 mt-0.5">
                                            {fmtDevDate(it.date)}
                                        </span>
                                    )}
                                </div>
                                {(it.category || it.summary) && (
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                                        {[it.category, it.summary].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </SentimentBlock>
            )}

            {/* Company filings — same grouped chip links, styled like the blocks above */}
            {filingGroups.length > 0 && (
                <SentimentBlock label="Company filings"
                                badge={companyFilings.total > 0 ? `backed by ${companyFilings.total} primary documents` : null}>
                    <div className="space-y-3">
                        {filingGroups.map((g) => {
                            const Icon = FILING_ICON[g.type] || FileText;
                            return (
                                <div key={g.type || g.label}>
                                    <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 inline-flex items-center gap-1.5">
                                        <Icon size={13} strokeWidth={2} className="text-amber-600 dark:text-[#FDD405]" />
                                        {g.label} <span className="text-zinc-400 dark:text-zinc-600 font-normal">({g.count})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(Array.isArray(g.items) ? g.items : []).map((it, i) => {
                                            const label = filingChipLabel(g.type, it);
                                            return it.url ? (
                                                <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
                                                   title={it.title}
                                                   className="text-[11px] px-2.5 py-1 rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-amber-500/60 dark:hover:border-[#FDD405]/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                    {label}<span className="ml-1 opacity-60">↗</span>
                                                </a>
                                            ) : (
                                                <span key={i} title={it.title}
                                                      className="text-[11px] px-2.5 py-1 rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="text-[9.5px] text-zinc-400 dark:text-zinc-600">
                            Source documents filed with NSE/BSE. Click to open the original PDF.
                        </div>
                    </div>
                </SentimentBlock>
            )}
        </Card>
    );
};

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
const AnalystAnswer = ({
    content,
    verdictText = null,
    metadata = {},
    signal = null,
    scoreCard = null,
    managementSentiment = null,
    annualReportIntelligence = null,
    recentDevelopments = null,
    companyFilings = null,
    aiTake = null,
    chartData = null,
    technicalSummary = null,
    indicatorsTable = null,
    patternSummary = null,
    symbolLabel = '',
}) => {
    const aag = metadata?.at_a_glance || {};
    const price = aag.price != null ? Number(aag.price) : null;
    const stats = buildMarketStats(aag);
    const scores = getScores(scoreCard, managementSentiment);

    const chart = Array.isArray(chartData)
        ? chartData.find(cd => cd && !cd.error) || null
        : (chartData && !chartData.error ? chartData : null);

    const hasScores = scores.overall != null || scores.technical != null
        || scores.fundamental != null || scores.sentimental != null;

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

            <CompanyCard metadata={metadata} symbolLabel={symbolLabel} />

            <VerdictBand signal={signal} verdictText={verdictText} content={content}
                         aiTake={aiTake} price={price} patternSummary={patternSummary} />

            <WhyThisVerdict verdictText={verdictText} content={content} signal={signal} />

            {(chart || stats.length > 0) && (
                <div className={clsx('grid gap-3', chart && stats.length > 0 ? 'lg:grid-cols-[1fr_230px]' : 'grid-cols-1')}>
                    {chart && (
                        <Card className="p-3 min-w-0">
                            <StockChart
                                chartData={chart}
                                symbol={symbolLabel}
                                variant="quick"
                                defaultType="area"
                            />
                        </Card>
                    )}
                    <MarketStatsCard stats={stats} />
                </div>
            )}

            <PatternSection patternSummary={patternSummary} chartData={chartData}
                            symbolLabel={symbolLabel} indicatorsTable={indicatorsTable} />

            {hasScores && (
                <>
                    <SectionBanner>Kuber AI Score</SectionBanner>
                    <ScoreGrid scoreCard={scoreCard} managementSentiment={managementSentiment} />
                </>
            )}

            <TechnicalScorecard tech={scoreCard?.technical} technicalSummary={technicalSummary}
                                indicatorsTable={indicatorsTable} score={scores.technical} />

            <FundamentalScorecard fund={scoreCard?.fundamental} score={scores.fundamental}
                                  symbolLabel={symbolLabel} />

            <SentimentalScorecard
                managementSentiment={managementSentiment}
                annualReportIntelligence={annualReportIntelligence}
                recentDevelopments={recentDevelopments}
                companyFilings={companyFilings}
                score={scores.sentimental}
            />

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

export default AnalystAnswer;
