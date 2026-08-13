import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmtNum, fmtPct, fmtMultiple, fmtRatio } from '../../../utils/metricFormat';
import { INNER_CARD_DARK } from '../answerKit';
import { computeRatings } from './labelClassifiers';
import { MetricCard } from './MetricCard';
import { MiniBar, MiniLine } from './MiniCharts';
import { PEGradientBar } from './PEGradientBar';
import { ROEViz } from './ROEViz';
import { SmallGauge } from './SmallGauge';
import { DebtGauge } from './DebtGauge';
import { ProfitSliceBar } from './ProfitSliceBar';
import { PeerRankCard } from './PeerRankCard';
import { InfoTip } from './InfoTip';

/* ─── FINANCIAL SCORE CARD (collapsible 2-col grid) ─────────────────────── */
const FIN_SCORE_INFO = 'Composite of the fundamental metrics below (P/E vs sector, ROE, ROCE, net margin, debt/equity, revenue & profit growth). Each metric is rated and normalized to 100. ≥70 = Strong · 50-69 = Average · 35-49 = Weak · <35 = Poor.';

/**
 * How many years the growth CAGRs actually cover.
 *
 * The growth cards were hardcoded "5 YR CAGR" while the backend supplies only 3
 * years of history, so the label claimed a longer track record than the number
 * behind it covered — a correctness problem on a financial surface, not a
 * wording one. Deriving it from the payload means the label can never drift
 * again: if history grows to 5 years the card says 5 on its own.
 *
 * Falls back to 3 (what production serves today) rather than to 5, so an absent
 * or degenerate `years` array understates rather than overstates the span.
 */
// Hot-reload ergonomics warning, not correctness — a pure helper beside the
// component that uses it is worth more than a marginally faster HMR tick.
// eslint-disable-next-line react-refresh/only-export-components
export const cagrSpan = (hist) =>
    (Array.isArray(hist?.years) && hist.years.length > 1) ? hist.years.length : 3;

