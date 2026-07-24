import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X, TrendingUp, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getScannerSignal } from '../../lib/scannerSignal';

const METRIC_STYLES = {
    bull:    'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-400 dark:border-emerald-500/20',
    bear:    'bg-red-500/10 text-red-600 border border-red-500/25 dark:bg-red-500/12 dark:text-red-400 dark:border-red-500/20',
    neutral: 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-400 dark:border-zinc-600/40',
    price:   'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:border-zinc-600/40',
};

const cleanSymbol = (sym) => (sym || '').replace(/\.(NS|BO)$/i, '');

const OPEN_W = 300;   // px — expanded width
const RAIL_W = 48;    // px — collapsed rail width

// `collapsed` + `onToggleCollapsed` are owned by the parent (ChatContainer) so the
// chat's right-padding can track the drawer's actual width (300 vs 48) and re-center.
const ScannerDrawer = ({ data, onAnalyze, onClose, collapsed = false, onToggleCollapsed }) => {
    const { emoji, scanner, universe, count, date, raw } = data;
    const drawerRef = useRef(null);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const shellStyle = {
        background: isDark ? '#111113' : '#ffffff',
        borderLeft: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark ? '-12px 0 48px rgba(0,0,0,0.5)' : '-12px 0 48px rgba(0,0,0,0.12)',
    };

    return (
        <>
            {/* D-shape semicircle toggle on the drawer's left edge — mirror of the
                chat-sidebar toggle. Slides with the drawer (same 300ms ease). */}
            <button
                onClick={onToggleCollapsed}
                className={clsx(
                    'hidden md:flex fixed top-1/2 -translate-y-1/2 z-[51] transition-all duration-300',
                    'w-6 h-12 rounded-l-full items-center justify-center',
                    'bg-[#EDEAE0] dark:bg-[#1a1a1a]',
                    'border-t border-l border-b border-zinc-300/60 dark:border-zinc-800',
                    'hover:bg-[#E3DFD4] dark:hover:bg-[#222]',
                )}
                style={{ right: (collapsed ? RAIL_W : OPEN_W) - 1 }}
                aria-label={collapsed ? 'Expand Chart Patterns' : 'Collapse Chart Patterns'}
            >
                {collapsed
                    ? <ChevronsLeft size={11} className="text-zinc-500 dark:text-zinc-500" />
                    : <ChevronsRight size={11} className="text-zinc-500 dark:text-zinc-500" />}
            </button>

            {/* Drawer — full-width on mobile; on desktop its WIDTH animates (300 ↔ 48), same as sidebar */}
            <div
                ref={drawerRef}
                className={clsx(
                    'fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out',
                    'w-full',                                       // mobile: full-screen sheet
                    collapsed ? 'md:w-[48px]' : 'md:w-[300px]'      // desktop: rail ↔ open
                )}
                style={{
                    animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
                    ...shellStyle,
                }}
            >
                {collapsed ? (
                    /* ── Collapsed rail ── */
                    <div className="flex flex-col items-center pt-4 gap-3 h-full" style={{ width: RAIL_W }}>
                        <button
                            onClick={onToggleCollapsed}
                            title={scanner}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: 'rgba(253,212,5,0.1)', border: '1px solid rgba(253,212,5,0.2)' }}>
                            {emoji}
                        </button>
                        {count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-black"
                                  style={{ backgroundColor: '#FDD405' }}>
                                {count}
                            </span>
                        )}
                        <button
                            onClick={onToggleCollapsed}
                            title={scanner}
                            className="mt-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.08em' }}>
                            {scanner}
                        </button>
                        <button
                            onClick={onClose}
                            title="Close"
                            aria-label="Close Chart Patterns"
                            className="mt-auto mb-4 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    /* ── Expanded content ── (min-w so it clips, not reflows, while animating) */
                    <div className="flex flex-col h-full" style={{ minWidth: OPEN_W }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
                             style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)' }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                     style={{ background: 'rgba(253,212,5,0.1)', border: '1px solid rgba(253,212,5,0.2)' }}>
                                    {emoji}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white leading-tight truncate">
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
                                    title="Close"
                                    aria-label="Close Chart Patterns"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto">
                            {raw.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                                    <span className="text-4xl">🔍</span>
                                    <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No matches today</p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-600 leading-relaxed">
                                        No stocks matched <span className="text-zinc-600 dark:text-zinc-400 font-medium">{scanner}</span> in {universe}.
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
                                            const metric = getScannerSignal(stock.matched_scanners || scanner, stock);
                                            return (
                                                <tr
                                                    key={i}
                                                    className="group"
                                                    style={{ borderBottom: isDark ? '1px solid rgba(253,212,5,0.25)' : '1px solid rgba(253,196,5,0.35)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(253,212,5,0.07)' : 'rgba(253,212,5,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td className="px-3 py-2.5 text-[11px] font-mono text-zinc-400 dark:text-zinc-600 w-8">{i + 1}</td>

                                                    <td className="px-2 py-2.5">
                                                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">{sym}</span>
                                                    </td>

                                                    <td className="px-2 py-2.5 text-center">
                                                        {metric ? (
                                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${METRIC_STYLES[metric.type]}`}>
                                                                {metric.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">—</span>
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2.5 text-center">
                                                        <button
                                                            onClick={() => onAnalyze(sym)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-zinc-900 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150"
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
                             style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)' }}>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-600 text-center">
                                {count > 0
                                    ? `${count} stock${count > 1 ? 's' : ''} matched · click any to analyze`
                                    : 'Try a different scanner or universe'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ScannerDrawer;
