import { useRef, useEffect, useCallback, useState } from 'react';
import { Square, ScanLine } from 'lucide-react';
import { clsx } from 'clsx';
import ScannerPanel from './ScannerPanel';

const QUERIES = [
    'Show me TCS fundamentals and valuation',
    'Is Reliance a good buy right now?',
    'Show Nifty 50 chart for last 6 months',
    'Compare HDFC Bank vs ICICI Bank on financials',
    'Which mid-cap stocks have best ROE on NSE?',
    'Top PSU stocks by dividend yield',
];

const MODES = [
    { key: 'snap', label: 'Quick' },
    { key: 'analyst', label: 'Analyst' },
];

const InputBar = ({ input, setInput, handleSend, onStopRequest, isLoading, horizonQuestion = false, horizonSymbol = '', onHorizonChoice, responseMode, setResponseMode, onScannerResult }) => {
    const inputRef = useRef(null);
    const [scannerOpen, setScannerOpen] = useState(false);

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
        <>
        <div className="px-4 pb-10 pt-2">
            <div className="w-full max-w-3xl mx-auto">

                <div className="w-full relative group">

                    {/* Thin amber border + outer glow */}
                    <div className="p-[1px] rounded-xl transition-all duration-300"
                         style={{
                             background: 'linear-gradient(135deg, rgba(253,212,5,0.55) 0%, rgba(253,212,5,0.25) 50%, rgba(253,212,5,0.55) 100%)',
                             boxShadow: '0 0 20px rgba(253,212,5,0.12), 0 0 50px rgba(253,212,5,0.06)'
                         }}>

                    {/* Card */}
                    <div className="relative flex flex-col rounded-[11px] overflow-hidden transition-all duration-300
                                    bg-white dark:bg-[#1a1a1a]">

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
                                                       hover:border-[#FDD405]/70 dark:hover:border-[#FDD405]/45
                                                       hover:bg-amber-50/80 dark:hover:bg-[#FDD405]/10
                                                       transition-all duration-150">
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Textarea row */}
                        <div className="px-4 pt-3 pb-1">
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
                        </div>

                        {/* Bottom row: mode toggle left, send right */}
                        <div className="flex items-center justify-between px-2 pb-2">
                            {responseMode !== undefined && setResponseMode ? (
                                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-900">
                                    {MODES.map((mode) => {
                                        const isActive = responseMode === mode.key;
                                        return (
                                            <button key={mode.key} type="button" onClick={() => setResponseMode(mode.key)}
                                                className={clsx(
                                                    'px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none',
                                                    isActive ? 'text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                )}
                                                style={isActive ? { backgroundColor: '#FDD405' } : {}}>
                                                {mode.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : <div />}

                            {/* Scanner button */}
                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold
                                           text-zinc-500 dark:text-zinc-400
                                           hover:text-zinc-900 dark:hover:text-zinc-100
                                           border border-zinc-300/60 dark:border-zinc-700/60
                                           hover:border-[#FDD405]/60 dark:hover:border-[#FDD405]/50
                                           hover:bg-amber-50/40 dark:hover:bg-amber-950/15
                                           transition-all duration-150">
                                <ScanLine size={12} />
                                Scanners
                            </button>

                            {/* Send / Stop */}
                            <div className="flex-shrink-0">
                                {isLoading ? (
                                    <button onClick={onStopRequest} aria-label="Stop"
                                        className="w-7 h-7 flex items-center justify-center rounded-full
                                                   transition-all active:scale-95 text-black
                                                   hover:brightness-110"
                                        style={{
                                            backgroundColor: '#ffffff',
                                            boxShadow: '0 2px 8px rgba(255,255,255,0.20)'
                                        }}>
                                        <Square size={10} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"
                                        className="w-9 h-9 flex items-center justify-center rounded-full
                                                   bg-white dark:bg-[#111111]
                                                   transition-all duration-200 active:scale-95
                                                   disabled:opacity-25 disabled:cursor-not-allowed
                                                   hover:scale-105 disabled:hover:scale-100"
                                        style={{
                                            border: '1px solid rgba(253,212,5,0.75)',
                                            boxShadow: '0 0 6px 1px rgba(253,212,5,0.2)',
                                            color: '#FDD405'
                                        }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="19" x2="19" y2="5"/>
                                            <polyline points="8 5 19 5 19 16"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>{/* gradient border */}
                </div>

            </div>
        </div>

        {scannerOpen && (
            <ScannerPanel
                onSelectScanner={onScannerResult}
                onClose={() => setScannerOpen(false)}
            />
        )}
        </>
    );
};

export default InputBar;
