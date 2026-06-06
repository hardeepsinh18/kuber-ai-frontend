import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Zap, BookOpen,
    TrendingUp, TrendingDown, BarChart2, GitCompare,
    Search, LineChart, Building2, Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

const MODES = [
    { key: 'snap',    label: 'Quick',   icon: Zap,      subtitle: 'Fast signal · ≤120 words' },
    { key: 'analyst', label: 'Analyst', icon: BookOpen,  subtitle: 'Full deep-dive analysis' },
];

// Static market snapshot — visual flair only
const TICKERS = [
    { symbol: 'NIFTY 50',  price: '24,198',  change: '+0.82%', up: true  },
    { symbol: 'SENSEX',    price: '79,486',  change: '+0.76%', up: true  },
    { symbol: 'BANK NIFTY',price: '51,842',  change: '-0.31%', up: false },
    { symbol: 'NIFTY IT',  price: '38,512',  change: '+1.24%', up: true  },
    { symbol: 'GOLD',      price: '₹71,250', change: '+0.45%', up: true  },
    { symbol: 'USD/INR',   price: '83.42',   change: '-0.12%', up: false },
    { symbol: 'RELIANCE',  price: '₹2,840',  change: '+1.10%', up: true  },
    { symbol: 'TCS',       price: '₹3,920',  change: '+0.68%', up: true  },
    { symbol: 'HDFC BANK', price: '₹1,680',  change: '-0.22%', up: false },
    { symbol: 'INFOSYS',   price: '₹1,570',  change: '+1.55%', up: true  },
    { symbol: 'NIFTY MID', price: '52,640',  change: '+0.94%', up: true  },
    { symbol: 'CRUDE OIL', price: '$78.40',  change: '-0.55%', up: false },
];

const STATS = [
    { label: 'Stocks Analyzed', value: '5,000+',   icon: BarChart2 },
    { label: 'AI Insights',     value: 'Real-time', icon: Zap       },
    { label: 'Market Coverage', value: 'NSE · BSE', icon: LineChart  },
];

const suggestions = [
    { text: 'TCS fundamentals & valuation',    icon: TrendingUp,  tag: 'Fundamental' },
    { text: 'Is Reliance a buy right now?',    icon: BarChart2,   tag: 'Signal'      },
    { text: 'HDFC vs ICICI Bank comparison',   icon: GitCompare,  tag: 'Compare'     },
    { text: 'Mid-cap stocks with best ROE',    icon: Search,      tag: 'Screener'    },
    { text: 'Nifty 50 chart last 6 months',    icon: LineChart,   tag: 'Chart'       },
    { text: 'Top PSU stocks by dividend',      icon: Building2,   tag: 'Screener'    },
];

const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 22 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});


