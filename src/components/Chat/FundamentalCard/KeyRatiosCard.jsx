import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtPct, fmtMultiple, fmtRatio } from '../../../utils/metricFormat';
import { INNER_CARD_DARK } from '../answerKit';
import { InfoTip } from './InfoTip';
import {
    RATIO_META, RATIO_ORDER, sane, verdict as ratioVerdict, median, grade,
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
        return <TrendingUp size={15} strokeWidth={2.5} className="text-street-green-dark dark:text-street-green flex-shrink-0" aria-label="Better" />;
    }
    if (verdict === 'worse') {
        return <TrendingDown size={15} strokeWidth={2.5} className="text-rose-600 dark:text-rose-400 flex-shrink-0" aria-label="Worse" />;
    }
    if (verdict === 'similar') {
        return <Minus size={15} strokeWidth={2.5} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" aria-label="In line" />;
    }
    return <span className="text-zinc-300 dark:text-zinc-600 text-sm flex-shrink-0 leading-none" aria-label="Not comparable">—</span>;
};

/* ─── Rating pill ────────────────────────────────────────────────────────────
 * Answers the question the comparison column cannot: "is this number good?"
 *
 * Five tiers, worded and cut exactly as the backend's fundamental_engine rates
 * them, so the pill and the score banner above the table always agree. Colour
 * runs on the 72 Street palette rather than Tailwind's emerald/lime/orange,
 * which read as a different product next to the rest of the answer: brand
 * green for the good end (solid for Excellent, tinted for Good), brand yellow
 * for Average — a real, distinct answer that must not borrow green or red —
 * and rose for the weak end, the one non-brand hue, kept because a negative
 * read needs a signal the palette doesn't carry. Solid fills take brand-black
 * ink: white on #0e9e37 fails AA at pill size, #121315 passes.
 */
const GRADE_STYLE = {
    5: 'bg-street-green text-street-black ring-street-green',
    4: 'bg-street-green/15 text-street-green-dark dark:text-street-green ring-street-green/40',
    3: 'bg-street-yellow/15 text-street-yellow-ink dark:text-street-yellow ring-street-yellow/40',
    2: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30',
    1: 'bg-rose-600 text-white ring-rose-600',
};

/* Valuation is a different KIND of claim from quality, so it gets its own
 * palette rather than borrowing the green/red one. A low multiple in green
 * would read as "good", which is exactly the conflation this card exists to
 * stop — a low P/E is often low for a reason. The brand's secondary gunmetal
 * and plain neutrals stay legible in both themes while carrying no
 * good-or-bad charge of their own. */
const VALUATION_STYLE = {
    5: 'bg-street-gunmetal/10 text-street-gunmetal dark:bg-street-gunmetal dark:text-[#cfe1e3] ring-street-gunmetal/40',
    3: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-200 ring-zinc-500/30',
    1: 'bg-transparent text-zinc-700 dark:text-zinc-200 ring-zinc-400 dark:ring-zinc-500',
};

const GradePill = ({ g, title }) => {
    // No defensible absolute scale for this ratio — say nothing rather than
    // imply an average pass. The dash matches the not-comparable mark used by
    // VerdictMark so the two gaps read as the same kind of answer.
    if (!g) {
        return (
            <span
                className="text-zinc-300 dark:text-zinc-600 text-sm leading-none"
                title="No absolute quality scale for this ratio — compared to the benchmark only"
            >—</span>
        );
    }
    return (
        <span
            title={title}
            className={clsx(
                'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ring-1',
                (g.kind === 'valuation' ? VALUATION_STYLE : GRADE_STYLE)[g.tier]
            )}
        >
            {g.label}
        </span>
    );
};

