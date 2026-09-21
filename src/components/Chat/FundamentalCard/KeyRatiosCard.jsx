import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtPct, fmtMultiple, fmtRatio } from '../../../utils/metricFormat';
import { INNER_CARD_DARK } from '../answerKit';
import { InfoTip } from './InfoTip';
import {
    RATIO_META, RATIO_ORDER, sane, verdict as ratioVerdict, percentile, median,
} from '../../../utils/ratioPolarity';

/* ─── KEY RATIOS — peer / sector comparison table ────────────────────────────
 *
 * A ratio table in the shape users already know from Tickertape and Screener,
 * with the three things those get wrong fixed (see utils/ratioPolarity.js):
 * polarity is declared per ratio, liquidity is judged against a band rather
 * than a peer, and an unusable benchmark renders "Not comparable" instead of a
 * confident red mark.
 *
 * It renders whatever the payload actually carries. Every ratio, the peer
 * tabs, the percentile bars and the summary line are independently optional,
 * so a thin payload degrades to a short honest table rather than an empty
 * shell — and nothing here throws when a field is absent.
 */

/** Percentiles below this are not shown: too few peers to mean anything. */
const MIN_PEERS_FOR_PERCENTILE = 4;

/** Print a value using the shared formatter, chosen by the ratio's unit. */
const fmtByUnit = (key, v) => {
    if (v == null || !Number.isFinite(Number(v))) return null;
    switch (RATIO_META[key]?.unit) {
        case 'pct':   return fmtPct(v);
        case 'x':     return fmtMultiple(v);
        default:      return fmtRatio(v);
    }
};

/* ─── Verdict mark ───────────────────────────────────────────────────────────
 * Replaces the reference card's thumbs-up/down. An arrow carries direction
 * without the judgement a thumb implies, and the null case is a visible dash
 * rather than a blank cell, so "we don't know" reads as a deliberate answer.
 */
const VerdictMark = ({ verdict }) => {
    if (verdict === 'better') {
        return <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-label="Better" />;
    }
    if (verdict === 'worse') {
        return <TrendingDown size={14} className="text-rose-600 dark:text-rose-400 flex-shrink-0" aria-label="Worse" />;
    }
    if (verdict === 'similar') {
        return <Minus size={14} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" aria-label="In line" />;
    }
    return <span className="text-zinc-300 dark:text-zinc-600 text-xs flex-shrink-0" aria-label="Not comparable">—</span>;
};

/** Value colour follows the verdict; an unjudged value stays neutral. */
const valueClass = (verdict) => clsx(
    'text-sm font-semibold tabular-nums',
    verdict === 'better' ? 'text-emerald-600 dark:text-emerald-400' :
    verdict === 'worse'  ? 'text-rose-600 dark:text-rose-400' :
                           'text-zinc-900 dark:text-white'
);

/* ─── Percentile bar ─────────────────────────────────────────────────────────
 * The headline improvement over a raw "19.43 vs -180.1" pair: a position in
 * the peer set, which stays meaningful even when the median itself is noisy.
 */
const PercentileBar = ({ pct }) => {
    if (pct == null) return null;
    const tone = pct >= 67 ? 'bg-emerald-500' : pct >= 34 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-1.5" title={`${pct}th percentile in peer set`}>
            <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div className={clsx('h-full rounded-full', tone)} style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums w-7 text-right">{pct}%</span>
        </div>
    );
};

/**
 * Normalise one ratio value out of the payload.
 *
 * Accepts the three shapes the backend already emits for ratios — a bare
 * number, the `[value, threshold, label]` tuple fundamental_engine builds, and
 * a `{value}` object — so this card reads the same payload FinancialScoreCard
 * does without any backend change.
 */
const readRatio = (raw) => {
    if (raw == null) return null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'object') return raw.value ?? null;
    return raw;
};

