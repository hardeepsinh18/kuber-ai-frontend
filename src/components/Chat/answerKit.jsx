/* eslint-disable react-refresh/only-export-components -- shared answer-UI kit:
   formatters, parsers and presentational components intentionally live together */
import React from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BRAND, fmtINR, fmtNum, fmtVol, fmtDate, stripAiDashes, scoreColor,
    deriveVerdict, hasVerdict, extractLevelsFromText, extractNearbyLevels,
    MAIN_CARD_DARK, INNER_CARD_DARK, getScores, buildMarketStats,
} from './answerKitCore';

/**
 * answerKit — shared building blocks for the structured answer layouts
 * (QuickAnswer + AnalystAnswer). One design system: brand-yellow bands,
 * near-black cards, donut score rings, tiny uppercase labels.
 *
 * The pure (non-JSX) half -- formatters, verdict/level parsers, shared color
 * constants -- lives in ./answerKitCore.js and is re-exported below
 * unchanged, so every existing consumer's `from '.../answerKit'` import
 * keeps working exactly as before.
 */
export {
    BRAND, fmtINR, fmtNum, fmtVol, fmtDate, stripAiDashes, scoreColor, hasVerdict,
    extractLevelsFromText, MAIN_CARD_DARK, INNER_CARD_DARK, getScores, buildMarketStats,
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
                   className="underline underline-offset-2 font-semibold text-zinc-900 dark:text-[#FDD405]">{c}</a>
            ),
        }}
    >
        {typeof children === 'string' ? stripAiDashes(children) : children}
    </ReactMarkdown>
);

/* ─── primitives ─────────────────────────────────────────────────────────────
 * Uniform two-shade system for the whole answer UI:
 *   MAIN card  = the warm brand dark  (#181613)  — every top-level section card.
 *   INNER tile = the deeper near-black (#0d0c0b)  — every sub-card nested inside.
 * Light mode mirrors it: MAIN = white, INNER = zinc-50 on a white-ish shell.
 * Defined once here and reused so no section drifts to a one-off shade.
 * (MAIN_CARD_DARK/INNER_CARD_DARK themselves now live in answerKitCore.js,
 * imported + re-exported above.) */
export const Card = ({ className, children }) => (
    <div className={clsx(
        'rounded-2xl border bg-white border-zinc-200 dark:bg-[#181613] dark:border-zinc-800',
        className
    )}>
        {children}
    </div>
);

export const CardHeader = ({ children }) => (
    <h4 className="text-[14px] font-bold text-zinc-900 dark:text-white">{children}</h4>
);

/* Tiny uppercase label — "WHY THIS VERDICT", "KEY INDICATORS", … */
/* Brand rule: black on light (the yellow-ink read off-brand on white); the yellow
 * accent stays on dark, where it's on-brand. */
export const MiniLabel = ({ children, className }) => (
    <p className={clsx(
        'text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-900 dark:text-[#FDD405]',
        className
    )}>
        {children}
    </p>
);

/* Collapsible section card — one unified, theme-coloured card whose title lives
 * inside it with a dropdown chevron (no yellow banner, no second card). Used for
 * "Pattern Detection" and "Venty Score" so both read as a single dropdown card
 * that follows the light/dark theme. `defaultOpen` starts expanded. */
export const CollapsibleSection = ({ title, children, defaultOpen = true, className }) => {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
        <Card className={clsx('overflow-hidden', className)}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left
                           hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
            >
                <span className="text-[15px] font-bold text-zinc-900 dark:text-white truncate">
                    {title}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className={clsx('flex-shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200', open && 'rotate-180')}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {/* No border-t on the body: the header and its content are ONE card, and
                a rule between them cut the card in half visually — most obvious on
                "Pattern Detection", where it sat directly under the title. The
                header's own padding already separates the two. */}
            {open && (
                <div className="px-2.5 pb-2.5 pt-0.5 sm:px-3 sm:pb-3 sm:pt-1">
                    {children}
                </div>
            )}
        </Card>
    );
};

