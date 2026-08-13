import { clsx } from 'clsx';
import { Activity, Users, Clock, AlertTriangle, Zap, Database } from 'lucide-react';
import useAdminFetch from '../../../hooks/useAdminFetch';
import { fmt, fmtMs } from './format';
import { StatCard, Spinner, ErrorBox } from './shared';

// ── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = () => {
    const { data, loading, err, load } = useAdminFetch('/admin/dashboard/overview');

    if (loading) return <Spinner />;
    if (err) return <ErrorBox msg={err} onRetry={load} />;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Activity} label="Queries Today" value={fmt(data.queries_today)} sub={`${fmt(data.queries_7d)} this week`} color="indigo" />
                <StatCard icon={Users} label="Active Users Today" value={fmt(data.users_today)} sub={`${fmt(data.users_7d)} this week`} color="emerald" />
                <StatCard icon={Clock} label="Avg Response Time" value={fmtMs(data.avg_response_ms_today)} sub={`${fmtMs(data.avg_response_ms_7d)} 7d avg`} color="amber" />
                <StatCard icon={AlertTriangle} label="Error Rate Today" value={`${data.error_rate_today_pct}%`} sub={`${fmt(data.total_queries)} total queries`} color={data.error_rate_today_pct > 10 ? 'rose' : 'indigo'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                        <Zap size={14} className="text-[#FDD405]" /> Top Intents Today
                    </h3>
                    <div className="space-y-2">
                        {data.top_intents.map((item) => {
                            const max = data.top_intents[0]?.count || 1;
                            const pct = Math.round(item.count / max * 100);
                            return (
                                <div key={item.intent}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{item.intent}</span>
                                        <span className="text-zinc-500">{fmt(item.count)}</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!data.top_intents.length && <p className="text-xs text-zinc-400">No data yet</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                        <Database size={14} className="text-emerald-500" /> LLM Usage Today
                    </h3>
                    <div className="space-y-3">
                        {data.llm_breakdown.map((item) => {
                            const max = data.llm_breakdown[0]?.count || 1;
                            const pct = Math.round(item.count / max * 100);
                            const color = item.model?.includes('gpt') ? 'bg-emerald-500'
                                : item.model?.includes('gemini') ? 'bg-blue-500'
                                    : item.model?.includes('template') ? 'bg-zinc-400'
                                        : 'bg-emerald-500';
                            return (
                                <div key={item.model}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{item.model || 'unknown'}</span>
                                        <span className="text-zinc-500">{fmt(item.count)}</span>
                                    </div>
                                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!data.llm_breakdown.length && <p className="text-xs text-zinc-400">No data yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
