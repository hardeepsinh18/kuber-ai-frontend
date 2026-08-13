import { clsx } from 'clsx';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmt } from './format';

// ── Stat Card ────────────────────────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
    const colors = {
        indigo: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
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

// ── Shared helpers ───────────────────────────────────────────────────────────
export const Spinner = () => (
    <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

export const ErrorBox = ({ msg, onRetry }) => (
    <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-700 dark:text-rose-400">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span className="flex-1">{msg}</span>
        {onRetry && <button onClick={onRetry} className="text-rose-600 hover:underline font-medium">Retry</button>}
    </div>
);

export const Pagination = ({ total, offset, limit, setOffset }) => {
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