/* ─── donut score ring ───────────────────────────────────────────────────── *
 * Single shared ring, consolidating the two prior copies (answerKit's static
 * labelled ring and PortfolioOverlay's animated, unlabelled one):
 *   - `animate` (default off) replays the fill from 0 on mount via a
 *     double-RAF + CSS transition — PortfolioOverlay's health-score ring
 *     wants this; static call sites paint the final value immediately.
 *   - `showLabel` (default on) draws the "score" + "/100" text inside the
 *     ring. PortfolioOverlay overlays its own text on top instead, so it
 *     turns this off (keeping both would double-render the number).
 *   - `color` defaults to the shared scoreColor() 70/50 scale when the
 *     caller doesn't pass one explicitly. */
export const ScoreRing = ({ score, size = 88, stroke = 9, color, animate = false, showLabel = true }) => {
    const s = Math.min(100, Math.max(0, Math.round(score)));
    const ringColor = color ?? scoreColor(s);
    const [animScore, setAnimScore] = React.useState(animate ? 0 : s);

    React.useEffect(() => {
        if (!animate) { setAnimScore(s); return undefined; }
        // Double RAF: first ensures 0 is painted, second triggers the CSS transition
        let raf1, raf2;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setAnimScore(s));
        });
        return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }, [animate, s]);

    const r = (size - stroke) / 2 - 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const filled = (animScore / 100) * circ;
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Score ${s} out of 100`}>
            <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke}
                    className="stroke-zinc-200 dark:stroke-white/10" />
            <circle cx={c} cy={c} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
                    strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${c} ${c})`}
                    style={animate ? { transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' } : undefined} />
            {showLabel && (
                <>
                    <text x={c} y={c - 2} textAnchor="middle" fontSize={size * 0.26} fontWeight="800"
                          fontFamily="Montserrat,sans-serif" className="fill-zinc-900 dark:fill-white">{s}</text>
                    <text x={c} y={c + size * 0.16} textAnchor="middle" fontSize={size * 0.1}
                          fontFamily="Montserrat,sans-serif" className="fill-zinc-400 dark:fill-white/40">/100</text>
                </>
            )}
        </svg>
    );
};

/* ─── verdict/level helpers ──────────────────────────────────────────────────
 * deriveVerdict, hasVerdict, extractLevelsFromText, extractNearbyLevels now
 * live in answerKitCore.js (imported above); hasVerdict and
 * extractLevelsFromText are re-exported unchanged. */

/* Inner sub-card shell — a raised, bordered card meant to sit INSIDE the padded
 * summary hero (cards-inside-a-card). Slightly lighter than the hero background
 * so each section reads as its own tile. */
export const INNER_CARD = 'rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800/80 dark:bg-[#0d0c0b]';

/* Two-letter monogram tile from the symbol/name — a lightweight brand mark that
 * needs no external image (CSP-safe). */
