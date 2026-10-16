import React from 'react';
import { Trophy } from 'lucide-react';
import { Card, MiniLabel } from './answerKit';

/**
 * FundComparisonAnswer — side-by-side fund comparison, mirroring
 * ComparisonAnswer.jsx's layout (VS band, verdict card, metrics table) but
 * reading structured per-fund rows (app/core/fund_answer.py:_answer_comparison)
 * instead of parsing a markdown table — funds don't have per-symbol chart
 * data the way stocks do, so there's no chart section here.
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
const scoreStr = (v) => {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    return Number.isNaN(n) ? '—' : `${n.toFixed(0)}/100`;
};

const FundComparisonAnswer = ({ metadata = {} }) => {
    const funds = Array.isArray(metadata?.funds) ? metadata.funds.slice(0, 3) : [];
    if (funds.length < 2) return null;

    const names = funds.map((f) => f.scheme_name);
    const scored = funds.filter((f) => f.venty_score != null);
    const winner = scored.length
        ? scored.reduce((a, b) => (Number(b.venty_score) > Number(a.venty_score) ? b : a))
        : null;

    const rows = [
        ['NAV', funds.map((f) => num(f.nav))],
        ['1 Year Return', funds.map((f) => pct(f.returns?.['1y']))],
        ['3 Year Return (CAGR)', funds.map((f) => pct(f.returns?.['3y']))],
        ['5 Year Return (CAGR)', funds.map((f) => pct(f.returns?.['5y']))],
        ['Sharpe Ratio', funds.map((f) => num(f.risk?.sharpe))],
        ['Max Drawdown', funds.map((f) => pct(f.risk?.max_drawdown))],
        ['Venty Score', funds.map((f) => scoreStr(f.venty_score))],
        ['Expense Ratio', funds.map((f) => num(f.expense_ratio, '%'))],
        ['AUM', funds.map((f) => num(f.aum_cr, ' Cr'))],
    ];

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div className="rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#FDD405]">
                {names.map((n, i) => (
                    <React.Fragment key={n + i}>
                        {i > 0 && (
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/60">vs</span>
                        )}
                        <span className="text-[14px] font-black tracking-wide text-black">{n}</span>
                    </React.Fragment>
                ))}
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.15em] bg-black/10 text-black/70">
                    Fund Comparison
                </span>
            </div>

            {winner && (
                <Card className="px-4 py-3.5 border-l-4 border-l-street-yellow-ink dark:border-l-[#FDD405]">
                    <MiniLabel>Highest Venty Score</MiniLabel>
                    <div className="mt-1.5 flex items-start gap-2">
                        <Trophy size={16} strokeWidth={2.5} className="mt-[2px] flex-shrink-0 text-street-yellow-ink dark:text-[#FDD405]" />
                        <p className="text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                            <strong className="font-extrabold">{winner.scheme_name}</strong>
                            <span className="text-zinc-600 dark:text-zinc-300"> — {scoreStr(winner.venty_score)}</span>
                        </p>
                    </div>
                </Card>
            )}

            <Card className="px-4 py-4 overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="text-left py-2 pr-3 text-zinc-500 dark:text-zinc-400 font-medium">Metric</th>
                            {names.map((n, i) => (
                                <th key={n + i} className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100 font-bold">
                                    {n}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(([label, vals]) => (
                            <tr key={label} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                                <td className="py-2 pr-3 text-zinc-500 dark:text-zinc-400">{label}</td>
                                {vals.map((v, i) => (
                                    <td key={i} className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100 font-medium">
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default FundComparisonAnswer;
