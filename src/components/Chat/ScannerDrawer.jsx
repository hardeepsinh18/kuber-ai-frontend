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

    // Lock the page behind the drawer so scrolling the results list doesn't scroll
    // the chat underneath.
    //
    // overflowX is locked too, and at EVERY breakpoint — not just below 768px as
    // before. The drawer is fixed-position and sits above the page, so any
    // horizontal scrollbar the page itself has renders as a stray bar across the
    // bottom of the sheet. On a narrow desktop window (>=768px, where the old
    // guard bailed out early) that is exactly what showed under the footer.
    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const { overflow: prevY, overflowX: prevX } = document.body.style;
        document.body.style.overflow = 'hidden';
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflow = prevY;
            document.body.style.overflowX = prevX;
        };
    }, []);

    const shellStyle = {
        background: isDark ? '#111113' : '#ffffff',
        borderLeft: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDark ? '-12px 0 48px rgba(0,0,0,0.5)' : '-12px 0 48px rgba(0,0,0,0.12)',
    };

    return (
        <>
            {/* Mobile backdrop — dims the chat behind the bottom sheet; tap to close. */}
            <div
                className="md:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

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

            {/* Mobile: bottom sheet (rounded top, ~88% height, chat peeks behind).
                Desktop: right-side drawer whose WIDTH animates (300 ↔ 48). */}
            <div
                ref={drawerRef}
                className={clsx(
                    'fixed z-50 flex flex-col overflow-hidden',
                    // mobile bottom sheet — DEFINITE height (h-, not max-h) so the inner
                    // list gets a real scroll boundary on iOS Safari.
                    'inset-x-0 bottom-0 top-auto w-full h-[85dvh] rounded-t-2xl',
                    // desktop side drawer
                    'md:inset-x-auto md:right-0 md:top-0 md:bottom-auto md:h-full md:rounded-t-none md:transition-all md:duration-300 md:ease-in-out',
                    collapsed ? 'md:w-[48px]' : 'md:w-[300px]'
                )}
                style={{
                    animation: 'slideUpFade 0.32s cubic-bezier(0.22,1,0.36,1)',
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
                    <div className="flex flex-col flex-1 min-h-0 w-full" style={{ minWidth: OPEN_W }}>
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

                        {/* Table — scroll stays inside the sheet (no chaining to the page).
                            overflow-x-hidden is explicit and load-bearing: setting only
                            overflow-y makes CSS promote the OTHER axis from `visible` to
                            `auto`, so any row even a few px too wide (a long symbol, a wide
                            signal badge) grew a horizontal scrollbar across the bottom of
                            the results list. Measured: a 315px row in the 300px drawer
                            reproduced it exactly. The list only ever scrolls vertically, so
                            there is nothing to lose by pinning X. */}
                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                                            <th className="text-left text-[11px] font-bold text-zinc-900 px-2 py-2.5 w-6">#</th>
                                            <th className="text-left text-[11px] font-bold text-zinc-900 px-2 py-2.5">Stock</th>
                                            <th className="text-center text-[11px] font-bold text-zinc-900 px-1 py-2.5">Triggered at</th>
                                            <th className="text-center text-[11px] font-bold text-zinc-900 px-2 py-2.5 w-[86px]">Action</th>
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
                                                    <td className="px-2 py-2.5 text-[11px] font-mono text-zinc-400 dark:text-zinc-600 w-6">{i + 1}</td>

                                                    <td className="px-2 py-2.5 min-w-0">
                                                        {/* truncate, not overflow: a long symbol should shorten
                                                            rather than widen the row (which is what grew the
                                                            scrollbar). title keeps the full value reachable. */}
                                                        <span className="block truncate text-[13px] font-semibold text-zinc-900 dark:text-white"
                                                              title={sym}>{sym}</span>
                                                    </td>

                                                    <td className="px-1 py-2.5 text-center">
                                                        {metric ? (
                                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${METRIC_STYLES[metric.type]}`}>
                                                                {metric.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">—</span>
                                                        )}
                                                    </td>

                                                    <td className="px-2 py-2.5 text-center w-[86px]">
                                                        {/* Always visible, not hover-gated (it used to be
                                                            md:opacity-0 + md:group-hover:opacity-100, so only the
                                                            hovered row had a visible action).

                                                            Styled to match the chart-type tabs in StockChart.jsx,
                                                            which solve the same problem: many peer controls where at
                                                            most one is emphasised. Brand yellow stays reserved for the
                                                            row actually under the pointer.

                                                            The resting state is a NEUTRAL button surface (zinc border +
                                                            faint fill), not bare text: with no container at all the
                                                            label read as a caption rather than something clickable. An
                                                            AMBER outline was tried first and still made the panel look
                                                            "too yellow" ten rows down, so the chrome is zinc — it
                                                            reads as a button without competing with the signal
                                                            badges. */}
                                                        <button
                                                            onClick={() => onAnalyze(sym)}
                                                            className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-lg text-[11px] font-medium
                                                                       transition-all
                                                                       border border-zinc-300 dark:border-zinc-700
                                                                       bg-zinc-100 dark:bg-white/[0.04]
                                                                       text-zinc-600 dark:text-zinc-300
                                                                       group-hover:bg-[#FDD405] group-hover:border-[#FDD405] group-hover:text-black group-hover:font-semibold
                                                                       hover:bg-[#FDD405] hover:border-[#FDD405] hover:text-black hover:font-semibold
                                                                       focus-visible:bg-[#FDD405] focus-visible:border-[#FDD405] focus-visible:text-black focus-visible:font-semibold
                                                                       focus-visible:outline-none"
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
