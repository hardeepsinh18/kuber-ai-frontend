import { useEffect } from 'react';

/**
 * Clarifying-question dropdown, anchored above the composer.
 *
 * Both places the product asks the user something — "short term or long term?"
 * and "which HDFC company did you mean?" — render through this, so they are one
 * component rather than two designs. It sits over the input box like the company
 * typeahead (CompanySuggest), because the answer to a clarifying question is the
 * user's NEXT input: the choice belongs where they are about to type, not buried
 * in the message above.
 *
 * Positioned absolute inside the composer's `relative` wrapper, matching
 * CompanySuggest so the two never fight for the same space — only one of them is
 * ever open at a time.
 */
export default function ClarifyDropdown({
    title,
    options = [],
    onPick,
    onDismiss,
    disabled = false,
}) {
    // 1-N to pick, Escape to dismiss — same contract as the typeahead, so the
    // keyboard behaviour is learnable once rather than per-prompt.
    useEffect(() => {
        if (!options.length) return undefined;
        const handler = (e) => {
            const idx = parseInt(e.key, 10);
            if (idx >= 1 && idx <= Math.min(options.length, 9)) {
                e.preventDefault();
                if (!disabled) onPick(options[idx - 1].value);
            }
            if (e.key === 'Escape' && onDismiss) onDismiss();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [options, disabled, onPick, onDismiss]);

    if (!options.length) return null;

    const shown = options.slice(0, 9);

    return (
        <div
            role="listbox"
            aria-label={title}
            className="absolute left-0 right-0 bottom-full mb-1.5 z-50
                       overflow-hidden rounded-xl
                       border border-zinc-200 dark:border-[#FDD405]/40
                       bg-white dark:bg-[#141310]
                       shadow-lg shadow-black/10 dark:shadow-black/40
                       animate-in fade-in slide-in-from-bottom-1 duration-200"
            style={{ boxShadow: '0 0 20px rgba(253,212,5,0.10), 0 8px 24px rgba(0,0,0,0.35)' }}
        >
            <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] truncate
                                 text-zinc-900 dark:text-[#FDD405]">
                    {title}
                </span>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0
                                   text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70
                                   dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/10
                                   transition-colors text-[13px] leading-none"
                    >×</button>
                )}
            </div>

            {/* Scrolls rather than growing off the top of the screen. A six-company
                group (Tata) is ~440px tall, which overflows a laptop viewport once
                the composer and its gap are accounted for — that overflow is why an
                earlier overlay version of this picker was moved inline. Capping to
                the available space keeps the composer-anchored placement without
                reintroducing it. */}
            <div className="max-h-[min(42vh,272px)] overflow-y-auto custom-scrollbar overscroll-contain">
            {shown.map((opt, i) => (
                <button
                    key={opt.key ?? opt.label}
                    type="button"
                    role="option"
                    aria-selected="false"
                    disabled={disabled}
                    // onMouseDown, not onClick: fires before the textarea blurs, so the
                    // dropdown cannot close out from under the click.
                    onMouseDown={(e) => { e.preventDefault(); if (!disabled) onPick(opt.value); }}
                    // Keyboard activation (Tab + Enter/Space) doesn't go through
                    // onMouseDown at all, so it needs its own handler.
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                            e.preventDefault();
                            onPick(opt.value);
                        }
                    }}
                    className="group flex items-center gap-2.5 w-full text-left px-3 py-2
                               border-t border-zinc-200/70 dark:border-white/[0.06]
                               hover:bg-[#FDD405]/[0.07] dark:hover:bg-[#FDD405]/[0.07]
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
                                     text-[10px] font-bold tabular-nums
                                     bg-zinc-200/70 text-zinc-500
                                     dark:bg-white/[0.06] dark:text-zinc-400
                                     group-hover:bg-[#FDD405] group-hover:text-black
                                     dark:group-hover:bg-[#FDD405] dark:group-hover:text-black
                                     transition-colors">
                        {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100 truncate">{opt.label}</p>
                        {opt.hint && (
                            <p className="text-[11px] mt-px text-zinc-500 dark:text-zinc-500 truncate">
                                {opt.hint}
                            </p>
                        )}
                    </div>
                </button>
            ))}

            </div>

        </div>
    );
}
