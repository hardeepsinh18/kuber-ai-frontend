import { createPortal } from 'react-dom';
import { useEffect } from 'react';

/**
 * Company disambiguation selector — shown when a query maps to a business group
 * (e.g. "HDFC" → HDFC Bank / HDFC AMC / HDFC Life, "Tata Motors" → TMPV / TMCV).
 * Rendered as a brand-themed list panel that sits directly above the input box,
 * sharing its width and gold border so it reads as part of the composer.
 * Theme-aware (light + dark) — the portal lives under <html class="dark|light">.
 */
const GroupClarificationPopup = ({ groupName, candidates, onSelect, onDismiss, disabled }) => {
    const root = document.getElementById('kuberai-popup-root');

    const tickerOf = (c) =>
        (c.ticker || '').replace('.NS', '').replace('.BO', '') || c.name;

    useEffect(() => {
        if (!root || !candidates?.length) return;
        const handler = (e) => {
            const idx = parseInt(e.key, 10);
            if (idx >= 1 && idx <= Math.min(candidates.length, 6)) {
                e.preventDefault();
                // Send the ticker (e.g. "TMPV"), not the name — the LLM collapses long
                // successor names back to the ambiguous parent, re-triggering this popup.
                if (!disabled) onSelect(tickerOf(candidates[idx - 1]));
            }
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [candidates, disabled, onSelect, onDismiss, root]);

    if (!root || !candidates?.length) return null;

    const shown = candidates.slice(0, 6);

    return createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-end justify-center px-4 pb-[104px]">
            <div
                className="pointer-events-auto w-full max-w-3xl overflow-hidden rounded-2xl
                           bg-white dark:bg-[#1a1a1a]
                           border border-[#FDD405]/70 dark:border-[#FDD405]/35
                           shadow-[0_16px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]
                           animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-white/8">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#FDD405]
                                         shadow-[0_0_8px_rgba(253,212,5,0.6)]" />
                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                            {groupName}
                        </span>
                        <span className="text-[12px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                            · select a company
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0
                                   text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100
                                   dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800
                                   transition-colors text-[15px] leading-none"
                    >×</button>
                </div>

                {/* Candidate list */}
                <div role="listbox" aria-label={`${groupName} companies`}>
                    {shown.map((c, i) => {
                        const ticker = (c.ticker || '').replace('.NS', '').replace('.BO', '');
                        const name = c.name || ticker;
                        const sector = c.sector || '';
                        const initial = (name.charAt(0) || '?').toUpperCase();
                        return (
                            <button
                                key={c.ticker || i}
                                type="button"
                                role="option"
                                disabled={disabled}
                                onClick={() => onSelect(ticker || name)}
                                className="group relative flex items-center gap-3 w-full text-left px-4 py-2.5
                                           border-b border-zinc-100 dark:border-white/5 last:border-b-0
                                           hover:bg-[#FDD405]/10 dark:hover:bg-[#FDD405]/8
                                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {/* Gold left accent on hover */}
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-[3px] rounded-r
                                                 bg-[#FDD405] group-hover:h-7 transition-all duration-150" />

                                {/* Avatar — brand gold, consistent across companies */}
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                                                 text-[13px] font-extrabold
                                                 bg-[#FDD405]/15 border border-[#FDD405]/30
                                                 text-amber-600 dark:text-[#FDD405]">
                                    {initial}
                                </span>

                                {/* Name + ticker/sector */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {name}
                                    </p>
                                    <p className="text-[11px] mt-0.5 flex items-center gap-1.5 truncate">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">{ticker}</span>
                                        {sector && (
                                            <>
                                                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                                <span className="text-zinc-400 dark:text-zinc-500 truncate">{sector}</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                {/* Number key + chevron */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold
                                                     bg-zinc-100 text-zinc-500 border border-zinc-200
                                                     dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700
                                                     group-hover:bg-[#FDD405] group-hover:text-black group-hover:border-[#FDD405]
                                                     transition-colors">
                                        {i + 1}
                                    </span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                         className="text-zinc-300 dark:text-zinc-600 group-hover:text-[#FDD405] transition-colors"
                                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-center gap-1.5 px-4 py-2
                                border-t border-zinc-100 dark:border-white/5
                                text-[10px] text-zinc-400 dark:text-zinc-600">
                    <span>Press</span>
                    <kbd className="px-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-500
                                    dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">1</kbd>
                    <span>–</span>
                    <kbd className="px-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-500
                                    dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">{shown.length}</kbd>
                    <span>or click ·</span>
                    <kbd className="px-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-500
                                    dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">Esc</kbd>
                    <span>to dismiss</span>
                </div>
            </div>
        </div>,
        root
    );
};

export default GroupClarificationPopup;
