import { useEffect, useRef, useState } from 'react';
import { Rocket, RefreshCw } from 'lucide-react';
import { getApiBase } from '../../lib/apiBase';
import { INNER_CARD_DARK } from './answerKit';
import SlideUpModal from './SlideUpModal';

const API_BASE = getApiBase();
const IPO_ENDPOINT = `${API_BASE}/api/v1/market/ipos`;

const TABS = [
    { key: 'current',  label: 'Open now'  },
    { key: 'upcoming', label: 'Upcoming'  },
    { key: 'past',     label: 'Listed'    },
];

const TAB_EMPTY = {
    current:  'No IPOs are open for subscription right now.',
    upcoming: 'No announced IPOs at the moment — check back soon.',
    past:     'No recent listings found.',
};

const SeriesBadge = ({ series }) => (
    <span
        className={`px-1.5 py-px rounded text-[9px] font-extrabold uppercase tracking-[0.12em] select-none ${
            series === 'SME'
                ? 'bg-zinc-200/70 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400'
                : 'bg-[#FDD405]/15 text-zinc-900 dark:bg-[#FDD405]/15 dark:text-[#FDD405]'
        }`}
    >
        {series || 'EQ'}
    </span>
);

const SubscriptionPill = ({ times }) => {
    if (times == null) return null;
    const hot = times >= 1;
    return (
        <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                hot ? 'text-zinc-900' : 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
            }`}
            style={hot ? { backgroundColor: '#FDD405' } : {}}
        >
            {times.toFixed(1)}× subscribed
        </span>
    );
};

const IpoRow = ({ ipo, tab }) => (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border
                    border-zinc-200 bg-zinc-50
                    dark:border-zinc-800/80 dark:bg-[${INNER_CARD_DARK}]
                    hover:border-[#FDD405]/60 hover:bg-[#FDD405]/[0.04]
                    dark:hover:border-[#FDD405]/50 dark:hover:bg-[#FDD405]/[0.04]
                    transition-colors`}>
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                    {ipo.company}
                </p>
                <SeriesBadge series={ipo.series} />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-px truncate tabular-nums">
                {ipo.symbol || '—'}
                {ipo.price_band && ipo.price_band !== '—' && <> · {ipo.price_band}</>}
                {tab === 'past' && ipo.issue_price != null && <> · issued at ₹{Math.round(ipo.issue_price).toLocaleString('en-IN')}</>}
            </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {tab === 'current' && <SubscriptionPill times={ipo.subscription_times} />}
            <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap tabular-nums">
                {tab === 'current'  && ipo.issue_end     && <>closes <span className="font-semibold text-zinc-600 dark:text-zinc-300">{ipo.issue_end}</span></>}
                {tab === 'upcoming' && ipo.issue_start   && <>opens <span className="font-semibold text-zinc-600 dark:text-zinc-300">{ipo.issue_start}</span></>}
                {tab === 'past'     && ipo.listing_date  && <>listed <span className="font-semibold text-zinc-600 dark:text-zinc-300">{ipo.listing_date}</span></>}
            </p>
        </div>
    </div>
);

const IpoPanel = ({ onClose }) => {
    const panelRef = useRef(null);
    const [tab, setTab]         = useState('current');
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const r = await fetch(IPO_ENDPOINT);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            setData(d);
            // Land on the most useful tab: open issues, else upcoming, else listed
            if (!d.current?.length) setTab(d.upcoming?.length ? 'upcoming' : 'past');
        } catch (e) {
            setError('Could not load IPO data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const rows = data?.[tab] || [];

    return (
        <SlideUpModal
            panelRef={panelRef}
            darkPanelClass="dark:bg-[#181613] dark:border-[#FDD405]/20"
            headerBorderClass="border-zinc-200 dark:border-zinc-800/80"
            onClose={onClose}
            titleBlock={
                <div className="flex items-center gap-2.5 min-w-0">
                    <Rocket size={17} style={{ color: '#FDD405' }} className="flex-shrink-0" />
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">IPO Corner</h2>
                        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            NSE main-board & SME issues · live from the exchange
                        </p>
                    </div>
                </div>
            }
            tabGroup={
                <div className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-[${INNER_CARD_DARK}] flex-1 sm:flex-none`}>
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all duration-200 select-none
                                ${tab === key
                                    ? 'text-zinc-900 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
                            style={tab === key ? { backgroundColor: '#FDD405' } : {}}
                        >
                            {label}
                            {data?.[key]?.length ? ` (${data[key].length})` : ''}
                        </button>
                    ))}
                </div>
            }
        >

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="flex items-center gap-1.5">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full"
                                         style={{ backgroundColor: '#FDD405', animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                                ))}
                            </div>
                            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">Fetching IPO data…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{error}</p>
                            <button
                                onClick={load}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                                           text-zinc-600 dark:text-zinc-300
                                           border border-zinc-300/60 dark:border-zinc-700/60
                                           hover:border-[#FDD405]/60 transition-all"
                            >
                                <RefreshCw size={11} /> Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && rows.length === 0 && (
                        <div className="flex items-center justify-center py-16">
                            <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{TAB_EMPTY[tab]}</p>
                        </div>
                    )}

                    {!loading && !error && rows.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {rows.map((ipo, i) => (
                                <IpoRow key={`${ipo.symbol || ipo.company}-${i}`} ipo={ipo} tab={tab} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-800/80 flex-shrink-0">
                    <p className="text-[10.5px] text-zinc-400 dark:text-zinc-600">
                        Source: NSE · refreshed through the trading day · verify on nseindia.com before applying
                    </p>
                </div>
        </SlideUpModal>
    );
};

export default IpoPanel;
