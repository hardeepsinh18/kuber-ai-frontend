import { useEffect } from 'react';

/**
 * Company disambiguation selector — shown when a query maps to a business group
 * (e.g. "HDFC" → HDFC Bank / HDFC AMC / HDFC Life, "Tata" → TCS / TMPV / Tata Steel…).
 *
 * Rendered inline in the message flow, directly beneath the answer that asked
 * "which one did you mean?" and at the same width as the bubble, so it reads as
 * part of that answer and scrolls away with it. It is deliberately NOT a floating
 * overlay: anchored above the composer it covered both the answer text and the
 * input box. Long groups scroll inside the panel instead of growing the whole
 * thing off-screen. Theme-aware (light + dark).
 */
const GroupClarificationPopup = ({ groupName, candidates, onSelect, onDismiss, disabled }) => {
    const tickerOf = (c) =>
        (c.ticker || '').replace('.NS', '').replace('.BO', '') || c.name;

    useEffect(() => {
        if (!candidates?.length) return;
        const handler = (e) => {
            const idx = parseInt(e.key, 10);
            if (idx >= 1 && idx <= Math.min(candidates.length, 9)) {
                e.preventDefault();
                // Send the ticker (e.g. "TMPV"), not the name — the LLM collapses long
                // successor names back to the ambiguous parent, re-triggering this popup.
                if (!disabled) onSelect(tickerOf(candidates[idx - 1]));
            }
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [candidates, disabled, onSelect, onDismiss]);

    if (!candidates?.length) return null;

    const shown = candidates.slice(0, 9);

    return (
        <div
            role="listbox"
            aria-label={`${groupName} companies`}
            className="overflow-hidden rounded-xl
                       bg-zinc-50 dark:bg-white/[0.04]
                       border border-zinc-200/80 dark:border-white/[0.08]
                       animate-in fade-in slide-in-from-top-1 duration-200"
        >
            {/* Header — a short label, not a question: the bubble immediately above
                already asks "…Which one did you mean?", so repeating it here reads
                as the app asking twice. */}
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Select a company
                </span>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0
                               text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70
                               dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/10
                               transition-colors text-[15px] leading-none"
                >×</button>
            </div>

            {/* Candidate list — inline in the page flow, so it expands to fit rather
                than nesting its own scrollbar inside the chat scroller. The cap is a
                safety valve for very long groups only. */}
            <div className="max-h-[min(70vh,560px)] overflow-y-auto custom-scrollbar overscroll-contain">
                {shown.map((c, i) => {
                    const ticker = (c.ticker || '').replace('.NS', '').replace('.BO', '');
                    const name = c.name || ticker;
                    const sector = c.sector || '';
                    return (
                        <button
                            key={c.ticker || i}
                            type="button"
                            role="option"
                            disabled={disabled}
                            onClick={() => onSelect(ticker || name)}
                            className="group flex items-center gap-3 w-full text-left px-4 py-2.5
                                       border-t border-zinc-200/70 dark:border-white/[0.06]
                                       hover:bg-zinc-100 dark:hover:bg-white/[0.06]
                                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {/* Leading number — doubles as the 1-9 keyboard hint */}
                            <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                                             text-[11px] font-medium
                                             bg-zinc-200/70 text-zinc-500
                                             dark:bg-white/[0.06] dark:text-zinc-400
                                             group-hover:text-zinc-700 dark:group-hover:text-zinc-200
                                             transition-colors">
                                {i + 1}
                            </span>

                            {/* Name + ticker/sector */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] text-zinc-800 dark:text-zinc-100 truncate">
                                    {name}
                                </p>
                                {(ticker || sector) && (
                                    <p className="text-[11px] mt-0.5 flex items-center gap-1.5 truncate">
                                        <span className="text-zinc-500 dark:text-zinc-500">{ticker}</span>
                                        {sector && (
                                            <>
                                                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                                                <span className="text-zinc-400 dark:text-zinc-500 truncate">{sector}</span>
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer hint — quiet, outside the panel body like the reference */}
            <div className="flex items-center justify-center gap-1.5 px-4 py-2
                            border-t border-zinc-200/70 dark:border-white/[0.06]
                            text-[10px] text-zinc-400 dark:text-zinc-600">
                <span>Press</span>
                <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                dark:bg-white/[0.06] dark:text-zinc-400">1</kbd>
                <span>–</span>
                <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                dark:bg-white/[0.06] dark:text-zinc-400">{shown.length}</kbd>
                <span>to select ·</span>
                <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                dark:bg-white/[0.06] dark:text-zinc-400">Esc</kbd>
                <span>to dismiss</span>
            </div>
        </div>
    );
};

export default GroupClarificationPopup;
