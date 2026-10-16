import React from 'react';
import { Card } from './answerKit';

/**
 * FundRankingAnswer — "best fund in Large Cap" category-ranking table.
 * Reads app/core/fund_answer.py:_answer_ranking's structured metadata.funds
 * rows directly.
 */

const pct = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
const num = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v.toFixed(2)}${suffix}`);

const FundRankingAnswer = ({ metadata = {} }) => {
    const funds = Array.isArray(metadata?.funds) ? metadata.funds : [];
    const category = metadata?.category || '';
    const sort = metadata?.sort || 'Venty Score';
    if (funds.length === 0) return null;

    return (
        <div className="space-y-3" style={{ animation: 'slideUpFade 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
            <div className="rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-2 bg-[#FDD405]">
                <span className="text-[14px] font-black tracking-wide text-black">Top {category} Funds</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.15em] bg-black/10 text-black/70">
                    by {sort}
                </span>
            </div>

            <Card className="px-4 py-4 overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="text-left py-2 pr-3 text-zinc-500 dark:text-zinc-400 font-medium">#</th>
                            <th className="text-left py-2 pr-3 text-zinc-500 dark:text-zinc-400 font-medium">Fund</th>
                            <th className="text-right py-2 px-3 text-zinc-500 dark:text-zinc-400 font-medium">Venty Score</th>
                            <th className="text-right py-2 px-3 text-zinc-500 dark:text-zinc-400 font-medium">Sharpe</th>
                            <th className="text-right py-2 px-3 text-zinc-500 dark:text-zinc-400 font-medium">3Y Return</th>
                            <th className="text-right py-2 px-3 text-zinc-500 dark:text-zinc-400 font-medium">Expense Ratio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {funds.map((f, i) => (
                            <tr key={(f.scheme_name || '') + i} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                                <td className="py-2 pr-3 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                                <td className="py-2 pr-3 text-zinc-800 dark:text-zinc-100 font-medium">
                                    {f.scheme_name}
                                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{f.amc_name}</span>
                                </td>
                                <td className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100 font-bold">
                                    {f.venty_score != null ? `${f.venty_score.toFixed(0)}/100` : '—'}
                                </td>
                                <td className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100">{num(f.sharpe_ratio)}</td>
                                <td className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100">{pct(f.return_3y)}</td>
                                <td className="text-right py-2 px-3 text-zinc-800 dark:text-zinc-100">{num(f.expense_ratio, '%')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default FundRankingAnswer;
