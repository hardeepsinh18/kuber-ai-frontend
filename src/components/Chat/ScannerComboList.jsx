import { TrendingUp, Info } from 'lucide-react';
import { getComboMetric } from '../../lib/scannerSignal';

// Results of a 2-3 scanner combo, rendered inside ScannerDrawer (300px wide).
// Each row: symbol + "matched N/M" + Analyze, then one line per scanner the
// stock matched with THAT scanner's value, then any it missed (dimmed).

const METRIC_STYLES = {
    bull:    'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-400 dark:border-emerald-500/20',
    bear:    'bg-red-500/10 text-red-600 border border-red-500/25 dark:bg-red-500/12 dark:text-red-400 dark:border-red-500/20',
    neutral: 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-400 dark:border-zinc-600/40',
    price:   'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:border-zinc-600/40',
};

const cleanSymbol = (sym) => (sym || '').replace(/\.(NS|BO)$/i, '');

const MODE_TEXT = {
    all:     n => `match all ${n}`,
    any:     () => 'match any',
    exclude: () => 'exclude one',
};

const ScannerComboList = ({ rows, combo, isDark, onAnalyze }) => {
    const { scanners = [], mode = 'all', exclude, fallback, required, perScannerCounts = {} } = combo || {};
    const n = scanners.length;
    const rowBorder = isDark ? '1px solid rgba(253,212,5,0.25)' : '1px solid rgba(253,196,5,0.35)';

    const counts = (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 dark:text-zinc-500">
            {scanners.map(s => (
                <span key={s} className={s === exclude ? 'line-through opacity-70' : ''}>
                    {s} <span className="font-semibold text-zinc-700 dark:text-zinc-300">{perScannerCounts[s] ?? '–'}</span>
                </span>
            ))}
        </div>
    );

    if (!rows.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                <span className="text-4xl">🔍</span>
                <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">No stocks matched this combination</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
                    {mode === 'all' && n === 2
                        ? 'No stock matched both. Try “Match any”, or add a third scanner to get 2-of-3 matches.'
                        : 'Try “Match any”, or swap one scanner.'}
                </p>
                <div className="mt-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Matches per scanner</p>
                    {counts}
                </div>
            </div>
        );
    }

    return (
        <div data-testid="scanner-combo-list">
            {/* Mode + per-scanner counts */}
            <div className="px-3 py-2 space-y-1" style={{ borderBottom: rowBorder }}>
                <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider text-black"
                      style={{ backgroundColor: '#FDD405' }}>
                    {(MODE_TEXT[mode] || MODE_TEXT.all)(n)}
                </span>
                {counts}
            </div>

            {fallback && (
                <div className="flex items-start gap-1.5 px-3 py-2 text-[11px] leading-snug text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10"
                     role="status" style={{ borderBottom: rowBorder }}>
                    <Info size={12} className="mt-[1px] flex-shrink-0" />
                    <span>No stock matched all {n}. Showing stocks that matched {required} of {n}.</span>
                </div>
            )}

            <ol>
                {rows.map((r, i) => {
                    const sym     = cleanSymbol(r.Symbol);
                    const matched = r.matched || [];
                    const missed  = r.missed || [];
                    const full    = r.of ? r.match_count >= r.of : missed.length === 0;
                    return (
                        <li key={`${sym}-${i}`} className="group px-3 py-2.5" style={{ borderBottom: rowBorder }}>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 w-5 flex-shrink-0">{i + 1}</span>
                                <span className="flex-1 min-w-0 block truncate text-[13px] font-semibold text-zinc-900 dark:text-white" title={sym}>{sym}</span>
                                {r.of > 1 && (
                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold
                                        ${full ? 'text-black' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}
                                          style={full ? { backgroundColor: '#FDD405' } : {}}
                                          title={`Matched ${r.match_count} of ${r.of} scanners`}>
                                        {r.match_count}/{r.of}
                                    </span>
                                )}
                                <button
                                    onClick={() => onAnalyze(sym)}
                                    className="flex-shrink-0 inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-lg text-[11px] font-medium
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
                            </div>

                            <ul className="mt-1.5 ml-7 space-y-1">
                                {matched.map(name => {
                                    const m = getComboMetric(name, r.signals?.[name]);
                                    return (
                                        <li key={name} className="flex items-center gap-1.5 min-w-0 text-[10.5px]">
                                            <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true">✓</span>
                                            <span className="text-zinc-600 dark:text-zinc-400 truncate min-w-0" title={name}>{name}</span>
                                            {m && (
                                                <span className={`ml-auto flex-shrink-0 max-w-[55%] truncate px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] ${METRIC_STYLES[m.type] || METRIC_STYLES.neutral}`}
                                                      title={m.label}>
                                                    {m.label}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                                {missed.map(name => (
                                    <li key={name} className="flex items-center gap-1.5 min-w-0 text-[10.5px] text-zinc-400 dark:text-zinc-600">
                                        <span className="flex-shrink-0" aria-hidden="true">✕</span>
                                        <span className="truncate line-through" title={`Did not match ${name}`}>{name}</span>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default ScannerComboList;
