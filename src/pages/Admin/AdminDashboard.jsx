import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
    Users, Activity, Clock, AlertTriangle, BarChart3,
    MessageSquare, Search, ChevronLeft, ChevronRight,
    RefreshCw, TrendingUp, Zap, Database, X
} from 'lucide-react';
import { getApiBase } from '../../lib/apiBase';
import { getIdToken } from '../../lib/supabase';

const API_BASE = getApiBase();   // '' = same-origin (/api/v1/...); set VITE_API_BASE for dev
const API_PREFIX = '/api/v1';

// SEC-004/SEC-C-002: authenticate admin calls with the signed-in admin's own
// Cognito ID token (verified server-side against the ADMIN_EMAILS allowlist by
// require_admin) — NOT a shared secret baked into the JS bundle. The page only
// renders behind AdminGuard, so a token is always available here.
const adminFetch = async (path, params = {}) => {
    const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    const token = await getIdToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
};

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
const fmtMs = (ms) => ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-[#FDD405]',
        rose: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
    };
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
                    {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</p>}
                </div>
                <div className={clsx('p-2.5 rounded-lg', colors[color])}>
                    <Icon size={18} />
                </div>
            </div>
        </div>
    );
};

// ── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        adminFetch('/admin/dashboard/overview')
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

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
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!data.top_intents.length && <p className="text-xs text-zinc-400">No data yet</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                        <Database size={14} className="text-purple-500" /> LLM Usage Today
                    </h3>
                    <div className="space-y-3">
                        {data.llm_breakdown.map((item) => {
                            const max = data.llm_breakdown[0]?.count || 1;
                            const pct = Math.round(item.count / max * 100);
                            const color = item.model?.includes('gpt') ? 'bg-emerald-500'
                                : item.model?.includes('gemini') ? 'bg-blue-500'
                                    : item.model?.includes('template') ? 'bg-zinc-400'
                                        : 'bg-purple-500';
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

// ── Users Tab ────────────────────────────────────────────────────────────────
const UsersTab = ({ onViewChat }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    const load = useCallback(() => {
        setLoading(true);
        adminFetch('/admin/dashboard/users', { limit: LIMIT, offset, search: search || null })
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [offset, search]);

    useEffect(() => { load(); }, [load]);

    const handleSearch = (e) => { e.preventDefault(); setOffset(0); load(); };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by email or name..."
                        className="w-full pl-8 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Search</button>
                {search && <button type="button" onClick={() => { setSearch(''); setOffset(0); }} className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"><X size={14} /></button>}
            </form>

            {loading ? <Spinner /> : err ? <ErrorBox msg={err} onRetry={load} /> : (
                <>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700">
                                <tr>
                                    {['Email', 'Name', 'Plan', 'Queries Today', 'Total Queries', 'Last Active', 'Status', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {data.users.map(u => (
                                    <tr key={u.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">{u.email || '—'}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.full_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                                                u.subscription_plan === 'pro' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400')}>
                                                {u.subscription_plan || 'free'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmt(u.api_calls_today)}</td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{fmt(u.total_queries)}</td>
                                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500 whitespace-nowrap">{fmtDate(u.last_sign_in_at)}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                                                u.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => onViewChat(u)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                                                View Chats
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {!data.users.length && (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-400 text-sm">No users found</td></tr>
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

// ── Query Logs Tab ───────────────────────────────────────────────────────────
const QueryLogsTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [search, setSearch] = useState('');
    const [intent, setIntent] = useState('');
    const [offset, setOffset] = useState(0);
    const LIMIT = 30;

    const load = useCallback(() => {
        setLoading(true);
        adminFetch('/admin/dashboard/queries', { limit: LIMIT, offset, search: search || null, intent: intent || null })
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [offset, search, intent]);

    useEffect(() => { load(); }, [load]);

    const intentColor = (i) => {
        if (!i) return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
        if (i.includes('STOCK')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        if (i.includes('SCREEN')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
        if (i.includes('STRATEGIC')) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        if (i.includes('GREETING')) return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
                        placeholder="Search queries..."
                        className="pl-8 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56" />
                </div>
                <select value={intent} onChange={e => { setIntent(e.target.value); setOffset(0); }}
                    className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">
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

// ── Chat History Tab ─────────────────────────────────────────────────────────
const ChatHistoryTab = ({ selectedUser, onClearUser }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [userId, setUserId] = useState(selectedUser?.id || '');
    const [openThread, setOpenThread] = useState(null);

    useEffect(() => {
        if (selectedUser?.id) {
            setUserId(selectedUser.id);
        }
    }, [selectedUser]);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        adminFetch(`/admin/dashboard/chat/${userId}`)
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [userId]);

    return (
        <div className="space-y-4">
            {selectedUser && (
                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{selectedUser.email}</span>
                    <button onClick={() => { onClearUser(); setData(null); setUserId(''); }} className="ml-auto text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"><X size={14} /></button>
                </div>
            )}

            {!selectedUser && (
                <div className="flex gap-2">
                    <input value={userId} onChange={e => setUserId(e.target.value)}
                        placeholder="Enter user UUID..."
                        className="flex-1 max-w-sm px-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => { setData(null); setErr(null); }}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Load
                    </button>
                </div>
            )}

            {loading && <Spinner />}
            {err && <ErrorBox msg={err} onRetry={() => setErr(null)} />}
            {!userId && !loading && (
                <div className="text-center py-12 text-zinc-400">
                    <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click "View Chats" on a user from the Users tab, or enter a user ID above.</p>
                </div>
            )}

            {data && (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-500">{data.threads.length} thread{data.threads.length !== 1 ? 's' : ''}</p>
                    {data.threads.map(thread => (
                        <div key={thread.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setOpenThread(openThread === thread.id ? null : thread.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-left"
                            >
                                <div>
                                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{thread.title || 'Untitled thread'}</p>
                                    <p className="text-xs text-zinc-400 mt-0.5">{fmtDate(thread.created_at)} · {thread.messages?.length || 0} messages</p>
                                </div>
                                <ChevronLeft size={14} className={clsx('text-zinc-400 transition-transform', openThread === thread.id ? '-rotate-90' : 'rotate-180')} />
                            </button>
                            {openThread === thread.id && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
                                    {thread.messages?.map((msg, i) => (
                                        <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                            <div className={clsx('max-w-[75%] px-3 py-2 rounded-lg text-xs leading-relaxed',
                                                msg.role === 'user'
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200')}>
                                                <p className="font-medium opacity-50 mb-0.5 text-[10px] uppercase">{msg.role}</p>
                                                <p className="whitespace-pre-wrap line-clamp-6">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {!data.threads.length && <p className="text-sm text-zinc-400">No chat history for this user.</p>}
                </div>
            )}
        </div>
    );
};

// ── API Stats Tab ────────────────────────────────────────────────────────────
const ApiStatsTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [days, setDays] = useState(7);

    const load = useCallback(() => {
        setLoading(true);
        adminFetch('/admin/dashboard/api-stats', { days })
            .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [days]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                {[7, 14, 30].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                        className={clsx('px-3 py-1.5 text-sm rounded-lg border transition-colors',
                            days === d ? 'bg-indigo-600 text-white border-indigo-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800')}>
                        {d}d
                    </button>
                ))}
            </div>

            {loading ? <Spinner /> : err ? <ErrorBox msg={err} onRetry={load} /> : (
                <>
                    {/* Daily volume bar chart */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-indigo-500" /> Daily Query Volume
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
                                            <div className="w-full bg-indigo-500 rounded-sm" style={{ height: `${pct * (1 - errPct / 100)}%` }} />
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
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Queries</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Errors</span>
                        </div>
                    </div>

                    {/* LLM model table */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                <BarChart3 size={14} className="text-purple-500" /> LLM Model Breakdown ({days}d)
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

// ── Shared helpers ───────────────────────────────────────────────────────────
const Spinner = () => (
    <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

const ErrorBox = ({ msg, onRetry }) => (
    <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-400">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span className="flex-1">{msg}</span>
        {onRetry && <button onClick={onRetry} className="text-rose-600 hover:underline font-medium">Retry</button>}
    </div>
);

const Pagination = ({ total, offset, limit, setOffset }) => {
    const page = Math.floor(offset / limit) + 1;
    const pages = Math.ceil(total / limit);
    if (pages <= 1) return null;
    return (
        <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>{offset + 1}–{Math.min(offset + limit, total)} of {fmt(total)}</span>
            <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1">{page}/{pages}</span>
                <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'queries', label: 'Query Logs', icon: MessageSquare },
    { id: 'chat', label: 'Chat History', icon: MessageSquare },
    { id: 'api', label: 'API Stats', icon: BarChart3 },
];

export default function AdminDashboard() {
    const [tab, setTab] = useState('overview');
    const [chatUser, setChatUser] = useState(null);

    const handleViewChat = (user) => {
        setChatUser(user);
        setTab('chat');
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">KuberAI Admin</h1>
                        <p className="text-xs text-zinc-400 mt-0.5">Internal dashboard · 72Street.ai</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">Live</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Tab bar */}
                <div className="flex gap-1 mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 w-fit">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={clsx('flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                tab === id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800')}>
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'overview' && <OverviewTab />}
                {tab === 'users' && <UsersTab onViewChat={handleViewChat} />}
                {tab === 'queries' && <QueryLogsTab />}
                {tab === 'chat' && <ChatHistoryTab selectedUser={chatUser} onClearUser={() => setChatUser(null)} />}
                {tab === 'api' && <ApiStatsTab />}
            </div>
        </div>
    );
}
