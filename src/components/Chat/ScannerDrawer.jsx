import { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';

const keyMetric = (r) => {
    if (r['Breakout_%'] != null)   return `+${r['Breakout_%']}%`;
    if (r['Gap_Up_%'] != null)     return `gap +${r['Gap_Up_%']}%`;
    if (r['Gap_Down_%'] != null)   return `gap -${r['Gap_Down_%']}%`;
    if (r['Chg_%'] != null)        return `${r['Chg_%'] >= 0 ? '+' : ''}${r['Chg_%']}%`;
    if (r['RSI'] != null)          return `RSI ${r['RSI']}`;
    if (r['PE'] != null)           return `P/E ${r['PE']}`;
    if (r['ROE_%'] != null)        return `ROE ${r['ROE_%']}%`;
    if (r['EPS_Growth_%'] != null) return `EPS +${r['EPS_Growth_%']}%`;
    if (r['Div_Yield_%'] != null)  return `yield ${r['Div_Yield_%']}%`;
    if (r['Vol_Ratio'] != null)    return `vol ×${r['Vol_Ratio']}`;
    if (r['Close'] != null)        return `₹${r['Close']}`;
    return null;
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
            className="fixed right-0 top-0 h-full z-50 flex flex-col
                       bg-white dark:bg-[#141414]
                       border-l border-zinc-200 dark:border-white/8"
            style={{
                width: '300px',
                animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-100 dark:border-white/8 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{emoji}</span>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-zinc-900 dark:text-white leading-tight truncate">
                            {scanner}
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                            {universe}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-zinc-900"
                              style={{ backgroundColor: '#FDD405' }}>
                            {count}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                   text-zinc-400 dark:text-zinc-500
                                   hover:text-zinc-900 dark:hover:text-white
                                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                                   transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Date + hint strip */}
            <div className="px-4 py-2 flex-shrink-0 border-b border-zinc-50 dark:border-white/4">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
                    📅 {date || 'Today'} · Hover a stock to analyze
                </p>
            </div>

            {/* Stock list */}
            <div className="flex-1 overflow-y-auto">
                {raw.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                        <span className="text-4xl">🔍</span>
                        <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No matches today</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 leading-relaxed">
                            No stocks matched the <span className="font-medium">{scanner}</span> pattern in {universe}.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-50 dark:divide-white/4">
                        {raw.map((stock, i) => {
                            const sym    = cleanSymbol(stock.Symbol);
                            const metric = keyMetric(stock);
                            return (
                                <li
                                    key={i}
                                    className="group flex items-center justify-between px-4 py-3
                                               hover:bg-zinc-50 dark:hover:bg-white/[0.04]
                                               transition-colors duration-100"
                                >
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                                            {sym}
                                        </div>
                                        {metric && (
                                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">
                                                {metric}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onAnalyze(sym)}
                                        className="flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg
                                                   text-[11px] font-semibold flex-shrink-0
                                                   text-zinc-400 dark:text-zinc-500
                                                   border border-zinc-200 dark:border-white/10
                                                   hover:text-zinc-900 dark:hover:text-white
                                                   hover:border-[#FDD405]/60 dark:hover:border-[#FDD405]/50
                                                   hover:bg-amber-50 dark:hover:bg-[#FDD405]/8
                                                   opacity-0 group-hover:opacity-100
                                                   transition-all duration-150">
                                        Analyze
                                        <ArrowUpRight size={11} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-white/8 flex-shrink-0">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center leading-relaxed">
                    {count > 0
                        ? `${count} stock${count > 1 ? 's' : ''} matched · click any to analyze in chat`
                        : 'Try a different scanner or universe'}
                </p>
            </div>
        </div>
    );
};

export default ScannerDrawer;
