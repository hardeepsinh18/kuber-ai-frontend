import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmtNum, fmtPct } from '../../../utils/metricFormat';
import { INNER_CARD_DARK } from '../answerKit';
import { MetricCard } from './MetricCard';
import { MiniBar, MiniLine } from './MiniCharts';

/* Sign-aware prefix for a delta/growth figure. Hardcoding "+" rendered a
 * negative CAGR as "+-8.3%" and presented a contracting business as growing,
 * so every badge that shows a change routes through here. Uses the true minus
 * sign (U+2212) rather than a hyphen so it aligns with tabular figures. */
const signed = (v, suffix = '') => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return `${n < 0 ? '−' : '+'}${fmtNum(Math.abs(n))}${suffix}`;
};

/* ─── 5 YEAR FINANCIAL SCORE CARD ───────────────────────────────────────── */
export const FiveYearScoreCard = ({ fund }) => {
    const [open, setOpen] = React.useState(false);
    const hist = fund?.historical;
    if (!hist) return null;

    const years   = hist.years ?? ['FY22', 'FY23', 'FY24', 'FY25', 'FY26'];
    const lastYear = years[years.length - 1] ?? 'Latest';

    const fmtCr = (v) => {
        if (v == null) return '—';
        const n = Number(v);
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L Cr`;
        if (n >= 1000)   return `₹${Math.round(n).toLocaleString('en-IN')} Cr`;
        return `₹${n}`;
    };
    const first = (arr) => arr?.[0] ?? null;
    const last  = (arr) => arr?.[arr.length - 1] ?? null;

    const hasAny = [
        hist.revenue_cr, hist.net_profit_cr, hist.eps,
        hist.roce_pct, hist.roe_pct, hist.net_margin_pct, hist.dividend_yield_pct,
    ].some(a => a?.length > 0) || hist.fcf_crore != null;

    if (!hasAny) return null;

    return (
        <div className={`mt-4 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-white dark:bg-[${INNER_CARD_DARK}]`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-left"
            >
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">5 Year Financial Score Card</span>
                {open ? <ChevronUp size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                      : <ChevronDown size={15} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />}
            </button>
            {open && (
                // sm:, not xs: — same reasoning as the metric grid above: these use the
                // same card shell (uppercase subtitle + badge) around a 5-year bar
                // chart, which is unreadable at the ~165px an xs two-column gives.
                <div className={`p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-[${INNER_CARD_DARK}]`}>
                    {hist.revenue_cr?.length > 0 && (
                        <MetricCard title="Revenue" subtitle="TOP LINE · ₹ CR"
                            badge={hist.revenue_cagr != null ? signed(hist.revenue_cagr, '% CAGR') : null}
                            bottomLabel={first(hist.revenue_cr) ? `From ${fmtCr(first(hist.revenue_cr))} (${years[0]})` : null}
                            bottomValue={fmtCr(last(hist.revenue_cr))}>
                            <MiniBar data={hist.revenue_cr} color="#FDD405" years={years} />
                        </MetricCard>
                    )}
                    {hist.net_profit_cr?.length > 0 && (
                        <MetricCard title="Net Profit" subtitle="BOTTOM LINE · ₹ CR"
                            badge={hist.profit_cagr != null ? signed(hist.profit_cagr, '% CAGR') : null}
                            bottomLabel={first(hist.net_profit_cr) ? `From ${fmtCr(first(hist.net_profit_cr))} (${years[0]})` : null}
                            bottomValue={fmtCr(last(hist.net_profit_cr))}>
                            <MiniBar data={hist.net_profit_cr} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.eps?.length > 0 && (
                        <MetricCard title="EPS" subtitle="EARNINGS PER SHARE · ₹"
                            badge={hist.eps_cagr != null ? signed(hist.eps_cagr, '% CAGR') : null}
                            bottomLabel={first(hist.eps) != null ? `From ₹${first(hist.eps)} (${years[0]})` : null}
                            bottomValue={last(hist.eps) != null ? `₹${last(hist.eps)}` : null}>
                            <MiniLine data={hist.eps} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.roce_pct?.length > 0 && (
                        <MetricCard title="ROCE" subtitle="CAPITAL EFFICIENCY · %"
                            badge={hist.roce_label ?? null}
                            bottomLabel={first(hist.roce_pct) != null ? `${fmtPct(first(hist.roce_pct))} → ${fmtPct(last(hist.roce_pct))}` : null}
                            bottomValue={first(hist.roce_pct) != null && last(hist.roce_pct) != null
                                ? signed(last(hist.roce_pct) - first(hist.roce_pct), ' pts') : null}>
                            <MiniLine data={hist.roce_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.roe_pct?.length > 0 && (
                        <MetricCard title="ROE" subtitle="RETURN ON EQUITY · %"
                            badge={hist.roe_label ?? null}
                            bottomLabel={first(hist.roe_pct) != null ? `${fmtPct(first(hist.roe_pct))} → ${fmtPct(last(hist.roe_pct))}` : null}
                            bottomValue={fmtPct(last(hist.roe_pct))}>
                            <MiniLine data={hist.roe_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.net_margin_pct?.length > 0 && (
                        <MetricCard title="Net Margin" subtitle="PROFITABILITY · %"
                            badge={hist.margin_label ?? null}
                            bottomValue={fmtPct(last(hist.net_margin_pct))}>
                            <MiniLine data={hist.net_margin_pct} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.dividend_yield_pct?.length > 0 && hist.dividend_yield_pct.some(v => v > 0) && (
                        <MetricCard title="Dividend Yield" subtitle="INCOME TO INVESTOR · %"
                            badge={hist.divyld_label ?? null}
                            bottomValue={fmtPct(last(hist.dividend_yield_pct))}>
                            <MiniBar data={hist.dividend_yield_pct.map(v => v || 0)} color="#22c55e" years={years} />
                        </MetricCard>
                    )}
                    {hist.fcf_crore != null && (
                        <div className="bg-[#FDD405] rounded-xl p-4 flex flex-col">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-black leading-none">Free Cash Flow</p>
                                    <p className="text-[10px] text-black/60 uppercase tracking-wide mt-0.5">HIGH EARNINGS QUALITY</p>
                                </div>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-semibold text-black">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 inline-block flex-shrink-0" />
                                    NEW
                                </span>
                            </div>
                            <p className="text-[10px] text-black/60 uppercase tracking-wide mb-1">{lastYear} FCF</p>
                            <p className="text-2xl font-black text-black leading-none">
                                ₹{Number(hist.fcf_crore).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs font-bold text-black/70 mt-0.5">CRORE</p>
                            <div className="mt-3 pt-2 border-t border-black/20">
                                <p className="text-[10px] text-black/60 leading-snug">Cash left after running & growing the business</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-black/60">Profits convert to real cash</p>
                                    <p className="text-[11px] font-bold text-black">₹{Number(hist.fcf_crore).toLocaleString('en-IN')} Cr</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
