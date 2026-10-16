import React from 'react';
import { Card, CardHeader, MiniLabel, ScoreRing } from './answerKit';

/**
 * FundAnswer — single mutual fund rich card, the fund-side equivalent of the
 * stock Quick/Analyst screens. Reads straight off the backend's structured
 * metadata (see app/core/fund_answer.py:render) rather than parsing markdown,
 * since that data is already clean per-field.
 */

const pct = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
const num = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v.toFixed(2)}${suffix}`);

const FundAnswer = ({ metadata = {} }) => {
    const {
        scheme_name, amc_name, plan_type, option_type, nav, nav_date, stale,
        returns = {}, risk = {}, venty_score, expense_ratio, aum_cr,
        benchmark_name, fund_manager, exit_load, top_holdings = [],
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
                                    {h.weight_pct != null ? `${h.weight_pct.toFixed(2)}%` : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default FundAnswer;