const StartScreen = ({ onStartChat, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');

    const handleCreate = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') handleCreate(); };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            {/* ── Market ticker tape — in flow so content centres below it ── */}
            <div className="flex-none w-full overflow-hidden
                            border-b border-amber-500/10
                            bg-gradient-to-r from-transparent via-amber-500/[0.03] to-transparent">
                <div className="ticker-animate inline-flex py-1.5">
                    {[...TICKERS, ...TICKERS].map((t, i) => (
                        <span key={i}
                            className="inline-flex items-center gap-2.5 px-5
                                       border-r border-zinc-200/40 dark:border-zinc-700/40
                                       last:border-r-0 whitespace-nowrap">
                            <span className="text-[10.5px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                                {t.symbol}
                            </span>
                            <span className="text-[10.5px] font-semibold text-zinc-700 dark:text-zinc-300">
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

            {/* ── Main content — fills remaining height and self-centres ── */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto px-4 sm:px-8 w-full">

                {/* ── Heading ── */}
                <motion.div {...fadeUp(0.1)} className="text-center mb-8">
                    <h1 className="text-[2.1rem] sm:text-[2.9rem] lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1]
                                   text-zinc-900 dark:text-white">
                        Your AI edge in
                        <br />
                        <span className="gold-shimmer">Indian markets</span>
                    </h1>
                    <p className="mt-3.5 text-[15px] sm:text-[17px] text-zinc-400 dark:text-zinc-500 font-normal max-w-lg mx-auto leading-relaxed">
                        Deep analysis on stocks, funds &amp; sectors — in seconds, not hours.
                    </p>
                </motion.div>

                {/* ── Mini stats row ── */}
                <motion.div {...fadeUp(0.17)} className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-8">
                    {STATS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                                                     bg-white/70 dark:bg-white/[0.04]
                                                     border border-zinc-200/70 dark:border-zinc-700/40
                                                     shadow-sm">
                                <Icon size={12} className="text-amber-500 flex-shrink-0" />
                                <div className="leading-none">
                                    <span className="block text-[12px] font-bold text-zinc-800 dark:text-zinc-200">
                                        {s.value}
                                    </span>
                                    <span className="block text-[9.5px] text-zinc-400 dark:text-zinc-600 mt-0.5 whitespace-nowrap">
                                        {s.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>

                {/* ── Input card ── */}
                <motion.div {...fadeUp(0.22)} className="w-full max-w-2xl relative group">
                    {/* Ambient glow — grows on focus */}
                    <div className="absolute -inset-3 rounded-3xl
                                    bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0
                                    opacity-0 group-focus-within:opacity-100
                                    transition-all duration-700 blur-xl pointer-events-none" />

                    <div className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300
                                    bg-white border border-zinc-200/90
                                    shadow-[0_4px_28px_rgba(0,0,0,0.07),0_1px_4px_rgba(0,0,0,0.04)]
                                    focus-within:border-amber-400/70
                                    focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.13),0_4px_28px_rgba(0,0,0,0.07)]
                                    dark:bg-[#1A1916] dark:border-zinc-700/50 dark:shadow-none
                                    dark:focus-within:border-amber-500/50
                                    dark:focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.10)]">

                        {/* Subtle top stripe */}
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent
                                        opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                        <div className="px-5 pt-4 pb-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about a stock, sector, or market idea..."
                                className="w-full bg-transparent outline-none border-none text-[15px] h-9
                                           text-zinc-900 placeholder:text-zinc-400
                                           dark:text-white dark:placeholder:text-zinc-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                            {/* Mode toggle */}
                            <div className="flex items-center gap-0.5 p-0.5 rounded-xl
                                            bg-zinc-100 dark:bg-zinc-800/80">
                                {MODES.map(mode => {
                                    const Icon = mode.icon;
                                    const isActive = responseMode === mode.key;
                                    return (
                                        <button key={mode.key} type="button" title={mode.subtitle}
                                            onClick={() => setResponseMode(mode.key)}
                                            className={clsx(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 select-none',
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

                            {/* Send */}
                            <button onClick={handleCreate} disabled={!input.trim()} aria-label="Send"
                                className="w-9 h-9 flex items-center justify-center rounded-full
                                           transition-all duration-200 active:scale-95
                                           bg-amber-500 hover:bg-amber-400 text-black
                                           disabled:opacity-25 disabled:cursor-not-allowed
                                           shadow-[0_2px_12px_rgba(212,160,23,0.45)]
                                           hover:shadow-[0_4px_20px_rgba(212,160,23,0.65)]
                                           hover:scale-105 disabled:hover:scale-100 disabled:hover:shadow-[0_2px_12px_rgba(212,160,23,0.45)]">
                                <ArrowRight size={17} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── Suggestion chips ── */}
                <motion.div {...fadeUp(0.3)} className="mt-5 flex flex-wrap justify-center gap-2 px-2">
                    {suggestions.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <motion.button key={s.text}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0,  scale: 1    }}
                                transition={{ duration: 0.4, delay: 0.34 + i * 0.055, ease: 'easeOut' }}
                                onClick={() => onStartChat(s.text, 'stock')}
                                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full border
                                           text-[12.5px] transition-all duration-200 cursor-pointer
                                           border-zinc-200/90 text-zinc-500 bg-white/60 backdrop-blur-sm
                                           hover:border-amber-300/80 hover:text-amber-700 hover:bg-amber-50/80
                                           hover:shadow-[0_2px_14px_rgba(212,160,23,0.14)]
                                           dark:border-zinc-700/50 dark:text-zinc-500 dark:bg-transparent
                                           dark:hover:border-amber-500/35 dark:hover:text-amber-400 dark:hover:bg-amber-500/8">
                                <Icon size={11}
                                    className="flex-shrink-0 text-zinc-300 dark:text-zinc-600
                                               group-hover:text-amber-500 dark:group-hover:text-amber-500
                                               transition-colors duration-200" />
                                {s.text}
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* ── Footer attribution ── */}
                <motion.div {...fadeUp(0.52)} className="mt-7 flex items-center gap-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-zinc-200/80 dark:to-zinc-700/60" />
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-300 dark:text-zinc-700 tracking-widest uppercase">
                        <Sparkles size={9} className="text-amber-500/60" />
                        Powered by 72 Street AI
                    </span>
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-zinc-200/80 dark:to-zinc-700/60" />
                </motion.div>
            </div>
        </div>
    );
};

export default StartScreen;
