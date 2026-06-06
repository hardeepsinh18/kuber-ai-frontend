import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Zap, BookOpen,
    TrendingUp, TrendingDown, BarChart2, GitCompare,
    Search, LineChart, Building2, ShieldCheck, Brain,
} from 'lucide-react';
import { clsx } from 'clsx';

const MODES = [
    { key: 'snap',    label: 'Quick',   icon: Zap,     subtitle: 'Fast signal · ≤120 words' },
    { key: 'analyst', label: 'Analyst', icon: BookOpen, subtitle: 'Full deep-dive analysis'  },
];

const TICKERS = [
    { symbol: 'NIFTY 50',   price: '24,198',  change: '+0.82%', up: true  },
    { symbol: 'SENSEX',     price: '79,486',  change: '+0.76%', up: true  },
    { symbol: 'BANK NIFTY', price: '51,842',  change: '-0.31%', up: false },
    { symbol: 'NIFTY IT',   price: '38,512',  change: '+1.24%', up: true  },
    { symbol: 'GOLD',       price: '₹71,250', change: '+0.45%', up: true  },
    { symbol: 'USD/INR',    price: '83.42',   change: '-0.12%', up: false },
    { symbol: 'RELIANCE',   price: '₹2,840',  change: '+1.10%', up: true  },
    { symbol: 'TCS',        price: '₹3,920',  change: '+0.68%', up: true  },
    { symbol: 'HDFC BANK',  price: '₹1,680',  change: '-0.22%', up: false },
    { symbol: 'INFOSYS',    price: '₹1,570',  change: '+1.55%', up: true  },
    { symbol: 'NIFTY MID',  price: '52,640',  change: '+0.94%', up: true  },
    { symbol: 'CRUDE OIL',  price: '$78.40',  change: '-0.55%', up: false },
];

const TRUST = [
    { label: 'NSE · BSE',     icon: ShieldCheck },
    { label: '5,000+ Stocks', icon: BarChart2   },
    { label: 'Real-time AI',  icon: Brain       },
];

