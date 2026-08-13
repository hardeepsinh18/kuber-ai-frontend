import { useState } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, BarChart3 } from 'lucide-react';
import useAdminFetch from '../../../hooks/useAdminFetch';
import { fmt, fmtMs } from './format';
import { Spinner, ErrorBox } from './shared';

// ── API Stats Tab ────────────────────────────────────────────────────────────
const ApiStatsTab = () => {
    const [days, setDays] = useState(7);

    const { data, loading, err, load } = useAdminFetch('/admin/dashboard/api-stats', { days });

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                        className={clsx('px-3 py-1.5 text-sm rounded-lg border transition-colors',
                            days === d ? 'bg-amber-600 text-white border-amber-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
                        {d}d
                    </button>
                ))}
            </div>

            {loading ? <Spinner /> : err ? <ErrorBox msg={err} onRetry={load} /> : (
                <>
                    {/* Daily volume bar chart */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-amber-500" /> Daily Query Volume
                        </h3>
                        <div className="flex items-end gap-1 h-32">
                            {data.daily_volume.map(d => {
                                const max = Math.max(...data.daily_volume.map(x => x.total), 1);
                                const pct = d.total / max * 100;
                                const errPct = d.errors / Math.max(d.total, 1) * 100;
                                return (
                                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                            {d.day}: {d.total} queries, {d.errors} errors
                                        </div>
                                        <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                                            <div className="w-full bg-rose-400 rounded-sm" style={{ height: `${errPct * pct / 100}%` }} />
                                            <div className="w-full bg-amber-500 rounded-sm" style={{ height: `${pct * (1 - errPct / 100)}%` }} />
                                        </div>
                                        <span className="text-[9px] text-zinc-400 rotate-45 origin-left whitespace-nowrap">
                                            {new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                );
                            })}
                            {!data.daily_volume.length && <p className="text-xs text-zinc-400 m-auto">No data</p>}
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Queries</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Errors</span>
                        </div>
                    </div>

                    {/* LLM model table */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <BarChart3 size={14} className="text-emerald-500" /> LLM Model Breakdown ({days}d)
                            </h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                                <tr>
                                    {['Model', 'Calls', 'Avg Response', 'Total Tokens'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {data.llm_models.map(m => (
                                    <tr key={m.model} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20">
                                        <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">{m.model}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmt(m.calls)}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmtMs(m.avg_ms)}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmt(m.total_tokens)}</td>
                                    </tr>
                                ))}
                                {!data.llm_models.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-400 text-sm">No data</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default ApiStatsTab;
