import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Expand target for the inline chart. The chat column — not the chart height —
// is the real constraint, so this goes near-viewport rather than merely taller.
const ChartFullscreen = ({ open, onClose, title, children }) => {
    const closeRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        // Chat keeps its scroll position because the body is only frozen, not
        // unmounted or re-rendered.
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} chart, expanded`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
            onClick={onClose}
        >
            <div
                className="relative w-full h-full max-w-[1400px] rounded-2xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
                    <button
                        ref={closeRef}
                        onClick={onClose}
                        aria-label="Minimise chart"
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 p-3">{children}</div>
            </div>
        </div>
    );
};

export default ChartFullscreen;
