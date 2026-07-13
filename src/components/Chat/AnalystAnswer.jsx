import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Gauge, PieChart, Newspaper, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import StockChart from './StockChart';
import {
    BRAND, fmtINR, InlineMd, Card, MiniLabel, SectionBanner,
    CompanyCard, VerdictBand, MarketStatsCard, buildMarketStats,
    ScoreGrid, getScores, ScorecardHeader, MetricCell, IndicatorsTable,
} from './answerKit';
import {
    TechnicalScoreCard as TechnicalDetailCard,
    FinancialScoreCard as FinancialDetailCard,
    FiveYearScoreCard,
} from './FundamentalCard';
import ManagementSentiment from './ManagementSentiment';
import CompanyFilings from './CompanyFilings';

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
const TechnicalScorecard = ({ tech, technicalSummary, indicatorsTable, score, indicatorsAsOf }) => {
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

            {/* Original interactive detail — full score breakdown + indicators table */}
            {tech && <TechnicalDetailCard tech={tech} />}
            <IndicatorsTable rows={indicatorsTable} asOfDate={indicatorsAsOf} />
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
            {managementSentiment?.summary && (
                <p className="mt-2 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {managementSentiment.summary}
                </p>
            )}

            {/* Original interactive management-tone card — gauge, aspects, quotes */}
            <ManagementSentiment data={managementSentiment} />

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

            {/* Original filings panel — grouped chip links, "backed by N primary documents" */}
            {filingGroups.length > 0 && <CompanyFilings data={companyFilings} />}
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
                         aiTake={aiTake} price={price} />

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
                                indicatorsTable={indicatorsTable} score={scores.technical}
                                indicatorsAsOf={metadata?.indicators_as_of} />

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
