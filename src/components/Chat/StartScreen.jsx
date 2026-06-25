import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { ScanLine } from 'lucide-react';
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
    { key: 'snap',    label: 'Quick'   },
    { key: 'analyst', label: 'Analyst' },
];

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

const StartScreen = ({ onStartChat, onScannerResult, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const inputRef = useRef(null);

    const autoResize = useCallback((el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }, []);

    const send = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const onKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <>
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-8 gap-6">

                {/* Headline + Input card — narrower container */}
                <div className="w-full max-w-[660px] px-4 sm:px-6">

                    {/* Headline */}
                    <motion.h1 {...fadeUp(0)}
                        className="text-center font-bold tracking-[-0.025em] leading-[1.18] mb-8"
                        style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.6rem)' }}>
                        <span className="text-zinc-900 dark:text-white">Got a question about markets</span><br />
                        <span className="text-zinc-500 dark:text-zinc-400">or stocks?</span>
                    </motion.h1>

                    {/* Input card */}
                    <motion.div {...fadeUp(0.08)}>
                        <div className="group relative p-[1px] rounded-2xl transition-all duration-300"
                             style={{
                                 background: 'linear-gradient(135deg, rgba(253,212,5,0.55) 0%, rgba(253,212,5,0.25) 50%, rgba(253,212,5,0.55) 100%)',
                                 boxShadow: '0 0 20px rgba(253,212,5,0.12), 0 0 50px rgba(253,212,5,0.06)'
                             }}>
                            <div className="rounded-[15px] bg-white dark:bg-[#141414] overflow-hidden">
                                <textarea
                                    ref={inputRef}
                                    rows={2}
                                    value={input}
                                    onChange={e => { setInput(e.target.value); autoResize(e.target); }}
                                    onKeyDown={onKey}
                                    placeholder="Ask Kuber AI anything finance..."
                                    style={{ resize: 'none', overflow: 'hidden', minHeight: '48px' }}
                                    className="w-full px-4 pt-3.5 pb-2 bg-transparent outline-none border-none
                                               text-[13.5px] text-zinc-900 dark:text-zinc-100
                                               placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                    autoFocus
                                />


                                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                    {/* Left group: mode toggle + scanner */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-900">
                                            {MODES.map((mode) => {
                                                const isActive = responseMode === mode.key;
                                                return (
                                                    <button
                                                        key={mode.key}
                                                        type="button"
                                                        onClick={() => setResponseMode(mode.key)}
                                                        className={clsx(
                                                            'px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 select-none',
                                                            isActive
                                                                ? 'text-zinc-900 shadow-sm'
                                                                : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                        )}
                                                        style={isActive ? { backgroundColor: '#FDD405' } : {}}
                                                    >
                                                        {mode.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
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
                                    </div>
                                    <button
                                        onClick={send}
                                        disabled={!input.trim()}
                                        aria-label="Send"
                                        className="w-9 h-9 rounded-full flex items-center justify-center
                                                   bg-white dark:bg-[#111111]
                                                   disabled:opacity-20 disabled:cursor-not-allowed
                                                   hover:scale-105 active:scale-95 disabled:hover:scale-100
                                                   transition-all duration-150"
                                        style={{ border: '1px solid rgba(253,212,5,0.75)', boxShadow: '0 0 6px 1px rgba(253,212,5,0.2)', color: '#FDD405' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="19" x2="19" y2="5"/>
                                            <polyline points="8 5 19 5 19 16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Suggestion pills — wider container so 3 fit per row */}
                <motion.div {...fadeUp(0.14)}
                    className="w-full max-w-[900px] px-4 sm:px-6">
                    <div className="flex flex-wrap gap-2.5 justify-center">
                        {QUERIES.map((q, i) => (
                            <motion.button
                                key={q}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.18 + i * 0.04, duration: 0.30 }}
                                onClick={() => onStartChat(q, 'stock')}
                                className="px-5 py-2.5 rounded-2xl text-[12.5px] font-medium
                                           text-zinc-700 dark:text-zinc-400
                                           bg-transparent
                                           border border-zinc-300 dark:border-zinc-700/70
                                           hover:text-zinc-900 dark:hover:text-zinc-200
                                           hover:border-[#FDD405]/60 dark:hover:border-[#FDD405]/50
                                           hover:bg-amber-50/40 dark:hover:bg-amber-950/15
                                           transition-all duration-150 whitespace-nowrap">
                                {q}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>

        {scannerOpen && (
            <ScannerPanel
                onSelectScanner={onScannerResult || ((msg) => onStartChat(msg, 'stock'))}
                onClose={() => setScannerOpen(false)}
            />
        )}
    </>
    );
};

export default StartScreen;
