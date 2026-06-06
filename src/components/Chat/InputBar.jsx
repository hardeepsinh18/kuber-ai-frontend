import { useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Square, Zap, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';

const MODES = [
    { key: 'snap',    label: 'Quick',   icon: Zap,     subtitle: 'Fast signal · ≤120 words' },
    { key: 'analyst', label: 'Analyst', icon: BookOpen, subtitle: 'Full deep-dive analysis' },
];

const InputBar = ({ input, setInput, handleSend, onStopRequest, isLoading, sidebarOpen, responseMode, setResponseMode }) => {
    const inputRef = useRef(null);

    const autoResize = useCallback((el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }, []);

    useEffect(() => {
        if (!isLoading && inputRef.current) inputRef.current.focus();
    }, [isLoading]);

    useEffect(() => {
        if (!input && inputRef.current) inputRef.current.style.height = 'auto';
    }, [input]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className={clsx(
            'fixed bottom-0 right-0 z-20 pb-5 sm:pb-6 pt-20 sm:pt-24 px-4 pointer-events-none',
            'bg-gradient-to-t from-[#FDFAF3] via-[#FDFAF3]/90 to-transparent',
            'dark:from-[#09090A] dark:via-[#09090A]/90 dark:to-transparent',
            'transition-all duration-300',
            sidebarOpen ? 'left-0 md:left-[280px]' : 'left-0'
        )}>
            <div className="max-w-3xl mx-auto flex flex-col items-center w-full pointer-events-auto">
                <div className="w-full relative group">

                    {/* Ambient glow ring — visible on focus */}
                    <div className="absolute -inset-3 rounded-3xl
                                    bg-gradient-to-r from-amber-500/0 via-amber-400/8 to-amber-500/0
                                    opacity-0 group-focus-within:opacity-100
                                    transition-all duration-700 blur-xl pointer-events-none" />

                    {/* Card */}
                    <div className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300
                                    bg-white border border-zinc-200/90
                                    shadow-[0_4px_24px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)]
                                    focus-within:border-amber-400/70
                                    focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.13),0_4px_24px_rgba(0,0,0,0.07)]
                                    dark:bg-[#1A1916] dark:border-zinc-700/50 dark:shadow-none
                                    dark:focus-within:border-amber-500/50
                                    dark:focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.10)]">

                        {/* Gold top stripe — appears on focus */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent
                                        opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                        <div className="flex items-end pl-5 pr-2 pt-3 pb-1">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                                onKeyDown={handleKeyDown}
                                placeholder={responseMode === 'snap'
                                    ? 'Ask for a quick signal...'
                                    : 'Ask about a stock, sector, or idea...'}
                                disabled={isLoading}
                                style={{ resize: 'none', overflow: 'hidden', minHeight: '28px' }}
                                className="w-full bg-transparent border-none outline-none text-[15px] leading-relaxed py-1
                                           text-zinc-900 placeholder:text-zinc-400
                                           dark:text-white dark:placeholder:text-zinc-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between px-2 pb-2.5 pt-0.5">
                            {/* Mode pills */}
                            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                                {MODES.map((mode) => {
                                    const Icon = mode.icon;
                                    const isActive = responseMode === mode.key;
                                    return (
                                        <button key={mode.key} type="button" title={mode.subtitle}
                                            onClick={() => { setResponseMode(mode.key); inputRef.current?.focus(); }}
                                            className={clsx(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 select-none',
                                                isActive
                                                    ? 'bg-amber-500 text-black shadow-sm scale-[1.02]'
                                                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                            )}>
                                            <Icon size={11} />
                                            {mode.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Send / Stop */}
                            {isLoading ? (
                                <button onClick={onStopRequest} aria-label="Stop"
                                    className="w-9 h-9 flex items-center justify-center rounded-full
                                               bg-red-500 hover:bg-red-600 text-white
                                               transition-all active:scale-95
                                               shadow-[0_2px_10px_rgba(239,68,68,0.40)]
                                               hover:shadow-[0_4px_16px_rgba(239,68,68,0.55)]">
                                    <Square size={12} fill="currentColor" />
                                </button>
                            ) : (
                                <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"
                                    className="w-9 h-9 flex items-center justify-center rounded-full
                                               transition-all duration-200 active:scale-95
                                               bg-amber-500 hover:bg-amber-400 text-black
                                               disabled:opacity-25 disabled:cursor-not-allowed
                                               shadow-[0_2px_10px_rgba(212,160,23,0.44)]
                                               hover:shadow-[0_4px_18px_rgba(212,160,23,0.62)]
                                               hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-[0_2px_10px_rgba(212,160,23,0.44)]">
                                    <ArrowRight size={17} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-600 opacity-50 hover:opacity-80 transition-opacity select-none">
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
};

export default InputBar;
