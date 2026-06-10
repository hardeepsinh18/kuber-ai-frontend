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
                        className="text-center font-bold tracking-[-0.022em] leading-[1.18]
                                   text-[1.2rem] sm:text-[1.55rem]
                                   text-zinc-900 dark:text-white mb-5">
                        Got a question about markets,<br />
                        stocks or mutual funds?
                    </motion.h1>

                    {/* Input card */}
                    <motion.div {...fadeUp(0.08)} className="relative mb-4">

                        {/* Thin amber border wrapper — clean, not glowing */}
                        <div className="group relative p-[1px] rounded-2xl transition-all duration-300"
                             style={{ background: 'rgba(212,160,23,0.32)' }}>
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
                                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
                                        {MODES.map((mode) => {
                                            const isActive = responseMode === mode.key;
                                            return (
                                                <button
                                                    key={mode.key}
                                                    type="button"
                                                    onClick={() => setResponseMode(mode.key)}
                                                    className={clsx(
                                                        'px-3 py-1 rounded-md text-[11px] font-medium transition-all duration-200 select-none',
                                                        isActive
                                                            ? 'bg-amber-500 text-black shadow-sm'
                                                            : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                    )}
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
                                                   bg-amber-500 hover:bg-amber-400 text-black
                                                   shadow-[0_2px_10px_rgba(212,160,23,0.40)]
                                                   hover:shadow-[0_4px_16px_rgba(212,160,23,0.58)]
                                                   disabled:opacity-20 disabled:cursor-not-allowed
                                                   hover:scale-105 active:scale-95 disabled:hover:scale-100
                                                   transition-all duration-150">
                                        <ArrowUpRight size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>


                    </motion.div>

                    {/* Suggestion pills */}
                    <motion.div {...fadeUp(0.14)}
                        className="flex flex-wrap gap-2 justify-center">
                        {QUERIES.map((q, i) => (
                            <motion.button
                                key={q}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.18 + i * 0.04, duration: 0.30 }}
                                onClick={() => onStartChat(q, 'stock')}
                                className="px-3 py-1.5 rounded-full text-[11.5px]
                                           text-zinc-500 dark:text-zinc-400
                                           bg-white/60 dark:bg-white/[0.04]
                                           border border-zinc-200/70 dark:border-zinc-700/40
                                           hover:text-zinc-900 dark:hover:text-zinc-200
                                           hover:border-amber-300/70 dark:hover:border-amber-600/45
                                           hover:bg-amber-50/80 dark:hover:bg-amber-950/20
                                           transition-all duration-150">
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
