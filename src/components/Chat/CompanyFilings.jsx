import React, { useState } from 'react';

/**
 * Company Filings & Disclosures panel — surfaces the primary-source corpus
 * (corporate_documents) behind an answer: annual reports, earnings-call transcripts,
 * investor presentations, announcements — grouped by type with links to the NSE PDFs.
 *
 * Props: data = {
 *   symbol, total,
 *   groups: [{ type, label, icon, count, items: [{ title, period, date, url }] }]
 * }
 */

const ACCENT = '#FDD405';

const fmtDate = (d) => {
    if (!d) return null;
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch { return null; }
};

// Announcements rarely have a clean quarter — prefer the date; else the period; else a clipped title.
const itemLabel = (type, item) => {
    if (type === 'announcement') return fmtDate(item.date) || item.period || (item.title || '').slice(0, 22);
    return item.period || fmtDate(item.date) || (item.title || '').slice(0, 22);
};

const CompanyFilings = ({ data }) => {
    const [open, setOpen] = useState(false);
    if (!data || !Array.isArray(data.groups) || data.groups.length === 0) return null;

    return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}40)` }} />
            <div className="px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900/60">
                {/* Header — clickable to expand */}
                <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                        📄 Company Filings &amp; Disclosures
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: `${ACCENT}1e`, color: '#a98a00' }}>
                        backed by {data.total} primary {data.total === 1 ? 'document' : 'documents'}
                    </span>
                    <span className="ml-auto text-[11px] text-zinc-400">{open ? '▲' : '▼'}</span>
                </button>

                {/* Collapsed: one-line type summary. Expanded: full grouped lists. */}
                {!open ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {data.groups.map((g) => (
                            <span key={g.type} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {g.icon} {g.label} <span className="font-semibold text-zinc-600 dark:text-zinc-300">{g.count}</span>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="mt-3 space-y-3">
                        {data.groups.map((g) => (
                            <div key={g.type}>
                                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                                    {g.icon} {g.label} <span className="text-zinc-400 dark:text-zinc-600 font-normal">({g.count})</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {g.items.map((it, i) => {
                                        const label = itemLabel(g.type, it);
                                        const inner = (
                                            <>
                                                {label}
                                                {it.url && <span className="ml-1 opacity-60">↗</span>}
                                            </>
                                        );
                                        return it.url ? (
                                            <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
                                               title={it.title}
                                               className="text-[11px] px-2.5 py-1 rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                {inner}
                                            </a>
                                        ) : (
                                            <span key={i} title={it.title}
                                                  className="text-[11px] px-2.5 py-1 rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                                                {label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="text-[9.5px] text-zinc-400 dark:text-zinc-600">
                            Source documents filed with NSE/BSE. Click to open the original PDF.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyFilings;
