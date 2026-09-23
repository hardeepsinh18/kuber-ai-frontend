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
 * An arrow, not a thumb: a thumb passes judgement on the company, while an
 * arrow states which way the number went and leaves the judgement to the
 * reader. Colour carries the same signal the reference card's thumbs do, so
 * the row still reads green/red at a glance.
 *
 * The null case is a visible dash rather than a blank cell, so "we have no
 * comparable benchmark" reads as a deliberate answer instead of a rendering
 * gap — that distinction is the whole point of the card.
 */
const VerdictMark = ({ verdict }) => {
    if (verdict === 'better') {
        return <TrendingUp size={15} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-label="Better" />;
    }
    if (verdict === 'worse') {
        return <TrendingDown size={15} strokeWidth={2.5} className="text-rose-600 dark:text-rose-400 flex-shrink-0" aria-label="Worse" />;
    }
    if (verdict === 'similar') {
        return <Minus size={15} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" aria-label="In line" />;
    }
    return <span className="text-zinc-300 dark:text-zinc-600 text-sm flex-shrink-0 leading-none" aria-label="Not comparable">—</span>;
};

/** Value colour follows the verdict; an unjudged value stays neutral. */
const valueClass = (verdict) => clsx(
    'text-sm font-semibold tabular-nums',
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
    // Still accepted so the existing call site keeps working, but no longer
    // rendered: it only fed the removed "· 130 stocks" tally footer.
    // eslint-disable-next-line no-unused-vars
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

    const body = (
        <div className={flat ? '' : 'p-3'}>
            {/* Comparator tabs — sector first, then each peer we have data for.
                Rendered only when there is something to switch between. */}
            {peerSymbols.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 -mx-0.5 px-0.5">
                    {['sector', ...peerSymbols].map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            aria-pressed={tab === t}
                            className={clsx(
                                'px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors',
                                tab === t
                                    ? 'border-[#FDD405] bg-[#FDD405]/10 text-zinc-900 dark:text-[#FDD405]'
                                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
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
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800/60">
                            <th scope="col" className="py-2.5 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                Ratios
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-center text-xs font-semibold text-zinc-900 dark:text-white whitespace-nowrap border-l border-zinc-200 dark:border-zinc-800">
                                {symbol || 'Stock'}
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
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
                                <tr key={key} className="border-t border-zinc-100 dark:border-zinc-800/60">
                                    {/* aria-label pins the header's accessible name to the
                                        ratio itself. Without it the InfoTip's "i" glyph gets
                                        appended ("P/Ei") and a screen reader repeats that for
                                        every cell in the row. The tip keeps its own label and
                                        stays reachable — hiding it here instead would leave a
                                        focusable control that announces nothing. */}
                                    <th
                                        scope="row"
                                        aria-label={meta.label}
                                        className="py-3 px-3 text-xs font-normal text-zinc-700 dark:text-zinc-300"
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-1">
                                                <span>{meta.label}</span>
                                                {meta.term && <InfoTip term={meta.term} />}
                                            </span>
                                            <VerdictMark verdict={v} />
                                        </span>
                                    </th>

                                    <td className="py-3 px-3 text-center whitespace-nowrap border-l border-zinc-100 dark:border-zinc-800/60">
                                        <span className={valueClass(v)}>{fmtByUnit(key, value)}</span>
                                    </td>

                                    {/* A banded ratio has no peer comparison — it is judged
                                        against a healthy range, so the column names that
                                        range instead of a number we never compare to. */}
                                    <td className="py-3 px-3 text-center text-xs tabular-nums text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                        {banded
                                            ? <span className="text-[11px] text-zinc-500 dark:text-zinc-400" title="Judged against a healthy range, not the peer set">
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

            {/* The colour legend ("Better/Worse in comparison") and the tally
                footer ("Ahead on 5 of 5 vs Sector · 130 stocks") were removed by
                product decision. The green/red values and the trend arrow already
                carry that meaning row by row, so both lines restated what the
                table showed. The per-row colouring is unaffected — it comes from
                ratioVerdict() on each row, not from the removed tally. */}
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