const SUGGESTIONS = [
    { text: 'TCS fundamentals & valuation',  icon: TrendingUp },
    { text: 'Is Reliance a buy right now?',  icon: BarChart2  },
    { text: 'HDFC vs ICICI Bank comparison', icon: GitCompare },
    { text: 'Mid-cap stocks with best ROE',  icon: Search     },
    { text: 'Nifty 50 chart last 6 months',  icon: LineChart  },
    { text: 'Top PSU stocks by dividend',    icon: Building2  },
];

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 20 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const StartScreen = ({ onStartChat, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');

    const send = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const onKey = (e) => { if (e.key === 'Enter') send(); };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            {/* ── Ticker tape ─────────────────────────────────────── */}
            <div className="flex-none w-full overflow-hidden
                            border-b border-zinc-200 dark:border-zinc-800">
                <div className="ticker-animate inline-flex py-[5px]">
                    {[...TICKERS, ...TICKERS].map((t, i) => (
                        <span key={i}
                            className="inline-flex items-center gap-2.5 px-5
                                       border-r border-zinc-200 dark:border-zinc-800
                                       last:border-r-0 whitespace-nowrap">
                            <span className="text-[10.5px] font-bold tracking-wider
                                             text-zinc-400 dark:text-zinc-500 uppercase">
                                {t.symbol}
                            </span>
                            <span className="text-[10.5px] font-semibold
                                             text-zinc-700 dark:text-zinc-300">
                                {t.price}
                            </span>
                            <span className={clsx(
                                'text-[10px] font-bold flex items-center gap-0.5',
                                t.up ? 'text-emerald-500' : 'text-rose-500'
                            )}>
                                {t.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {t.change}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Main content ────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center px-4 sm:px-6 py-10">
                    <div className="w-full max-w-2xl flex flex-col items-center text-center">

                        {/* Live badge */}
                        <motion.div {...fadeUp(0)} className="mb-5">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                                             bg-zinc-100 dark:bg-zinc-800/80
                                             border border-zinc-200 dark:border-zinc-700
                                             text-[11px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500 inline-flex" />
                                </span>
                                Markets are Live
                            </span>
                        </motion.div>

                        {/* Heading */}
                        <motion.h1 {...fadeUp(0.07)}
                            className="text-[2rem] sm:text-[2.6rem] font-bold tracking-tight leading-[1.1]
                                       text-zinc-900 dark:text-white mb-3">
                            Ask anything about{' '}
                            <span className="gold-shimmer">Indian markets</span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p {...fadeUp(0.12)}
                            className="text-[14px] sm:text-[15px] text-zinc-500 dark:text-zinc-400
                                       max-w-sm mb-7 leading-relaxed">
                            Stocks, funds &amp; sectors — deep research powered by AI.
                        </motion.p>

                        {/* Trust chips */}
                        <motion.div {...fadeUp(0.17)}
                            className="flex flex-wrap items-center justify-center gap-2 mb-8">
                            {TRUST.map((b, i) => {
                                const Icon = b.icon;
                                return (
                                    <span key={i}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                                   bg-zinc-100 dark:bg-zinc-800/70
                                                   border border-zinc-200 dark:border-zinc-700/70
                                                   text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                                        <Icon size={12} className="text-kuber-gold" />
                                        {b.label}
                                    </span>
                                );
                            })}
                        </motion.div>

                        {/* Input card */}
                        <motion.div {...fadeUp(0.22)} className="w-full mb-5 group">
                            <div className="flex flex-col rounded-2xl overflow-hidden
                                            bg-white dark:bg-zinc-900
                                            border border-zinc-200 dark:border-zinc-700/80
                                            shadow-sm
                                            focus-within:border-zinc-400 dark:focus-within:border-zinc-500
                                            transition-colors duration-200">

                                {/* Subtle top accent — only visible on focus, very light */}
                                <div className="h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent
                                                opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

                                <div className="px-4 pt-3.5 pb-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={onKey}
                                        placeholder="Ask about any stock, sector, or market idea..."
                                        className="w-full bg-transparent outline-none border-none
                                                   text-[15px] text-zinc-900 dark:text-white
                                                   placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                    {/* Mode toggle */}
                                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg
                                                    bg-zinc-100 dark:bg-zinc-800">
                                        {MODES.map(mode => {
                                            const Icon = mode.icon;
                                            const active = responseMode === mode.key;
                                            return (
                                                <button key={mode.key} type="button" title={mode.subtitle}
                                                    onClick={() => setResponseMode(mode.key)}
                                                    className={clsx(
                                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 select-none',
                                                        active
                                                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                                            : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                                                    )}>
                                                    <Icon size={11}
                                                        className={active ? 'text-kuber-gold' : ''} />
                                                    {mode.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Send button */}
                                    <button onClick={send} disabled={!input.trim()} aria-label="Send"
                                        className="w-8 h-8 flex items-center justify-center rounded-full
                                                   bg-zinc-900 dark:bg-white text-white dark:text-zinc-900
                                                   hover:bg-zinc-700 dark:hover:bg-zinc-100
                                                   disabled:opacity-30 disabled:cursor-not-allowed
                                                   transition-all duration-150 hover:scale-105 active:scale-95
                                                   disabled:hover:scale-100">
                                        <ArrowRight size={15} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Suggestion chips */}
                        <motion.div {...fadeUp(0.27)}
                            className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <motion.button key={s.text}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                                        onClick={() => onStartChat(s.text, 'stock')}
                                        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                                                   bg-zinc-50 dark:bg-zinc-800/60
                                                   border border-zinc-200 dark:border-zinc-700/60
                                                   text-[13px] text-zinc-600 dark:text-zinc-400
                                                   hover:bg-zinc-100 dark:hover:bg-zinc-700/60
                                                   hover:text-zinc-900 dark:hover:text-zinc-200
                                                   hover:border-zinc-300 dark:hover:border-zinc-600
                                                   transition-all duration-150 cursor-pointer">
                                        <Icon size={13}
                                            className="text-zinc-400 dark:text-zinc-500
                                                       group-hover:text-kuber-gold transition-colors" />
                                        {s.text}
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        {/* Attribution */}
                        <motion.p {...fadeUp(0.5)}
                            className="mt-10 text-[11px] text-zinc-400 dark:text-zinc-600
                                       tracking-wider uppercase font-medium">
                            By 72 Street · Built for Indian Investors
                        </motion.p>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
