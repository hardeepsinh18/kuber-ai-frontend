import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';

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

const StartScreen = ({ onStartChat, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');
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
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
                <div className="w-full max-w-[660px] px-4 sm:px-6 py-8">

                    {/* Headline */}
                    <motion.h1 {...fadeUp(0)}
                        className="text-center font-bold tracking-[-0.025em] leading-[1.18]
                                   text-[1.65rem] sm:text-[2.1rem] mb-8 -mt-8">
                        <span className="text-zinc-900 dark:text-white">Got a question about markets,</span><br />
                        <span className="text-zinc-500 dark:text-zinc-400">stocks or mutual funds?</span>
                    </motion.h1>

                    {/* Input card */}
                    <motion.div {...fadeUp(0.08)} className="relative mb-4">

                        {/* Thin amber border + outer glow matching reference */}
                        <div className="group relative p-[1px] rounded-2xl transition-all duration-300"
                             style={{
                                 background: 'rgba(212,160,23,0.32)',
                                 boxShadow: '0 0 32px rgba(212,160,23,0.18), 0 0 80px rgba(212,160,23,0.08)'
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

                                {/* Bottom row: mode toggle + submit */}
                                <div className="flex items-center justify-between px-3 pb-3 pt-1">
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
                                                            ? 'text-black shadow-sm'
                                                            : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                    )}
                                                    style={isActive ? { backgroundColor: '#D4A017' } : {}}
                                                >
                                                    {mode.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={send}
                                        disabled={!input.trim()}
                                        aria-label="Send"
                                        className="w-8 h-8 rounded-full flex items-center justify-center
                                                   text-black
                                                   disabled:opacity-20 disabled:cursor-not-allowed
                                                   hover:scale-105 active:scale-95 disabled:hover:scale-100
                                                   transition-all duration-150"
                                        style={{
                                            backgroundColor: '#D4A017',
                                            boxShadow: '0 2px 10px rgba(212,160,23,0.45)'
                                        }}>
                                        <ArrowUpRight size={15} strokeWidth={2.8} />
                                    </button>
                                </div>
                            </div>
                        </div>


                    </motion.div>

                    {/* Suggestion pills — flex wrap, auto-sized */}
                    <motion.div {...fadeUp(0.14)}
                        className="flex flex-wrap gap-2.5 justify-center w-full">
                        {QUERIES.map((q, i) => (
                            <motion.button
                                key={q}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.18 + i * 0.04, duration: 0.30 }}
                                onClick={() => onStartChat(q, 'stock')}
                                className="px-5 py-3 rounded-2xl text-[13px]
                                           text-zinc-400 dark:text-zinc-400
                                           bg-transparent
                                           border border-zinc-300/50 dark:border-zinc-700/70
                                           hover:text-zinc-900 dark:hover:text-zinc-200
                                           hover:border-amber-400/60 dark:hover:border-amber-600/50
                                           hover:bg-amber-50/40 dark:hover:bg-amber-950/15
                                           transition-all duration-150 whitespace-nowrap">
                                {q}
                            </motion.button>
                        ))}
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default StartScreen;
