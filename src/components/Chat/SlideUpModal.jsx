import { X } from 'lucide-react';

// Shared mobile-sheet/desktop-dialog shell used by ScannerPanel and IpoPanel: same
// overlay, same panel sizing, same header row (title block + pill-tab toggle group +
// mobile/desktop close buttons). Callers own everything inside — title content, tab
// pills, body, footer — via props/children; only the outer layout lives here.
//
// `darkPanelClass` / `headerBorderClass` cover the two spots the panels' dark-mode
// colors diverge (panel bg/border, header bottom-border). `closeDisabled` covers
// ScannerPanel disabling its close buttons mid-scan — IpoPanel never disables them,
// so it simply doesn't pass the prop (disabled={undefined} renders no attribute,
// same as omitting it entirely).
const SlideUpModal = ({
    panelRef, darkPanelClass, headerBorderClass, onClose, closeDisabled,
    titleBlock, tabGroup, children,
}) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-2 sm:px-4 pb-4 sm:pb-0">
        <div
            ref={panelRef}
            className={`relative w-full max-w-2xl max-h-[85dvh] sm:max-h-[78vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden
                       bg-white border-zinc-200
                       ${darkPanelClass}`}
        >
            {/* Header — stacks on mobile (title row, then tab/toggle row); inline on sm+ */}
            <div className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 sm:py-4 border-b ${headerBorderClass} flex-shrink-0`}>
                <div className="flex items-center justify-between gap-2 min-w-0">
                    {titleBlock}
                    <button
                        onClick={onClose}
                        disabled={closeDisabled}
                        aria-label="Close"
                        className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {tabGroup}
                    <button
                        onClick={onClose}
                        disabled={closeDisabled}
                        aria-label="Close"
                        className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {children}
        </div>
    </div>
);

export default SlideUpModal;