/** Value colour follows the verdict; an unjudged value stays neutral. */
const valueClass = (verdict) => clsx(
    'text-sm font-semibold tabular-nums',
    verdict === 'better' ? 'text-street-green-dark dark:text-street-green' :
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
    // A row is kept when the payload CARRIES the key at all, even if its value is
    // unusable. `unusable` then splits two cases the table must not conflate:
    //
    //   - key absent entirely        -> no row (we were never asked about it)
    //   - key present, value bad     -> row with an em-dash (we looked, and cannot say)
    //
    // The second case used to be dropped along with the first, because the filter
    // tested `value != null`. When the backend began suppressing GVT&D's implausible
    // 578x P/E by nulling it, the whole P/E row vanished from the card — the most-read
    // ratio silently disappearing reads as "this metric does not exist" rather than
    // "this figure could not be established", which is a different and worse claim.
    //
    // A value outside RATIO_META[key].sane is treated as unusable too. That bound was
    // already declared (pe_ratio: [0, 500], commented ">500 is an earnings artefact")
    // but only ever applied to peer pools and benchmarks, never to the stock's own
    // displayed number — which is how 578.00x reached the screen in the first place.
    const rows = React.useMemo(
        () => RATIO_ORDER
            .filter(key => key in ratios)
            .map(key => {
                const value = readRatio(ratios[key]);
                const finite = value != null && Number.isFinite(Number(value));
                return {
                    key,
                    meta: RATIO_META[key],
                    value: finite ? value : null,
                    unusable: !finite || !sane(key, value),
                };
            }),
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
                                    ? 'border-street-yellow bg-street-yellow text-street-black'
                                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-street-yellow/60 hover:text-zinc-900 dark:hover:text-white'
                            )}
                        >
                            {t === 'sector' ? sectorName : t}
                        </button>
                    ))}
                </div>
            )}

            {/* A real <table>: three plain columns, one row per ratio. Scrolls
                inside its own container on a narrow screen rather than forcing
                the card to scroll sideways. Styled as answerKit's IndicatorsTable
                — brand-yellow outline and header band with brand-black ink — so
                the two tables read as one system inside the same answer. */}
            <div className="overflow-x-auto rounded-lg border border-street-yellow">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-street-yellow">
                            <th scope="col" className="py-2.5 px-3 text-[13px] font-bold text-street-black">
                                Ratios
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-center text-[13px] font-bold text-street-black whitespace-nowrap border-l border-street-black/10">
                                {symbol || 'Stock'}
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-center text-[13px] font-bold text-street-black whitespace-nowrap">
                                {comparedLabel}
                            </th>
                            {/* The absolute read. Deliberately the LAST column: the eye
                                lands on it after the number and its benchmark, which is
                                the order the question is actually asked in ("what is it?
                                → versus what? → so is that good?"). */}
                            <th scope="col" className="py-2.5 px-3 text-center text-[13px] font-bold text-street-black whitespace-nowrap border-l border-street-black/10">
                                Rating
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ key, meta, value, unusable }) => {
                            const bench = benchmarkFor(key);
                            // An unusable value must not be graded, ranked or compared:
                            // every downstream read of it would be a judgement built on a
                            // number we have just declared untrustworthy. Forcing the
                            // verdict and grade to null routes the row through the card's
                            // existing "not comparable" path — an em-dash in the arrow and
                            // Rating columns, exactly as a missing benchmark renders.
                            const v = unusable ? null : ratioVerdict(key, value, bench);
                            const benchText = fmtByUnit(key, bench);
                            const banded = meta.dir === 'band';
                            // Quality ratings are absolute — switching the comparator tab
                            // changes the middle column and the arrow, never the grade.
                            // P/E is the one exception by design: valuation only means
                            // anything against a benchmark, so it takes `bench` and does
                            // move with the tab (mirroring the backend's rel_pe test).
                            const g = unusable ? null : grade(key, value, bench);
                            const gradeTitle = !g ? undefined
                                : g.kind === 'valuation'
                                    ? `${meta.label} of ${fmtByUnit(key, value)} sits ${g.label.toLowerCase()}${benchText ? ` (${comparedLabel} ${benchText})` : ''}. A lower multiple is not automatically better — it can mean the market expects earnings to fall, just as a higher one can be normal for a faster-growing business.`
                                    : `${fmtByUnit(key, value)} is ${g.label.toLowerCase()} for ${meta.label} on its own merits, regardless of ${comparedLabel}`;

                            return (
                                <tr key={key} className="border-t border-street-yellow/25 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                    {/* aria-label pins the header's accessible name to the
                                        ratio itself. Without it the InfoTip's "i" glyph gets
                                        appended ("P/Ei") and a screen reader repeats that for
                                        every cell in the row. The tip keeps its own label and
                                        stays reachable — hiding it here instead would leave a
                                        focusable control that announces nothing. */}
                                    <th
                                        scope="row"
                                        aria-label={meta.label}
                                        className="py-3 px-3 text-[13px] font-medium text-zinc-800 dark:text-zinc-200"
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-1">
                                                <span>{meta.label}</span>
                                                {meta.term && <InfoTip term={meta.term} />}
                                            </span>
                                            <VerdictMark verdict={v} />
                                        </span>
                                    </th>

                                    <td className="py-3 px-3 text-center whitespace-nowrap border-l border-zinc-200 dark:border-zinc-800/80">
                                        {unusable
                                            ? <span
                                                className="text-zinc-300 dark:text-zinc-600"
                                                title="We could not establish a reliable figure for this ratio, so none is shown"
                                              >—</span>
                                            : <span className={valueClass(v)}>{fmtByUnit(key, value)}</span>}
                                    </td>

                                    {/* A banded ratio has no peer comparison — it is judged
                                        against a healthy range, so the column names that
                                        range instead of a number we never compare to. */}
                                    <td className="py-3 px-3 text-center text-xs tabular-nums text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                        {banded
                                            ? <span className="text-xs text-zinc-500 dark:text-zinc-400" title="Judged against a healthy range, not the peer set">
                                                {meta.band[0]}–{meta.band[1]} ideal
                                              </span>
                                            : (benchText ?? <span className="text-zinc-300 dark:text-zinc-600" title="No usable benchmark for this ratio">n/a</span>)}
                                    </td>

                                    <td className="py-3 px-3 text-center whitespace-nowrap border-l border-zinc-200 dark:border-zinc-800/80">
                                        <GradePill g={g} title={gradeTitle} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* No legend line. The earlier "Colour & arrow compare… Rating judges…"
                paragraph was removed by product decision: with every row now carrying
                a worded pill, the column speaks for itself, and the sentence added a
                block of small print under every card. The per-row tooltips (title on
                each pill) still spell the distinction out for anyone who wants it. */}
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
