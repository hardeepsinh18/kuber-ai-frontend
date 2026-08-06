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
            className="absolute left-0 right-0 bottom-full mb-2 z-50
                       overflow-hidden rounded-xl
                       border border-zinc-200 dark:border-zinc-700/80
                       bg-white dark:bg-[#1a1a1a]
                       shadow-xl shadow-black/10 dark:shadow-black/50
                       animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    {title}
                </span>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0
                                   text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/70
                                   dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/10
                                   transition-colors text-[15px] leading-none"
                    >×</button>
                )}
            </div>

            {/* Scrolls rather than growing off the top of the screen. A six-company
                group (Tata) is ~440px tall, which overflows a laptop viewport once
                the composer and its gap are accounted for — that overflow is why an
                earlier overlay version of this picker was moved inline. Capping to
                the available space keeps the composer-anchored placement without
                reintroducing it. */}
            <div className="max-h-[min(46vh,320px)] overflow-y-auto custom-scrollbar overscroll-contain">
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
                    className="group flex items-center gap-3 w-full text-left px-4 py-2.5
                               border-t border-zinc-200/70 dark:border-white/[0.06]
                               hover:bg-zinc-100 dark:hover:bg-white/[0.06]
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                                     text-[11px] font-medium
                                     bg-zinc-200/70 text-zinc-500
                                     dark:bg-white/[0.06] dark:text-zinc-400
                                     group-hover:text-zinc-700 dark:group-hover:text-zinc-200
                                     transition-colors">
                        {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-zinc-800 dark:text-zinc-100 truncate">{opt.label}</p>
                        {opt.hint && (
                            <p className="text-[11px] mt-0.5 text-zinc-500 dark:text-zinc-500 truncate">
                                {opt.hint}
                            </p>
                        )}
                    </div>
                </button>
            ))}

            </div>

            <div className="flex items-center justify-center gap-1.5 px-4 py-2
                            border-t border-zinc-200/70 dark:border-white/[0.06]
                            text-[10px] text-zinc-400 dark:text-zinc-600">
                <span>Press</span>
                <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                dark:bg-white/[0.06] dark:text-zinc-400">1</kbd>
                {shown.length > 1 && (
                    <>
                        <span>–</span>
                        <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                        dark:bg-white/[0.06] dark:text-zinc-400">{shown.length}</kbd>
                    </>
                )}
                <span>to select</span>
                {onDismiss && (
                    <>
                        <span>·</span>
                        <kbd className="px-1 rounded bg-zinc-200/70 text-zinc-500
                                        dark:bg-white/[0.06] dark:text-zinc-400">Esc</kbd>
                        <span>to dismiss</span>
                    </>
                )}
            </div>
        </div>
    );
}
