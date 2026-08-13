import { useState } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';
import useAdminFetch from '../../../hooks/useAdminFetch';
import { fmt, fmtDate } from './format';
import { Spinner, ErrorBox, Pagination } from './shared';

// ── Users Tab ────────────────────────────────────────────────────────────────
const UsersTab = ({ onViewChat }) => {
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    const { data, loading, err, load } = useAdminFetch('/admin/dashboard/users', { limit: LIMIT, offset, search: search || null });

    const handleSearch = (e) => { e.preventDefault(); setOffset(0); load(); };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by email or name..."
                        className="w-full pl-8 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <button type="submit" className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">Search</button>
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
                                                u.subscription_plan === 'pro' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
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
                                            <button onClick={() => onViewChat(u)} className="text-xs text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">
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

export default UsersTab;
