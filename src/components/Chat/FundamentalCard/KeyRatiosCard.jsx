import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtPct, fmtMultiple, fmtRatio } from '../../../utils/metricFormat';
import { INNER_CARD_DARK } from '../answerKit';
import { InfoTip } from './InfoTip';
import {
    RATIO_META, RATIO_ORDER, sane, verdict as ratioVerdict, median,
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
 * tabs, the benchmark column and the summary line are independently optional,
 * so a thin payload degrades to a short honest table rather than an empty
 * shell — and nothing here throws when a field is absent.
 */

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
 * A thumbs-up/down passes judgement on a company; an arrow states a direction
 * and lets the reader judge. The null case is a visible dash rather than a
 * blank cell, so "we don't know" reads as a deliberate answer.
 */
const VerdictMark = ({ verdict }) => {
    if (verdict === 'better') {
        return <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-label="Better" />;
    }
    if (verdict === 'worse') {
        return <TrendingDown size={13} className="text-rose-600 dark:text-rose-400 flex-shrink-0" aria-label="Worse" />;
    }
    if (verdict === 'similar') {
        return <Minus size={13} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" aria-label="In line" />;
    }
    return <span className="text-zinc-300 dark:text-zinc-600 text-xs flex-shrink-0 leading-none" aria-label="Not comparable">—</span>;
};

/** Value colour follows the verdict; an unjudged value stays neutral. */
const valueClass = (verdict) => clsx(
    'text-sm font-bold tabular-nums',
    verdict === 'better' ? 'text-emerald-600 dark:text-emerald-400' :
    verdict === 'worse'  ? 'text-rose-600 dark:text-rose-400' :
                           'text-zinc-900 dark:text-white'
);

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

    // Peer pools per ratio — the sample each sector median is taken over.
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

            {/* A real <table>: three plain columns, one row per ratio. Scrolls
                inside its own container on a narrow screen rather than forcing
                the card to scroll sideways. */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th scope="col" className="py-1.5 pr-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Ratio
                            </th>
                            <th scope="col" className="py-1.5 px-2 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                {symbol || 'Stock'}
                            </th>
                            <th scope="col" className="py-1.5 pl-2 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                {comparedLabel}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, meta, value }) => {
                            const bench = benchmarkFor(key);
                            const v = ratioVerdict(key, value, bench);
                            const benchText = fmtByUnit(key, bench);
                            const banded = meta.dir === 'band';

                            return (
                                <tr key={key} className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                                    {/* aria-label pins the header's accessible name to the
                                        ratio itself. Without it the InfoTip's "i" glyph gets
                                        appended ("P/Ei") and a screen reader repeats that for
                                        every cell in the row. The tip keeps its own label and
                                        stays reachable — hiding it here instead would leave a
                                        focusable control that announces nothing. */}
                                    <th
                                        scope="row"
                                        aria-label={meta.label}
                                        className="py-2 pr-2 text-xs font-normal text-zinc-700 dark:text-zinc-300"
                                    >
                                        <span className="flex items-center gap-1">
                                            <span>{meta.label}</span>
                                            {meta.term && <InfoTip term={meta.term} />}
                                        </span>
                                    </th>

                                    <td className="py-2 px-2 text-right whitespace-nowrap">
                                        <span className="inline-flex items-center justify-end gap-1.5">
                                            <span className={valueClass(v)}>{fmtByUnit(key, value)}</span>
                                            <VerdictMark verdict={v} />
                                        </span>
                                    </td>

                                    {/* A banded ratio has no peer comparison — it is judged
                                        against a healthy range, so the column names that
                                        range instead of a number we never compare to. */}
                                    <td className="py-2 pl-2 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                        {banded
                                            ? <span className="text-[11px]" title="Judged against a healthy range, not the peer set">
                                                {meta.band[0]}–{meta.band[1]} ideal
                                              </span>
                                            : (benchText ?? <span className="text-zinc-300 dark:text-zinc-600" title="No usable benchmark for this ratio">n/a</span>)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary. States the sample size, because "median of 42" and
                "median of 4" deserve very different levels of trust — and names
                the unjudged rows rather than quietly dropping them from the count. */}
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {judged === 0
                        ? 'No comparable benchmark for these ratios'
                        : <>Ahead on <strong className="text-emerald-600 dark:text-emerald-400">{tally.better}</strong> of {judged}{' '}
                           vs {comparedLabel}
                           {comparingSector && peerCount ? ` · ${peerCount} stocks` : ''}
                           {tally.unknown > 0 ? ` · ${tally.unknown} not comparable` : ''}</>}
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