export const FinancialScoreCard = ({ fund, symbol, flat = false }) => {
    const [open, setOpen] = React.useState(false);
    const ratios = fund?.ratios ?? {};
    const hist   = fund?.historical ?? null;
    const years  = hist?.years ?? ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];
    const cagrLabel = `${cagrSpan(hist)} YR CAGR`;

    // Financial quality score: backend fund.score when present, else derived
    // from the per-metric ratings (strong=1, watch=0.5, risk=0 → % of max)
    const ratingsSum = fund?.ratings_summary ?? computeRatings(ratios);
    const { strong = 0, watch = 0, risk = 0 } = ratingsSum || {};
    const ratedCount = strong + watch + risk;
    const finScore = fund?.score != null
        ? Math.round(fund.score)
        : (ratedCount ? Math.round(((strong + watch * 0.5) / ratedCount) * 100) : null);
    const finLabel = fund?.label
        || (finScore == null ? null
            : finScore >= 70 ? 'Strong'
            : finScore >= 50 ? 'Average'
            : finScore >= 35 ? 'Weak' : 'Poor');
    const finColor =
        finScore >= 70 ? '#22c55e' :
        finScore >= 50 ? '#FDD405' :
        finScore >= 35 ? '#fb923c' : '#ef4444';

    const getR = (key) => {
        const v = ratios[key];
        if (v == null) return [null, null, null];
        if (Array.isArray(v)) return [v[0] ?? null, v[1] ?? null, v[2] ?? null];
        if (typeof v === 'object') return [v.value ?? null, v.threshold ?? null, v.label ?? null];
        return [v, null, null];
    };

    const [pe, sectorPe, peLabel]  = getR('pe_ratio');
    const [roe, ,  roeLabel]       = getR('roe');
    const [roce, , roceLabel]      = getR('roce');
    const [margin, , marginLabel]  = getR('net_margin');
    const [debt, ,  debtLabel]     = getR('debt_equity');
    const [revGr, , revGrLabel]    = getR('revenue_growth');
    const [profGr, , profGrLabel]  = getR('profit_growth');

    // Percentages come from the shared formatter so the gauge, the visual inside
    // the tile, the tile footer and the Analyst grid all print the same digits.
    const pct2 = fmtPct;

    const peers    = fund?.peers ?? null;
    const peerGroup = fund?.peer_group ?? 'SECTOR';
    const peerRank = fund?.peer_rank ?? null;

    const hasCards = [pe, roe, roce, margin, debt, revGr, profGr].some(v => v != null) || peers?.length > 0;
    if (!hasCards) return null;

    return (
        <div className={flat ? 'mt-4' : `mt-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[${INNER_CARD_DARK}]`}>
            {!flat && (
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">Financial Score Card</span>
                    {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                          : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
                </button>
            )}
            {(flat || open) && (
                <div className={flat ? '' : `p-3 space-y-3 bg-zinc-50 dark:bg-[${INNER_CARD_DARK}]`}>
                    {/* Score banner, same design language as the Technical Score Card */}
                    {!flat && finScore != null && (
                        <div className="flex items-center justify-between p-3 rounded-xl"
                             style={{ background: `${finColor}12`, border: `1.5px solid ${finColor}30` }}>
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Financial Quality Score</div>
                                    <InfoTip text={FIN_SCORE_INFO} />
                                </div>
                                <div className="text-3xl font-extrabold leading-none" style={{ color: finColor }}>
                                    {finScore}<span className="text-base font-semibold opacity-60">/100</span>
                                </div>
                                <div className="text-xs font-bold mt-1" style={{ color: finColor }}>{finLabel}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {strong > 0 && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                          style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e' }}>
                                        ✓ {strong} strong metric{strong > 1 ? 's' : ''}
                                    </span>
                                )}
                                {watch > 0 && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                          style={{ background: 'rgba(253,212,5,0.10)', color: '#FDD405' }}>
                                        → {watch} to watch
                                    </span>
                                )}
                                {risk > 0 && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                                          style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                                        ⚠ {risk} risk flag{risk > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* sm:, not xs: — at the 375px xs breakpoint two columns leave each
                        card ~165px, which is not enough for an uppercase subtitle
                        ("RETURN ON CAPITAL EMPLOYED") beside its rating badge, and the
                        ROE illustration (₹100 → ₹X, nowrap) overflows its tile. Phones
                        get one full-width card; the pair returns at 640px. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pe != null && (
                        <MetricCard title="Price tag" subtitle="P/E RATIO" badge={peLabel}
                            bottomLabel={`You pay ~${fmtNum(pe)} yrs of profit`}
                            bottomValue={fmtMultiple(pe)}>
                            <PEGradientBar pe={pe} sectorPe={sectorPe || 28} symbol={symbol} />
                        </MetricCard>
                    )}
                    {roe != null && (
                        <MetricCard title="Money engine" subtitle="RETURN ON EQUITY" badge={roeLabel}
                            bottomLabel="Benchmark 15% · Elite 30%+"
                            bottomValue={pct2(roe)}>
                            <ROEViz roe={roe} />
                        </MetricCard>
                    )}
                    {roce != null && (
                        <MetricCard title="Capital muscle" subtitle="RETURN ON CAPITAL EMPLOYED" badge={roceLabel}
                            bottomLabel="Benchmark 20%"
                            bottomValue={pct2(roce)}>
                            <SmallGauge value={roce} size={88} sublabel="ROCE" />
                        </MetricCard>
                    )}
                    {margin != null && (
                        <MetricCard title="Profit slice" subtitle="NET MARGIN" badge={marginLabel}
                            bottomValue={pct2(margin)}>
                            <ProfitSliceBar netMargin={margin} />
                        </MetricCard>
                    )}
                    {debt != null && (
                        <MetricCard title="Debt stress" subtitle="DEBT / EQUITY" badge={debtLabel}
                            bottomLabel="Safe < 1.0 · Risky > 2.0"
                            bottomValue={fmtRatio(debt)}>
                            <DebtGauge value={debt} />
                        </MetricCard>
                    )}
                    {revGr != null && (
                        <MetricCard title="Sales growth" subtitle={`REVENUE · ${cagrLabel}`} badge={revGrLabel}
                            bottomLabel="Goal > 10% per year"
                            bottomValue={pct2(revGr)}>
                            {hist?.revenue_cr?.length
                                ? <MiniBar data={hist.revenue_cr} color="#FDD405" years={years} />
                                : <p className="text-3xl font-black text-zinc-900 dark:text-[#FDD405]">{pct2(revGr)}</p>
                            }
                        </MetricCard>
                    )}
                    {profGr != null && (
                        <MetricCard title="Profit pace" subtitle={`NET PROFIT · ${cagrLabel}`} badge={profGrLabel}
                            bottomLabel="Goal > 10% per year"
                            bottomValue={pct2(profGr)}>
                            {hist?.net_profit_cr?.length
                                ? <MiniLine data={hist.net_profit_cr} color="#FDD405" years={years} />
                                : <p className="text-3xl font-black text-zinc-900 dark:text-[#FDD405]">{pct2(profGr)}</p>
                            }
                        </MetricCard>
                    )}
                    {peers?.length > 0 && (
                        <PeerRankCard peers={peers} group={peerGroup} rank={peerRank} />
                    )}
                    </div>
                </div>
            )}
        </div>
    );
};