const Monogram = ({ text }) => {
    const initials = String(text || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?';
    return (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10">
            <span className="text-[13px] font-black tracking-tight text-zinc-700 dark:text-zinc-100">{initials}</span>
        </div>
    );
};

/* Logo tile — the company logo served at /api/logos/<SYM>.png (same-origin, so
 * CSP-safe), falling back to the monogram when we ship no logo for that symbol
 * (onError) or there is no symbol. Uses the FULL ticker (incl. .NS/.BO). */
export const LogoTile = ({ symbol, text }) => {
    if (!symbol) return <Monogram text={text} />;
    const initials = String(text || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '?';
    return (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden
                        bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10">
            <img
                src={`/api/logos/${symbol}.png`}
                alt={initials}
                className="w-full h-full object-contain p-1"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
            />
            <span className="hidden w-full h-full items-center justify-center text-[13px] font-black tracking-tight text-zinc-700 dark:text-zinc-100">{initials}</span>
        </div>
    );
};

/* ─── Company card — logo · name · NSE:SYM · price · day change ──────────── */
export const CompanyCard = ({ metadata = {}, symbolLabel = '', flush = false, raised = false }) => {
    const aag = metadata?.at_a_glance || {};
    const companyName = aag.company_name || aag.display_name || symbolLabel;
    const price = aag.price != null ? Number(aag.price) : null;
    const pct = aag.change_percent != null ? Number(aag.change_percent) : null;
    const absChange = price != null && pct != null ? price - price / (1 + pct / 100) : null;
    const isUp = pct != null ? pct >= 0 : true;

    if (!companyName && price == null) return null;
    // `flush` = plain div (legacy). `raised` = bordered inner sub-card that sits
    // inside the padded hero. Otherwise a standalone Card.
    const cls = raised ? INNER_CARD : '';
    const Wrapper = (flush && !raised) ? 'div' : (raised ? 'div' : Card);
    return (
        <Wrapper className={clsx('flex items-center gap-3 px-4 py-3', cls)}>
            <LogoTile symbol={aag.symbol || metadata?.symbols?.[0]} text={symbolLabel || companyName} />
            <div className="flex-1 min-w-0">
                {companyName && (
                    <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight truncate">
                        {companyName}
                    </p>
                )}
                {symbolLabel && (
                    <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 tracking-wide">
                        NSE: {symbolLabel}
                    </p>
                )}
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
                {price != null && (
                    <span className="text-[22px] font-extrabold text-zinc-900 dark:text-white leading-none">
                        {fmtINR(price, 2)}
                    </span>
                )}
                {pct != null && (
                    <span className={clsx(
                        'inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold',
                        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                        {isUp ? '▲' : '▼'}
                        {absChange != null ? ` ${Math.abs(absChange).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ''}
                        {` (${Math.abs(pct).toFixed(2)}%) today`}
                    </span>
                )}
            </div>
        </Wrapper>
    );
};

/* ─── KUBER VERDICT band — BUY/SELL/HOLD + Entry / Stop Loss / Target ────── */
/* ── Deterministic verdict band (reads score_card.verdict from the engine) ────
   Single source of truth for BOTH horizons — the card can no longer disagree
   with the prose, and levels come from the engine (real ATR/swing) or are
   absent. No fabricated ±5%/+10% stops. */
const _shortLevelCells = (lv) => {
    if (!lv || lv.actionable !== true) return [];
    return [
        lv.entry  != null && { label: 'Entry',     value: fmtINR(lv.entry, 2) },
        lv.stop   != null && { label: 'Stop Loss', value: fmtINR(lv.stop, 2) },
        lv.target != null && { label: 'Target',    value: fmtINR(lv.target, 2) },
        // Real R:R the engine required for this trade (scales with conviction: 1:1 at a
        // 60-70 blend up to 1:2.5 at 90+) — not a fixed number, so show it alongside the
        // real ATR/swing levels rather than only implying it.
        lv.rr != null && { label: 'Risk : Reward', value: `1 : ${fmtNum(lv.rr)}` },
    ].filter(Boolean);
};
const _longLevelCells = (lv) => {
    if (!lv) return [];
    const cells = [];
    if (Array.isArray(lv.accumulate) && lv.accumulate.length === 2)
        cells.push({ label: 'Accumulate', value: `₹${fmtNum(lv.accumulate[0])}–${fmtNum(lv.accumulate[1])}` });
    if (lv.trend_stop != null)
        cells.push({ label: 'Trend Stop', value: fmtINR(lv.trend_stop, 2) });
    if (lv.target_3yr != null)
        cells.push({ label: '3Y Target', value: `${fmtINR(lv.target_3yr, 2)}${lv.upside_3yr ? ` (${lv.upside_3yr})` : ''}` });
    return cells;
};
// Verdict → text colour (green = buy, amber = cautious, grey = wait, red = avoid).
const _verdictTone = (v) => ({
    'STRONG BUY':        'text-emerald-500 dark:text-emerald-400',
    'CAUTIOUS BUY':      'text-street-yellow-ink dark:text-[#FDD405]',
    'WAIT / ACCUMULATE': 'text-zinc-600 dark:text-zinc-300',
    'AVOID':             'text-red-500 dark:text-red-400',
    // QA-001 / QA-002: states the verdict engine emits when it refuses to recommend —
    // missing technical coverage, or a projection that came back below today's price.
    'INSUFFICIENT DATA': 'text-zinc-500 dark:text-zinc-400',
    'AVOID / WAIT':      'text-red-500 dark:text-red-400',
}[v] || 'text-zinc-600 dark:text-zinc-300');

const HorizonRow = ({ tenor, v, cells }) => {
    const note = (!cells.length)
        ? (v?.levels?.note || v?.levels?.status || 'No trade setup at the current price.')
        : null;
    const nCols = 1 + cells.length;
    const gridCls = nCols >= 4 ? 'grid-cols-2 sm:grid-cols-4'
        : nCols === 3 ? 'grid-cols-3'
        : nCols === 2 ? 'grid-cols-2' : 'grid-cols-1';
    return (
        <div className={clsx('grid divide-x divide-zinc-200/70 dark:divide-zinc-800', gridCls)}>
            <div className="px-4 py-3">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-1">{tenor}</p>
                <p className={clsx('text-[18px] font-black leading-none', _verdictTone(v?.verdict))}>{v?.verdict || '—'}</p>
            </div>
            {cells.map(({ label, value }) => (
                <div key={label} className="px-4 py-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
                    <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-none">{value}</p>
                </div>
            ))}
            {note && (
                <div className="px-4 py-3">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-snug">{note}</p>
                </div>
            )}
        </div>
    );
};
const DeterministicVerdictBand = ({ verdict, flush = false, raised = false }) => {
    const sh = verdict?.SHORT;
    const lg = verdict?.LONG;
    if (!sh && !lg) return null;
    const chrome = raised
        ? INNER_CARD
        : (flush ? '' : 'rounded-2xl border bg-white border-zinc-200 dark:bg-[#181613] dark:border-zinc-800');
    return (
        <div className={clsx('relative overflow-hidden', chrome)}>
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                <span className="w-4 h-[3px] rounded-full" style={{ backgroundColor: BRAND }} />
                <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-zinc-900 dark:text-[#FDD405]">Venty Verdict</p>
            </div>
            {sh && <HorizonRow tenor="Short-Term · ≤1yr" v={sh} cells={_shortLevelCells(sh.levels)} />}
            {sh && lg && <div className="h-px bg-zinc-200 dark:bg-zinc-800" />}
            {lg && <HorizonRow tenor="Long-Term · ≥1yr" v={lg} cells={_longLevelCells(lg.levels)} />}
        </div>
    );
};

export const VerdictBand = ({ verdict, verdictIntent, signal, verdictText, content, aiTake, price, patternSummary = null, flush = false, raised = false }) => {
    // Preferred: the deterministic Venty Verdict engine (score_card.verdict).
    if (verdict && (verdict.SHORT || verdict.LONG)) {
        return <DeterministicVerdictBand verdict={verdict} flush={flush} raised={raised} />;
    }
    // The backend explicitly says this wasn't an investment question (verdict_intent
    // === false) — don't fall through to text-parsing below, which would otherwise
    // spawn a BUY/SELL card from incidental words in the prose (e.g. "analysts remain
    // bullish on IT" in a purely informational answer). Old messages predating this
    // field have verdictIntent === undefined and keep the previous fallback behavior.
    if (verdictIntent === false) return null;
    // Fallback (messages with no computed verdict): parse the text. Levels shown
    // only when they come from the pattern engine or the text — the old ±5%/+10%
    // fabrication has been removed (levels are computed or absent, never invented).
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

    // Fallback levels — pattern engine (support → stop, resistance → target;
    // swapped for SELL) or price levels named in the text. NO fabricated %-based
    // levels: if neither yields a value, the cell is simply omitted (computed or
    // absent, never invented).
    const support = patternSummary?.support != null ? Number(patternSummary.support) : null;
    const resistance = patternSummary?.resistance != null ? Number(patternSummary.resistance) : null;
    const isSell = rec === 'SELL';
    const below = (v) => (v != null && (price == null || v < price) ? v : null);
    const above = (v) => (v != null && (price == null || v > price) ? v : null);

    const fbEntry = price;
    let fbStop = isSell ? above(resistance) : below(support);
    let fbTarget = isSell ? below(support) : above(resistance);
    if (fbStop == null || fbTarget == null) {
        const nearby = extractNearbyLevels(levelSourceText, price);
        if (fbStop == null) fbStop = isSell ? nearby.above : nearby.below;
        if (fbTarget == null) fbTarget = isSell ? nearby.below : nearby.above;
    }

    // AI-002/AI-011: track WHERE each level came from, not just its value.
    // 'computed' = a typed field from the signal/verdict engine. 'model-text' = a
    // number scraped out of LLM prose by extractLevelsFromText/extractNearbyLevels.
    // The two were rendered identically in an authoritative band, so a figure the
    // model invented was indistinguishable from one the engine computed — the exact
    // violation of this file's own asserted contract that levels are "computed or
    // absent, never invented". Until the backend populates the typed fields (it
    // currently emits no `signal` object at all on the live API), prose-derived
    // levels are still shown — losing them would strip the band entirely — but they
    // are now visibly marked as model narrative rather than presented as computed.
    const fmtLevel = (sigVal, parsed, fb) => {
        if (sigVal != null) return { value: fmtINR(sigVal, 2), source: 'computed' };
        if (parsed) {
            return {
                value: parsed.hi ? `₹${fmtNum(parsed.lo)}–${fmtNum(parsed.hi)}` : fmtINR(parsed.lo, 2),
                source: 'model-text',
            };
        }
        // Pattern-engine support/resistance are computed; a bare current price is too.
        return fb != null ? { value: fmtINR(fb, 2), source: 'computed' } : null;
    };
    const levels = [
        { label: 'Entry', ...(fmtLevel(signal?.ideal_entry, textLevels.entry, fbEntry) || {}) },
        { label: 'Stop Loss', ...(fmtLevel(signal?.stop_loss, textLevels.stop, fbStop) || {}) },
        { label: 'Target', ...(fmtLevel(signal?.target, textLevels.target, fbTarget) || {}) },
    ].filter(l => l.value);
    const hasModelText = levels.some(l => l.source === 'model-text');

    return (
        <div className={clsx('overflow-hidden', (flush && !raised) ? '' : 'rounded-xl')} style={{ backgroundColor: BRAND }}>
            <div className={clsx('grid divide-x divide-black/15',
                levels.length === 3 ? 'grid-cols-2 sm:grid-cols-4' : levels.length === 2 ? 'grid-cols-3' : levels.length === 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                <div className="px-4 py-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/60 mb-1">
                        Venty Verdict
                    </p>
                    <p className="text-[26px] font-black text-black leading-none">{rec}</p>
                </div>
                {levels.map(({ label, value, source }) => (
                    <div key={label} className="px-4 py-3">
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-black/60 mb-1">
                            {label}
                            {source === 'model-text' && (
                                <span title="Read from the written analysis, not computed by the engine"> *</span>
                            )}
                        </p>
                        <p className="text-[20px] font-extrabold text-black leading-none">{value}</p>
                    </div>
                ))}
            </div>
            {/* AI-002: provenance footnote — a level lifted from the model's prose must
                not look identical to one the engine computed. */}
            {hasModelText && (
                <p className="px-4 pb-2.5 -mt-0.5 text-[10px] font-semibold text-black/55 leading-snug">
                    * Read from the written analysis, not computed by the engine. Verify before acting.
                </p>
            )}
        </div>
    );
};

/* ─── Today's Market Stats card ──────────────────────────────────────────────
 * buildMarketStats now lives in answerKitCore.js (imported + re-exported above). */
export const MarketStatsCard = ({ stats, flush = false, raised = false }) => {
    if (!stats?.length) return null;
    const Wrapper = (flush || raised) ? 'div' : Card;
    return (
        <Wrapper className={clsx('px-4 py-3.5', raised && INNER_CARD + ' self-start', !flush && !raised && 'self-start')}>
            <CardHeader>Today's Market Stats</CardHeader>
            <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {stats.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2 py-2">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
                        <span className="text-[12px] font-semibold text-zinc-900 dark:text-white text-right">{value}</span>
                    </div>
                ))}
            </div>
        </Wrapper>
    );
};

/* ─── VENTY SCORE — overall donut + technical/fundamental/sentimental ───
 * getScores now lives in answerKitCore.js (imported + re-exported above). */

/* ─── VENTY AI SCORE PANEL — Quick-mode score section ────────────────────────
 * Reference layout: header bar ("Venty AI Score and Recommendation for X"),
 * top row = Overall Health arc gauge + Overview bullets, bottom row = one card
 * per lens (Technical / Fundamental / Sentimental) with its gauge and the real
 * commentary behind that lens. Quick mode only — Analyst keeps ScoreGrid. */

/* 270° arc gauge — score % in the middle, gap at the bottom */
const ArcGauge = ({ score, size = 116, stroke = 11, color, showPct = true }) => {
    const s = Math.min(100, Math.max(0, Math.round(score)));
    const r = (size - stroke) / 2 - 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const track = 0.75 * circ;                    // 270° visible arc
    const filled = (s / 100) * track;
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
             aria-label={`Score ${s} out of 100`}>
            {/* rotate so the 90° gap sits centred at the bottom */}
            <g transform={`rotate(135 ${c} ${c})`}>
                <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${track} ${circ}`}
                        className="stroke-zinc-200 dark:stroke-white/10" />
                <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
            </g>
            <text x={c} y={c + size * 0.06} textAnchor="middle" fontSize={size * 0.24} fontWeight="800"
                  fontFamily="Montserrat,sans-serif" className="fill-zinc-900 dark:fill-white">
                {s}{showPct ? '%' : ''}
            </text>
        </svg>
    );
};

const overallLabel = (s) => (s >= 70 ? 'Strong' : s >= 50 ? 'Neutral' : 'Weak');

/* value/threshold/label triple → [value, threshold, label] */
const _ratioTriple = (v) => {
    if (v == null) return [null, null, null];
    if (Array.isArray(v)) return [v[0] ?? null, v[1] ?? null, v[2] ?? null];
    if (typeof v === 'object') return [v.value ?? null, v.threshold ?? null, v.label ?? null];
    return [v, null, null];
};

const buildFundBullets = (fund) => {
    const r = fund?.ratios || {};
    const out = [];
    const add = (name, key, fmt) => {
        const [val, , lab] = _ratioTriple(r[key]);
        if (val != null) out.push(`${name} ${fmt(val)}${lab ? ` · ${String(lab).toLowerCase()}` : ''}`);
    };
    add('P/E', 'pe_ratio', (v) => `${Number(v).toFixed(1)}x`);
    add('ROE', 'roe', (v) => `${Number(v).toFixed(1)}%`);
    add('ROCE', 'roce', (v) => `${Number(v).toFixed(1)}%`);
    add('Revenue growth', 'revenue_growth', (v) => `${Number(v).toFixed(1)}%`);
    if (!out.length && fund?.summary) out.push(fund.summary);
    return out.slice(0, 4);
};

const buildSentBullets = (ms) => {
    const out = [];
    if (ms?.tone_score != null) {
        const lab = ms.tone_label ? `${String(ms.tone_label).toLowerCase()} ` : '';
        out.push(`Management tone ${lab}(${Math.round(ms.tone_score)}/100)${ms.period ? ` · ${ms.period}` : ''}`);
    }
    if (ms?.summary) out.push(ms.summary);
    return out.slice(0, 3);
};

const PanelBullets = ({ items }) => (
    <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-[11.5px] text-zinc-600 dark:text-zinc-300 leading-snug">
                <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0 bg-zinc-400 dark:bg-zinc-500" />
                <span className="flex-1 min-w-0"><InlineMd>{t}</InlineMd></span>
            </li>
        ))}
    </ul>
);

const PanelTitle = ({ children }) => (
    <p className="text-[13px] font-bold text-zinc-900 dark:text-[#FDD405]">{children}</p>
);

export const VentyScorePanel = ({ scoreCard, managementSentiment, companyName = '', overviewBullets = [] }) => {
    const [open, setOpen] = React.useState(true);
    const { overall, technical, fundamental, sentimental } = getScores(scoreCard, managementSentiment);

    const lenses = [
        { key: 'Technical', score: technical, bullets: (Array.isArray(scoreCard?.technical?.commentary) ? scoreCard.technical.commentary : []).slice(0, 4) },
        { key: 'Fundamental', score: fundamental, bullets: buildFundBullets(scoreCard?.fundamental) },
        { key: 'Sentimental', score: sentimental, bullets: buildSentBullets(managementSentiment) },
    ].filter(l => l.score != null);

    const overview = (Array.isArray(overviewBullets) ? overviewBullets : []).slice(0, 4);
    if (overall == null && lenses.length === 0 && overview.length === 0) return null;

    return (
        <Card className="overflow-hidden">
            {/* Header row (toggle) — inside the main card */}
            <button onClick={() => setOpen(o => !o)} aria-expanded={open}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left
                               hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                <span className="text-[15px] font-bold text-zinc-900 dark:text-white truncate">
                    Venty AI Score and Recommendation{companyName ? ` for ${companyName}` : ''}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className={clsx('flex-shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200', open && 'rotate-180')}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 pt-0 space-y-2.5 sm:space-y-3">
                    {/* Top row — Overall Health + Overview (raised inner sub-cards) */}
                    {(overall != null || overview.length > 0) && (
                        <div className={clsx('grid gap-2.5 sm:gap-3', overall != null && overview.length > 0 ? 'lg:grid-cols-2' : 'grid-cols-1')}>
                            {overall != null && (
                                <div className={clsx('p-4 flex items-center gap-4', INNER_CARD)}>
                                    <div className="flex-shrink-0 flex flex-col items-center">
                                        <ArcGauge score={overall} size={112} color={scoreColor(overall)} />
                                        <span className="-mt-4 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold text-black"
                                              style={{ backgroundColor: scoreColor(overall) }}>
                                            {overallLabel(overall)}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <PanelTitle>Overall Health</PanelTitle>
                                        <p className="mt-1 text-[11.5px] text-zinc-500 dark:text-zinc-400 leading-snug">
                                            The stock's combined Venty AI Score across all three lenses.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {overview.length > 0 && (
                                <div className={clsx('p-4', INNER_CARD)}>
                                    <PanelTitle>Overview</PanelTitle>
                                    <PanelBullets items={overview} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom row — one raised inner sub-card per lens */}
                    {lenses.length > 0 && (
                        <div className={clsx('grid gap-2.5 sm:gap-3', lenses.length === 3 ? 'sm:grid-cols-3' : lenses.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
                            {lenses.map(({ key, score, bullets }) => (
                                <div key={key} className={clsx('p-4', INNER_CARD)}>
                                    <ArcGauge score={score} size={64} stroke={7} color={scoreColor(score)} showPct={false} />
                                    <div className="mt-2"><PanelTitle>{key}</PanelTitle></div>
                                    {bullets.length > 0 && <PanelBullets items={bullets} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

/* ─── Scorecard section header — icon circle + title + score/label ───────── */
const ScorecardHeader = ({ icon: Icon, title, score, label }) => (
    <div className="flex items-center gap-3">
        {Icon && (
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: BRAND }}>
                <Icon size={16} className="text-black" strokeWidth={2.4} />
            </div>
        )}
        <div className="min-w-0">
            <p className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight">{title}</p>
            {score != null && (
                <p className="text-[11px] font-extrabold tracking-wider text-zinc-600 dark:text-[#FDD405] mt-0.5 uppercase">
                    {Math.round(score)}/100{label ? ` · ${label}` : ''}
                </p>
            )}
        </div>
    </div>
);

/* Collapsible scorecard — the Technical / Fundamental / Sentimental cards use
 * this so each is a single dropdown card: the ScorecardHeader (icon + title +
 * score) doubles as the toggle, with a chevron on the right, and the body
 * collapses. Same theme-coloured Card shell as CollapsibleSection. */
export const CollapsibleScorecard = ({ icon, title, score, label, defaultOpen = true, children }) => {
    const [open, setOpen] = React.useState(defaultOpen);
    return (
        <Card className="overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 p-4 text-left
                           hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
            >
                <ScorecardHeader icon={icon} title={title} score={score} label={label} />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                     className={clsx('flex-shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200', open && 'rotate-180')}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0">
                    {children}
                </div>
            )}
        </Card>
    );
};

/* ─── Expandable Technical Indicators table (DB-backed, interactive) ─────── */
export const IndicatorsTable = ({ rows, asOfDate }) => {
    const [open, setOpen] = React.useState(false);
    if (!rows || rows.length === 0) return null;

    const dateLabel = asOfDate
        ? new Date(asOfDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-50 dark:bg-[#0d0c0b]">
            {/* Toggle header */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Technical Indicators
                    </span>
                    {dateLabel && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            as of {dateLabel}
                        </span>
                    )}
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
            </button>

            {/* Table */}
            {open && (
                <div className="px-3 pb-3 pt-2">
                    <div className="overflow-x-auto rounded-lg overflow-hidden border border-[#FDD405]">
                        <table className="w-full text-[13px] border-collapse table-fixed">
                            <colgroup>
                                <col className="w-1/4" />
                                <col className="w-1/4" />
                                <col className="w-1/2" />
                            </colgroup>
                            <thead>
                                <tr className="bg-[#FDD405]">
                                    <th className="text-center px-4 py-2.5 text-[13px] font-bold text-black">Indicator</th>
                                    <th className="text-center px-4 py-2.5 text-[13px] font-bold text-black">Value</th>
                                    <th className="text-center px-4 py-2.5 text-[13px] font-bold text-black">Signal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-[#FDD405] last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                                    >
                                        <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-200 text-center">
                                            {row.indicator}
                                        </td>
                                        <td className="px-4 py-2 text-center font-mono text-zinc-900 dark:text-white">
                                            {row.value || '—'}
                                        </td>
                                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-center">
                                            {row.signal || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── metric cell — tiny label / big value / footnote ────────────────────── */
export const MetricCell = ({ label, value, note }) => (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#0d0c0b] px-3 py-2.5 min-w-0">
        <p className="text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-1 truncate">{label}</p>
        <p className="text-[17px] font-extrabold text-zinc-900 dark:text-white leading-none truncate">{value}</p>
        {note && <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1.5 uppercase tracking-wide truncate">{note}</p>}
    </div>
);
