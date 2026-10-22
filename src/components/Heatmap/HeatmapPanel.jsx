import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutGrid, RefreshCw, X } from 'lucide-react';
import { getApiBase } from '../../lib/apiBase';
import {
    INDEX_TABS, TIMEFRAMES, colorFor, legendStops, layoutHeatmap,
    formatPct, formatPrice, formatVolume,
} from './heatmapLayout';

const ENDPOINT = `${getApiBase()}/api/v1/market/heatmap`;
const POLL_MS = 60_000;
const MOBILE_MAX = 640;

const pctText = (p) => (p == null ? 'text-zinc-400' : p >= 0 ? 'text-emerald-400' : 'text-rose-400');

function useHeatmap(index, tf) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const r = await fetch(`${ENDPOINT}?index=${index}&tf=${tf}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            setData(await r.json());
        } catch {
            setError('Could not load the heat map. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [index, tf]);

    useEffect(() => { load(); }, [load]);

    // Live refresh only while the market is open — after close the numbers are final.
    useEffect(() => {
        if (!data?.market_open) return undefined;
        const id = setInterval(() => load(true), POLL_MS);
        return () => clearInterval(id);
    }, [data?.market_open, load]);

    return { data, loading, error, reload: () => load() };
}

function useElementSize(ref) {
    const [size, setSize] = useState({ w: 0, h: 0 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return size;
}

const Pills = ({ items, value, onChange, scroll }) => (
    <div className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-white/[0.04] ${scroll ? 'overflow-x-auto [scrollbar-width:none]' : ''}`}>
        {items.map(({ key, label }) => (
            <button
                key={key}
                onClick={() => onChange(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors select-none
                    ${value === key ? 'text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                style={value === key ? { backgroundColor: '#FDD405' } : {}}
            >
                {label}
            </button>
        ))}
    </div>
);

const Legend = ({ tf }) => (
    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 tabular-nums">
        {legendStops(tf).map(({ value, color }) => (
            <span key={value} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {value > 0 ? '+' : ''}{value}%
            </span>
        ))}
    </div>
);

const Tooltip = ({ tip, tf, bounds }) => {
    if (!tip) return null;
    const { stock, sector, x, y } = tip;
    // Flip to the other side of the cursor near the right/bottom edges.
    const left = x + 230 > bounds.w ? x - 222 : x + 14;
    const top = y + 130 > bounds.h ? y - 122 : y + 14;
    return (
        <div
            className="absolute z-20 w-52 pointer-events-none rounded-xl border border-zinc-700 bg-[#181613]/95 backdrop-blur px-3 py-2.5 shadow-2xl"
            style={{ left, top }}
        >
            <p className="text-[12.5px] font-bold text-white truncate">{stock.name}</p>
            <p className="text-[10.5px] text-zinc-400 mb-1.5 truncate">{stock.symbol} · {sector}</p>
            <div className="grid grid-cols-2 gap-y-0.5 text-[11.5px] tabular-nums">
                <span className="text-zinc-400">Price</span><span className="text-right text-white">{formatPrice(stock.ltp)}</span>
                <span className="text-zinc-400">Change ({tf})</span><span className={`text-right font-semibold ${pctText(stock.pChange)}`}>{formatPct(stock.pChange)}</span>
                <span className="text-zinc-400">Volume</span><span className="text-right text-white">{formatVolume(stock.volume)}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">Click to analyse</p>
        </div>
    );
};

const Treemap = ({ sectors, tf, onPick }) => {
    const boxRef = useRef(null);
    const { w, h } = useElementSize(boxRef);
    const [tip, setTip] = useState(null);
    const layout = w && h ? layoutHeatmap(sectors, w, h) : [];

    const move = (e, stock, sector) => {
        const r = boxRef.current.getBoundingClientRect();
        setTip({ stock, sector, x: e.clientX - r.left, y: e.clientY - r.top });
    };

    return (
        <div ref={boxRef} className="relative flex-1 min-h-0" onMouseLeave={() => setTip(null)}>
            {layout.map((sec) => (
                <div key={sec.data.name}>
                    {sec.showHeader && (
                        <div
                            className="absolute flex items-center justify-between gap-2 px-1.5 text-[10.5px] font-semibold bg-zinc-100 dark:bg-[#0f0e0c] border border-zinc-200 dark:border-black"
                            style={{ left: sec.x, top: sec.y, width: sec.w, height: sec.headerHeight }}
                        >
                            <span className="truncate text-zinc-700 dark:text-zinc-300">{sec.data.name}</span>
                            <span className={`tabular-nums flex-shrink-0 ${pctText(sec.data.pChange)}`}>{formatPct(sec.data.pChange)}</span>
                        </div>
                    )}
                    {sec.stocks.map((c) => {
                        const big = c.w > 46 && c.h > 26;
                        const fs = Math.max(9, Math.min(16, Math.min(c.w / 6, c.h / 3)));
                        return (
                            <button
                                key={c.data.symbol}
                                onClick={() => onPick(c.data.symbol)}
                                onMouseMove={(e) => move(e, c.data, sec.data.name)}
                                className="absolute flex flex-col items-center justify-center overflow-hidden border border-zinc-900/70 text-white hover:brightness-125 hover:z-10 transition-[filter]"
                                style={{ left: c.x, top: c.y, width: c.w, height: c.h, backgroundColor: colorFor(c.data.pChange, tf) }}
                                aria-label={`${c.data.symbol} ${formatPct(c.data.pChange)}`}
                            >
                                {big && <span className="font-bold leading-tight truncate max-w-full px-0.5" style={{ fontSize: fs }}>{c.data.symbol}</span>}
                                {big && c.h > 38 && <span className="leading-tight tabular-nums opacity-90" style={{ fontSize: fs * 0.8 }}>{formatPct(c.data.pChange)}</span>}
                            </button>
                        );
                    })}
                </div>
            ))}
            <Tooltip tip={tip} tf={tf} bounds={{ w, h }} />
        </div>
    );
};

// Phones: a treemap of 50 boxes is unreadable at 375px, so sectors become rows of
// tiles, and tap (no hover on touch) opens a detail sheet instead of a tooltip.
const MobileList = ({ sectors, tf, onPick }) => {
    const [sel, setSel] = useState(null);
    return (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4 space-y-3">
            {sectors.map((sec) => (
                <section key={sec.name}>
                    <div className="flex items-center justify-between py-1.5 text-[12px] font-semibold">
                        <span className="text-zinc-700 dark:text-zinc-300">{sec.name} <span className="text-zinc-500 font-normal">· {sec.stocks.length}</span></span>
                        <span className={`tabular-nums ${pctText(sec.pChange)}`}>{formatPct(sec.pChange)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        {sec.stocks.map((st) => (
                            <button
                                key={st.symbol}
                                onClick={() => setSel({ stock: st, sector: sec.name })}
                                className="rounded-md py-2 px-1 text-white active:scale-95 transition"
                                style={{ backgroundColor: colorFor(st.pChange, tf) }}
                            >
                                <p className="text-[11.5px] font-bold truncate">{st.symbol}</p>
                                <p className="text-[10.5px] tabular-nums opacity-90">{formatPct(st.pChange)}</p>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
            {sel && (
                <div className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={() => setSel(null)}>
                    <div className="w-full rounded-t-2xl bg-white dark:bg-[#181613] border-t border-zinc-200 dark:border-[#FDD405]/20 p-4 pb-6" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[15px] font-bold text-zinc-900 dark:text-white">{sel.stock.name}</p>
                        <p className="text-[12px] text-zinc-500 mb-3">{sel.stock.symbol} · {sel.sector}</p>
                        <div className="grid grid-cols-3 gap-2 text-center mb-4 tabular-nums">
                            <div><p className="text-[10.5px] text-zinc-500">Price</p><p className="text-[13px] font-semibold text-zinc-900 dark:text-white">{formatPrice(sel.stock.ltp)}</p></div>
                            <div><p className="text-[10.5px] text-zinc-500">Change ({tf})</p><p className={`text-[13px] font-semibold ${pctText(sel.stock.pChange)}`}>{formatPct(sel.stock.pChange)}</p></div>
                            <div><p className="text-[10.5px] text-zinc-500">Volume</p><p className="text-[13px] font-semibold text-zinc-900 dark:text-white">{formatVolume(sel.stock.volume)}</p></div>
                        </div>
                        <button
                            onClick={() => onPick(sel.stock.symbol)}
                            className="w-full py-2.5 rounded-xl text-[13px] font-bold text-zinc-900"
                            style={{ backgroundColor: '#FDD405' }}
                        >
                            Analyse {sel.stock.symbol}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const HeatmapPanel = ({ onClose, onAnalyze }) => {
    const [index, setIndex] = useState('NIFTY50');
    const [tf, setTf] = useState('1D');
    const { data, loading, error, reload } = useHeatmap(index, tf);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_MAX);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < MOBILE_MAX);
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('resize', onResize);
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    const asOf = data?.as_of
        ? new Date(data.as_of).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';
    const sectors = data?.sectors || [];
    const tfItems = TIMEFRAMES.map((t) => ({ key: t, label: t }));

    return (
        <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
            <div className="relative w-full max-w-6xl h-full sm:h-[88vh] flex flex-col sm:rounded-2xl border shadow-2xl overflow-hidden bg-white border-zinc-200 dark:bg-[#181613] dark:border-[#FDD405]/20">
                {/* Header */}
                <div className="flex flex-col gap-2.5 px-3 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/80 flex-shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <LayoutGrid size={17} style={{ color: '#FDD405' }} className="flex-shrink-0" />
                            <div className="min-w-0">
                                <h2 className="text-[15px] font-bold text-zinc-900 dark:text-white">Market Heat Map</h2>
                                <p className="text-[11.5px] text-zinc-500 truncate tabular-nums">
                                    {data?.index?.ltp != null && (
                                        <>{data.index.label} {data.index.ltp.toLocaleString('en-IN')}{' '}
                                            <span className={pctText(data.index.pChange)}>{formatPct(data.index.pChange)}</span>{' · '}</>
                                    )}
                                    {data && (data.market_open ? `Live · ${asOf}` : `Market closed · as of ${asOf}`)}
                                    {data?.since && ` · since ${data.since}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={reload} aria-label="Refresh" className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Pills items={INDEX_TABS} value={index} onChange={setIndex} />
                        <Pills items={tfItems} value={tf} onChange={setTf} scroll />
                        {!isMobile && <Legend tf={tf} />}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 flex flex-col sm:p-3 pt-2">
                    {error ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[13px] text-zinc-500">
                            {error}
                            <button onClick={reload} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-zinc-900" style={{ backgroundColor: '#FDD405' }}>Retry</button>
                        </div>
                    ) : !data && loading ? (
                        <div className="flex-1 m-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                    ) : isMobile ? (
                        <MobileList sectors={sectors} tf={tf} onPick={onAnalyze} />
                    ) : (
                        <Treemap sectors={sectors} tf={tf} onPick={onAnalyze} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeatmapPanel;
