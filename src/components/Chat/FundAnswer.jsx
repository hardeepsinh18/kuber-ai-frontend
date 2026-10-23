import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardHeader, MiniLabel, ScoreRing, InlineMd } from './answerKit';

/**
 * FundAnswer — single mutual fund rich card, the fund-side equivalent of the
 * stock Quick/Analyst screens. Reads straight off the backend's structured
 * metadata (see app/core/fund_answer.py:render) rather than parsing markdown,
 * since that data is already clean per-field.
 */

// Number(v), not v.toFixed() directly -- a value that looks numeric in JSON
// isn't guaranteed to arrive as a JS number (e.g. a DB Decimal serialized as
// a string through a different code path than the one already tested live).
// v.toFixed() throws on a string and takes the whole message down with it;
// Number(v) coerces a numeric string safely and NaN falls back to '—'.
const pct = (v) => {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    return Number.isNaN(n) ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
};
const num = (v, suffix = '') => {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    return Number.isNaN(n) ? '—' : `${n.toFixed(2)}${suffix}`;
};

// One row of a Sector/Cap Allocation breakdown — a label + a percentage bar.
const AllocationRow = ({ label, weightPct }) => {
    const pctVal = Number(weightPct);
    const widthPct = Number.isNaN(pctVal) ? 0 : Math.max(0, Math.min(100, pctVal));
    return (
        <div>
            <div className="flex justify-between text-[12.5px] mb-1">
                <span className="text-zinc-700 dark:text-zinc-200 truncate pr-2">{label}</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium flex-shrink-0">{num(weightPct, '%')}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-street-yellow-ink dark:bg-[#FDD405]"
                    style={{ width: `${widthPct}%` }}
                />
            </div>
        </div>
    );
};

// Sector/Cap Allocation cards share this shape: {label, weight_pct} rows,
// already sorted by weight descending from the backend. A fund can carry 25+
// sectors, which turned the card into a wall of bars -- show the top few
// (useful at a glance) and collapse the long tail behind a toggle instead of
// dumping everything at once.
const AllocationBars = ({ rows, labelKey, initialCount = 6 }) => {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? rows : rows.slice(0, initialCount);
    const remaining = rows.length - initialCount;

    return (
        <div className="mt-2 space-y-2">
            {visible.map((r, i) => (
                <AllocationRow key={i} label={r[labelKey]} weightPct={r.weight_pct} />
            ))}
            {remaining > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="w-full flex items-center justify-center gap-1 pt-1.5 text-[11.5px] font-semibold
                               text-street-yellow-ink dark:text-[#FDD405] hover:opacity-80 transition-opacity"
                >
                    {expanded ? 'Show less' : `Show ${remaining} more`}
                    <ChevronDown size={13} strokeWidth={2.5} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
            )}
        </div>
    );
};

