import React, { useState } from 'react';
import {
    Briefcase, FileText, Coins, Mic, Users, Gavel, Newspaper,
    TrendingUp, ShieldCheck, Building2, ArrowUpRight, Activity,
} from 'lucide-react';

/**
 * Recent Developments — material company events (categorized exchange announcements
 * from td_announcements, corpus-announcement fallback). The "the AI knows what's
 * actually happening at this company" signal.
 *
 * Props: data = {
 *   symbol, count, has_material,
 *   items: [{ title, category, importance, date, url, summary }]
 * }
 */

const CAT_ICON = {
    'Acquisition': Briefcase, 'Merger': Briefcase, 'Demerger': Briefcase,
    'Results': FileText, 'Earnings Call': Mic, 'Dividend': Coins, 'Bonus Issue': Coins,
    'Buyback': Coins, 'Stock Split': Coins, 'Fund Raise': Coins,
    'Management Change': Users, 'Board Change': Users, 'Appointment': Users,
    'Order Win': TrendingUp, 'Credit Rating': ShieldCheck, 'Investor Meet': Building2,
    'Board Meeting': Gavel, 'Press Release': Newspaper, 'Compliance': ShieldCheck,
};

const fmtDate = (d) => {
    if (!d) return '';
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return ''; }
};

const RecentDevelopments = ({ data }) => {
    const [open, setOpen] = useState(true);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;

    const materialCount = data.items.filter(i => i.importance === 'high').length;

    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #6366f1, #6366f140)' }} />
            <div className="px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/60">
                <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
                    <Activity size={13} className="text-indigo-500" strokeWidth={2.4} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                        Recent Developments
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                        {data.count} {data.count === 1 ? 'event' : 'events'}{materialCount ? ` · ${materialCount} material` : ''}
                    </span>
                    <span className="ml-auto text-[11px] text-zinc-400">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                    <div className="mt-3 relative pl-4">
                        {/* timeline rail */}
                        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-zinc-200 dark:bg-zinc-700" />
                        <div className="space-y-2.5">
                            {data.items.map((it, i) => {
                                const Icon = CAT_ICON[it.category] || FileText;
                                const material = it.importance === 'high';
                                const dot = material ? '#6366f1' : 'rgba(113,113,122,0.6)';
                                const Row = it.url ? 'a' : 'div';
                                const rowProps = it.url
                                    ? { href: it.url, target: '_blank', rel: 'noopener noreferrer' }
                                    : {};
                                return (
                                    <Row key={i} {...rowProps}
                                        className={`group block relative ${it.url ? 'cursor-pointer' : ''}`}>
                                        {/* dot */}
                                        <span className="absolute -left-[14px] top-[5px] w-[9px] h-[9px] rounded-full border-2"
                                            style={{ background: material ? dot : 'transparent', borderColor: dot }} />
                                        <div className="flex items-start gap-2">
                                            <Icon size={13} strokeWidth={2}
                                                className={material ? 'text-indigo-500 mt-0.5' : 'text-zinc-400 mt-0.5'} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[11px] font-semibold ${material ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                        {it.category}
                                                    </span>
                                                    {it.date && (
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{fmtDate(it.date)}</span>
                                                    )}
                                                    {it.url && (
                                                        <ArrowUpRight size={11}
                                                            className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
                                                    )}
                                                </div>
                                                <div className="text-[12px] text-zinc-700 dark:text-zinc-200 leading-snug">
                                                    {it.title}
                                                </div>
                                                {it.summary && (
                                                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug mt-0.5 line-clamp-2">
                                                        {it.summary}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Row>
                                );
                            })}
                        </div>
                        <div className="mt-3 text-[9.5px] text-zinc-400 dark:text-zinc-600">
                            Material events filed with NSE/BSE. Click to open the disclosure.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentDevelopments;