export const KeyRatiosCard = ({
    ratios = {},
    peerRatios = null,      // { SYMBOL: { pe_ratio: n, ... } } — per-peer values
    sectorMedians = null,   // { pe_ratio: n, ... } — precomputed, when supplied
    sectorName = 'Sector',
    peerCount = null,
    symbol = '',
    flat = false,
    defaultOpen = true,
}) => {
    const [open, setOpen] = React.useState(defaultOpen);
    const [tab, setTab] = React.useState('sector');

    const peerSymbols = React.useMemo(
        () => (peerRatios ? Object.keys(peerRatios).filter(s => s !== symbol) : []),
        [peerRatios, symbol]
    );

    // Rows are derived from what the payload actually carries, in the fixed
    // display order — never from Object.keys, so ordering can't drift with
    // whatever sequence the backend happens to serialise.
    const rows = React.useMemo(
        () => RATIO_ORDER
            .map(key => ({ key, meta: RATIO_META[key], value: readRatio(ratios[key]) }))
            .filter(r => r.value != null && Number.isFinite(Number(r.value))),
        [ratios]
    );

    // Peer pools per ratio, used for both the median and the percentile.
    const pools = React.useMemo(() => {
        const out = {};
        if (!peerRatios) return out;
        for (const { key } of rows) {
            const pool = Object.values(peerRatios)
                .map(p => readRatio(p?.[key]))
                .filter(v => v != null && sane(key, v));
            if (pool.length) out[key] = pool;
        }
        return out;
    }, [peerRatios, rows]);

    if (!rows.length) return null;

    const comparingSector = tab === 'sector';
    const comparedLabel = comparingSector ? sectorName : tab;

    /** The benchmark for one row: a precomputed median, our own, or a peer. */
    const benchmarkFor = (key) => {
        if (!comparingSector) return readRatio(peerRatios?.[tab]?.[key]);
        const given = sectorMedians?.[key];
        if (given != null && sane(key, given)) return given;
        return median(key, pools[key]);
    };

    // Tally drives the summary line. Only judged rows count, so a table full of
    // unusable benchmarks reports "not comparable" rather than a flattering 0-0.
    const tally = rows.reduce((acc, { key, value }) => {
        const v = ratioVerdict(key, value, benchmarkFor(key));
        if (v === 'better') acc.better += 1;
        else if (v === 'worse') acc.worse += 1;
        else if (v === 'similar') acc.similar += 1;
        else acc.unknown += 1;
        return acc;
    }, { better: 0, worse: 0, similar: 0, unknown: 0 });

    const judged = tally.better + tally.worse + tally.similar;

    const body = (
        <div className={flat ? '' : 'p-3'}>
            {/* Comparator tabs — sector first, then each peer we have data for.
                Rendered only when there is something to switch between. */}
            {peerSymbols.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 -mx-0.5 px-0.5">
                    {['sector', ...peerSymbols].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            aria-pressed={tab === t}
                            className={clsx(
                                'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap flex-shrink-0 border transition-colors',
                                tab === t
                                    ? 'bg-[#FDD405] border-[#FDD405] text-black'
                                    : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                            )}
                        >
                            {t === 'sector' ? sectorName : t}
                        </button>
                    ))}
                </div>
            )}

            {/* Column header. The percentile column is hidden on narrow screens
                rather than squeezed — the value and verdict matter more. */}
            <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <span className="flex-1 min-w-0">Ratio</span>
                <span className="w-20 text-right truncate" title={symbol}>{symbol || 'Stock'}</span>
                <span className="w-20 text-right truncate" title={comparedLabel}>{comparedLabel}</span>
                <span className="hidden sm:block w-[4.5rem] text-right">Rank</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {rows.map(({ key, meta, value }) => {
                    const bench = benchmarkFor(key);
                    const v = ratioVerdict(key, value, bench);
                    const pool = pools[key];
                    const pct = (pool && pool.length >= MIN_PEERS_FOR_PERCENTILE)
                        ? percentile(key, value, pool) : null;
                    const benchText = fmtByUnit(key, bench);
                    const banded = meta.dir === 'band';

                    return (
                        <div key={key} className="flex items-center gap-2 px-2 py-2">
                            <span className="flex-1 min-w-0 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                <span className="truncate">{meta.label}</span>
                                {meta.term && <InfoTip term={meta.term} />}
                            </span>

                            <span className="w-20 text-right flex items-center justify-end gap-1">
                                <span className={valueClass(v)}>{fmtByUnit(key, value)}</span>
                                <VerdictMark verdict={v} />
                            </span>

                            {/* A banded ratio has no meaningful peer column — it is
                                judged against a healthy range, so we name that range
                                instead of printing a comparison we don't use. */}
                            <span className="w-20 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400 truncate">
                                {banded
                                    ? <span className="text-[10px]" title="Judged against a healthy range, not the peer set">
                                        {meta.band[0]}–{meta.band[1]} ideal
                                      </span>
                                    : (benchText ?? <span className="text-zinc-300 dark:text-zinc-600">n/a</span>)}
                            </span>

                            <span className="hidden sm:flex w-[4.5rem] justify-end">
                                {pct != null ? <PercentileBar pct={pct} /> : null}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Summary + legend. States the sample size, because "median of 42"
                and "median of 4" deserve very different levels of trust. */}
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {judged === 0
                        ? 'No comparable benchmark for these ratios'
                        : <>Better on <strong className="text-emerald-600 dark:text-emerald-400">{tally.better}</strong> of {judged}{' '}
                           vs {comparedLabel}
                           {comparingSector && peerCount ? ` (${peerCount} stocks)` : ''}
                           {tally.unknown > 0 ? ` · ${tally.unknown} not comparable` : ''}</>}
                </span>
                <span className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                    <span className="flex items-center gap-0.5"><TrendingUp size={10} className="text-emerald-500" />Better</span>
                    <span className="flex items-center gap-0.5"><TrendingDown size={10} className="text-rose-500" />Worse</span>
                    <span className="flex items-center gap-0.5">—<span>No data</span></span>
                </span>
            </div>
        </div>
    );

    if (flat) return <div className="mt-4">{body}</div>;

    return (
        <div className={`mt-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[${INNER_CARD_DARK}]`}>
            <button
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Key Ratios</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && body}
        </div>
    );
};

export default KeyRatiosCard;
