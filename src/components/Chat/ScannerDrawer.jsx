import { useEffect, useRef } from 'react';
import { X, TrendingUp } from 'lucide-react';

const keyMetric = (r) => {
    if (r['Breakout_%'] != null)   return { label: `+${r['Breakout_%']}%`,     type: 'bull' };
    if (r['Gap_Up_%'] != null)     return { label: `↑ ${r['Gap_Up_%']}%`,      type: 'bull' };
    if (r['Gap_Down_%'] != null)   return { label: `↓ ${r['Gap_Down_%']}%`,    type: 'bear' };
    if (r['Chg_%'] != null) {
        const v = r['Chg_%'];
        return { label: `${v >= 0 ? '+' : ''}${v}%`, type: v >= 0 ? 'bull' : 'bear' };
    }
    if (r['RSI'] != null)          return { label: `RSI ${r['RSI']}`,          type: 'neutral' };
    if (r['PE'] != null)           return { label: `P/E ${r['PE']}`,           type: 'neutral' };
    if (r['ROE_%'] != null)        return { label: `ROE ${r['ROE_%']}%`,       type: 'bull' };
    if (r['EPS_Growth_%'] != null) return { label: `EPS +${r['EPS_Growth_%']}%`, type: 'bull' };
    if (r['Div_Yield_%'] != null)  return { label: `yield ${r['Div_Yield_%']}%`, type: 'neutral' };
    if (r['Vol_Ratio'] != null)    return { label: `vol ×${r['Vol_Ratio']}`,   type: 'neutral' };
    if (r['Close'] != null)        return { label: `₹${r['Close']}`,           type: 'price' };
    return null;
};

const METRIC_STYLES = {
    bull:    'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20',
    bear:    'bg-red-500/12 text-red-400 border border-red-500/20',
    neutral: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/40',
    price:   'bg-zinc-700/50 text-zinc-300 border border-zinc-600/40',
};

const cleanSymbol = (sym) => (sym || '').replace(/\.(NS|BO)$/i, '');

const ScannerDrawer = ({ data, onAnalyze, onClose }) => {
    const { emoji, scanner, universe, count, date, raw } = data;
    const drawerRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full z-50 flex flex-col"
            style={{
                width: '300px',
                background: '#111113',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: '-12px 0 48px rgba(0,0,0,0.5)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                         style={{ background: 'rgba(253,212,5,0.1)', border: '1px solid rgba(253,212,5,0.2)' }}>
                        {emoji}
                    </div>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-white leading-tight truncate">
                            {scanner}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{universe}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-black"
                              style={{ backgroundColor: '#FDD405' }}>
                            {count}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                {raw.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                        <span className="text-4xl">🔍</span>
                        <p className="text-[13px] font-semibold text-zinc-300">No matches today</p>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">
                            No stocks matched <span className="text-zinc-400 font-medium">{scanner}</span> in {universe}.
                        </p>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr style={{ backgroundColor: '#FDD405' }}>
                                <th className="text-left text-[11px] font-bold text-zinc-900 px-3 py-2.5 w-8">#</th>
                                <th className="text-left text-[11px] font-bold text-zinc-900 px-2 py-2.5">Stock</th>
                                <th className="text-center text-[11px] font-bold text-zinc-900 px-2 py-2.5">Signal</th>
                                <th className="text-center text-[11px] font-bold text-zinc-900 px-3 py-2.5">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {raw.map((stock, i) => {
                                const sym    = cleanSymbol(stock.Symbol);
                                const metric = keyMetric(stock);
                                return (
                                    <tr
                                        key={i}
                                        className="group"
                                        style={{ borderBottom: '1px solid rgba(253,212,5,0.25)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,212,5,0.07)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td className="px-3 py-2.5 text-[11px] font-mono text-zinc-600 w-8">{i + 1}</td>

                                        <td className="px-2 py-2.5">
                                            <span className="text-[13px] font-semibold text-white">{sym}</span>
                                        </td>

                                        <td className="px-2 py-2.5 text-center">
                                            {metric ? (
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${METRIC_STYLES[metric.type]}`}>
                                                    {metric.label}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-700 text-[10px]">—</span>
                                            )}
                                        </td>

                                        <td className="px-3 py-2.5 text-center">
                                            <button
                                                onClick={() => onAnalyze(sym)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                style={{ backgroundColor: '#FDD405' }}
                                            >
                                                Analyze <TrendingUp size={10} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex-shrink-0"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] text-zinc-600 text-center">
                    {count > 0
                        ? `${count} stock${count > 1 ? 's' : ''} matched · click any to analyze`
                        : 'Try a different scanner or universe'}
                </p>
            </div>
        </div>
    );
};

export default ScannerDrawer;
