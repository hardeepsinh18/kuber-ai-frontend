import { useRef, useEffect, useCallback } from 'react';
import { ArrowUpRight, Square } from 'lucide-react';
import { clsx } from 'clsx';

const QUERIES = [
    'Show me TCS fundamentals and valuation',
    'Is Reliance a good buy right now?',
    'Show Nifty 50 chart for last 6 months',
    'Compare HDFC Bank vs ICICI Bank on financials',
    'Which mid-cap stocks have best ROE on NSE?',
    'Top PSU stocks by dividend yield',
];

const InputBar = ({ input, setInput, handleSend, onStopRequest, isLoading, horizonQuestion = false, horizonSymbol = '', onHorizonChoice }) => {
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

    const handleChipClick = (query) => {
        setInput(query);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <div className="px-4 pb-3 pt-1.5">
            <div className="flex flex-col items-center w-full gap-1.5">

                {/* Suggestion chips — shown when input empty and not loading */}
                {!input.trim() && !isLoading && (
                    <div className="flex flex-wrap gap-2 justify-center w-full">
                        {QUERIES.slice(0, 3).map(q => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => handleChipClick(q)}
                                className="px-2.5 py-0.5 rounded-full text-[10.5px]
                                           text-zinc-500 dark:text-zinc-500
                                           bg-white/70 dark:bg-white/[0.04]
                                           border border-zinc-200/80 dark:border-zinc-700/40
                                           hover:text-zinc-900 dark:hover:text-zinc-200
                                           hover:border-amber-300/70 dark:hover:border-amber-700/45
                                           hover:bg-amber-50/80 dark:hover:bg-amber-950/20
                                           transition-all duration-150 truncate max-w-[220px]">
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                <div className="w-full relative group">

                    {/* Ambient glow above */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-3/4 h-8 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at center, rgba(212,160,23,0.15) 0%, transparent 70%)' }} />

                    {/* Gradient border wrapper */}
                    <div className="p-[1px] rounded-2xl transition-all duration-300
                                    bg-gradient-to-b from-amber-400/40 via-amber-500/10 to-amber-400/25
                                    focus-within:from-amber-400/70 focus-within:via-amber-500/25 focus-within:to-amber-400/55"
                         style={{ boxShadow: '0 0 20px rgba(212,160,23,0.09), 0 2px 16px rgba(0,0,0,0.55)' }}>

                    {/* Card */}
                    <div className="relative flex flex-col rounded-[15px] overflow-hidden transition-all duration-300
                                    bg-white dark:bg-[#141414]">

                        {/* Gold top stripe — always visible */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/55 to-transparent
                                        group-focus-within:via-amber-400/100 transition-all duration-500" />

                        {/* Short / Long term quick-reply buttons */}
                        {horizonQuestion && onHorizonChoice && (
                            <div className="flex gap-3 px-4 pt-3 pb-1 justify-center">
                                {['Short Term', 'Long Term'].map((label) => {
                                    const isShort = label === 'Short Term';
                                    const sym = horizonSymbol ? `${horizonSymbol} ` : '';
                                    const query = isShort
                                        ? `${sym}short term trading — entry, target, stop loss`
                                        : `${sym}long term investment — fundamentals, growth outlook`;
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => onHorizonChoice(query)}
                                            className="px-6 py-2 rounded-full text-[13px] font-medium
                                                       text-zinc-500 dark:text-zinc-400
                                                       bg-white/60 dark:bg-zinc-900/40
                                                       border border-zinc-200/70 dark:border-zinc-800/55
                                                       hover:text-zinc-900 dark:hover:text-zinc-200
                                                       hover:border-amber-300/70 dark:hover:border-amber-700/45
                                                       hover:bg-amber-50/80 dark:hover:bg-amber-950/25
                                                       transition-all duration-150">
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-end pl-4 pr-2 pt-2.5 pb-2.5">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Kuber AI anything finance..."
                                disabled={isLoading}
                                style={{ resize: 'none', overflow: 'hidden', minHeight: '24px' }}
                                className="w-full bg-transparent border-none outline-none text-[13px] leading-relaxed py-0.5
                                           text-zinc-900 placeholder:text-zinc-400
                                           dark:text-white dark:placeholder:text-zinc-500"
                                autoFocus
                            />

                            {/* Send / Stop */}
                            <div className="flex-shrink-0 ml-2">
                                {isLoading ? (
                                    <button onClick={onStopRequest} aria-label="Stop"
                                        className="w-7 h-7 flex items-center justify-center rounded-full
                                                   bg-red-500 hover:bg-red-600 text-white
                                                   transition-all active:scale-95
                                                   shadow-[0_2px_8px_rgba(239,68,68,0.40)]">
                                        <Square size={10} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"
                                        className="w-7 h-7 flex items-center justify-center rounded-full
                                                   transition-all duration-200 active:scale-95
                                                   bg-amber-500 hover:bg-amber-400 text-black
                                                   disabled:opacity-25 disabled:cursor-not-allowed
                                                   shadow-[0_2px_8px_rgba(212,160,23,0.44)]
                                                   hover:shadow-[0_4px_14px_rgba(212,160,23,0.62)]
                                                   hover:scale-105 disabled:hover:scale-100">
                                        <ArrowUpRight size={13} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>{/* gradient border */}
                </div>

            </div>
        </div>
    );
};

export default InputBar;