const FundAnswer = ({ metadata = {} }) => {
    const {
        scheme_name, amc_name, plan_type, option_type, nav, nav_date, stale,
        returns = {}, risk = {}, venty_score, expense_ratio, aum_cr,
        benchmark_name, fund_manager, exit_load, top_holdings = [],
        sector_allocation = [], cap_allocation = [], direct_answer,
    } = metadata;

    if (!scheme_name) return null;

    const returnPeriods = [
        ['1M', returns['1m']], ['3M', returns['3m']], ['6M', returns['6m']],
        ['1Y', returns['1y']], ['3Y', returns['3y']], ['5Y', returns['5y']],
        ['Since Inception', returns['since_inception']],
    ];
    const riskRows = [
        ['Std Deviation', num(risk.std_dev)], ['Sharpe Ratio', num(risk.sharpe)],
        ['Beta', num(risk.beta)], ['Alpha', num(risk.alpha)], ['Max Drawdown', pct(risk.max_drawdown)],
    ];
    const basicsRows = [
        ['Expense Ratio', num(expense_ratio, '%')],
        ['AUM', num(aum_cr, ' Cr')],
        ['Benchmark', benchmark_name || 'not available yet'],
        ['Fund Manager', fund_manager || 'not available yet'],
        ['Exit Load', exit_load || 'not available yet'],
    ];

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            {direct_answer && (
                <div className="rounded-2xl px-4 py-3 bg-[#FDD405]">
                    {/* InlineMd renders its own <p> internally (react-markdown) --
                        wrapping it in another <p> here nests block-in-block, which
                        browsers silently restructure and was producing a broken
                        partial-background artifact. Match every other InlineMd call
                        site in this app: a <div>, not a <p>. */}
                    <div className="text-[13.5px] font-semibold text-black leading-snug">
                        <InlineMd>{direct_answer}</InlineMd>
                    </div>
                </div>
            )}

            <Card className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardHeader>{scheme_name}</CardHeader>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {amc_name} · {plan_type} · {option_type}
                        </p>
                    </div>
                    {venty_score != null && (
                        <div className="flex flex-col items-center flex-shrink-0">
                            <ScoreRing score={venty_score} size={56} stroke={6} />
                            <MiniLabel className="mt-1">Venty Score</MiniLabel>
                        </div>
                    )}
                </div>
                {stale ? (
                    <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">
                        ⚠️ NAV data is {nav_date ? `from ${nav_date}` : 'stale'} — may be out of date.
                    </p>
                ) : (
                    <p className="mt-2 text-[13px] text-zinc-700 dark:text-zinc-200">
                        NAV: <strong>{num(nav)}</strong>
                        {nav_date && <span className="text-zinc-500 dark:text-zinc-400"> as of {nav_date}</span>}
                    </p>
                )}
            </Card>

            <Card className="px-4 py-3.5">
                <MiniLabel>Returns</MiniLabel>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {returnPeriods.map(([label, val]) => (
                        <div key={label} className="rounded-xl px-2.5 py-2 bg-zinc-50 dark:bg-[#0d0c0b]">
                            <p className="text-[9px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
                            <p className="text-[13px] font-bold text-zinc-900 dark:text-white">{pct(val)}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="px-4 py-3.5">
                <MiniLabel>Risk Metrics</MiniLabel>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {riskRows.map(([label, val]) => (
                        <div key={label} className="rounded-xl px-2.5 py-2 bg-zinc-50 dark:bg-[#0d0c0b]">
                            <p className="text-[9px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
                            <p className="text-[13px] font-bold text-zinc-900 dark:text-white">{val}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="px-4 py-3.5">
                <MiniLabel>Fund Basics</MiniLabel>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                    {basicsRows.map(([label, val]) => (
                        <div key={label} className="flex justify-between gap-3">
                            <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
                            <dd className="text-zinc-800 dark:text-zinc-100 font-medium text-right">{val}</dd>
                        </div>
                    ))}
                </dl>
            </Card>

            {top_holdings.length > 0 && (
                <Card className="px-4 py-3.5">
                    <MiniLabel>Top Holdings</MiniLabel>
                    <div className="mt-2 space-y-1.5">
                        {top_holdings.map((h, i) => (
                            <div key={i} className="flex justify-between text-[13px]">
                                <span className="text-zinc-800 dark:text-zinc-100">{h.stock_name}</span>
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {num(h.weight_pct, '%')}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {sector_allocation.length > 0 && (
                <Card className="px-4 py-3.5">
                    <MiniLabel>Sector Allocation ({sector_allocation.length})</MiniLabel>
                    <AllocationBars rows={sector_allocation} labelKey="sector" />
                </Card>
            )}

            {cap_allocation.length > 0 && (
                <Card className="px-4 py-3.5">
                    <MiniLabel>Cap Allocation</MiniLabel>
                    <AllocationBars rows={cap_allocation} labelKey="cap_tier" />
                </Card>
            )}
        </div>
    );
};

export default FundAnswer;
