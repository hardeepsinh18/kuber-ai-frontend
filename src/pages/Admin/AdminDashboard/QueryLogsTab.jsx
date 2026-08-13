import { useState } from 'react';
import { clsx } from 'clsx';
import { Search, RefreshCw } from 'lucide-react';
import useAdminFetch from '../../../hooks/useAdminFetch';
import { fmt, fmtMs, fmtDate } from './format';
import { Spinner, ErrorBox, Pagination } from './shared';

// ── Query Logs Tab ───────────────────────────────────────────────────────────
const QueryLogsTab = () => {
    const [search, setSearch] = useState('');
    const [intent, setIntent] = useState('');
    const [offset, setOffset] = useState(0);
    const LIMIT = 30;

    const { data, loading, err, load } = useAdminFetch('/admin/dashboard/queries', { limit: LIMIT, offset, search: search || null, intent: intent || null });

    const intentColor = (i) => {
        if (!i) return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
        if (i.includes('STOCK')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        if (i.includes('SCREEN')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
        if (i.includes('STRATEGIC')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        if (i.includes('GREETING')) return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
                        placeholder="Search queries..."
                        className="pl-8 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 w-56" />
                </div>
                <select value={intent} onChange={e => { setIntent(e.target.value); setOffset(0); }}
                    className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">All Intents</option>
                    {['STOCK_QUERY', 'SCREENING', 'STRATEGIC', 'DIAGNOSTIC', 'MARKET_OVERVIEW', 'PREDICTIVE', 'PORTFOLIO', 'GREETING', 'BASIC_CONCEPT', 'GENERAL_INFO'].map(i => (
                        <option key={i} value={i}>{i}</option>
                    ))}
                </select>
                <button onClick={load} className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? <Spinner /> : err ? <ErrorBox msg={err} onRetry={load} /> : (
                <>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700">
                                <tr>
                                    {['Time', 'User', 'Query', 'Intent', 'LLM', 'Response Time', 'Tokens'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {data.queries.map(q => (
                                    <tr key={q.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">{fmtDate(q.created_at)}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-[140px] truncate text-xs">{q.email || '—'}</td>
                                        <td className="px-4 py-3 max-w-[280px]">
                                            <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2 text-xs leading-relaxed">{q.query_text || '—'}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {q.intent_detected && (
                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', intentColor(q.intent_detected))}>
                                                    {q.intent_detected}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{q.llm_model_used || '—'}</td>
                                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                                            <span className={clsx(q.response_time_ms > 5000 ? 'text-rose-600 dark:text-rose-400' : q.response_time_ms > 2000 ? 'text-amber-600 dark:text-[#FDD405]' : 'text-emerald-600 dark:text-emerald-400')}>
                                                {fmtMs(q.response_time_ms)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500 text-xs">{fmt(q.tokens_used)}</td>
                                    </tr>
                                ))}
                                {!data.queries.length && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 text-sm">No queries found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={data.total} offset={offset} limit={LIMIT} setOffset={setOffset} />
                </>
            )}
        </div>
    );
};

export default QueryLogsTab;
