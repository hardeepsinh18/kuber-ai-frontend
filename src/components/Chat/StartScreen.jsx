import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Zap, BookOpen,
    TrendingUp, TrendingDown, BarChart2, GitCompare,
    Search, LineChart, Building2, Sparkles, ShieldCheck, Brain,
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
    { label: 'NSE · BSE',    icon: ShieldCheck },
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
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const StartScreen = ({ onStartChat, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');

    const send = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const onKey = (e) => { if (e.key === 'Enter') send(); };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            {/* ── Ticker tape ──────────────────────────────────────── */}
            <div className="flex-none w-full overflow-hidden
                            border-b border-amber-500/10
                            bg-gradient-to-r from-transparent via-amber-500/[0.03] to-transparent">
                <div className="ticker-animate inline-flex py-[5px]">
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
                            <span className={clsx('text-[10px] font-bold flex items-center gap-0.5',
                                t.up ? 'text-emerald-500' : 'text-rose-500')}>
                                {t.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {t.change}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Main content ─────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center px-4 sm:px-8 py-8">
                    <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

                        {/* ════ LEFT — Hero ════════════════════════════════ */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">

                            {/* Live badge */}
                            <motion.div {...fadeUp(0)} className="mb-5">
                                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                                                 bg-amber-500/10 border border-amber-500/25
                                                 shadow-[0_0_24px_rgba(212,160,23,0.18)]">
                                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                                        <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500 inline-flex" />
                                    </span>
                                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-400">
                                        Markets are Live
                                    </span>
                                </span>
                            </motion.div>

                            {/* Heading */}
                            <motion.h1 {...fadeUp(0.08)}
                                className="text-[2.6rem] sm:text-[3.4rem] lg:text-[4.2rem] xl:text-[4.8rem]
                                           font-extrabold tracking-tight leading-[1.05] mb-5
                                           text-zinc-900 dark:text-white">
                                Your AI edge<br />
                                in <span className="gold-shimmer">Indian markets</span>
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p {...fadeUp(0.14)}
                                className="text-[15px] sm:text-[17px] text-zinc-500 dark:text-zinc-400
                                           max-w-md mb-7 leading-relaxed font-normal">
                                Deep research on stocks, funds &amp; sectors —
                                powered by AI trained on Indian market data.
                            </motion.p>

                            {/* Trust badges */}
                            <motion.div {...fadeUp(0.2)}
                                className="flex flex-wrap gap-2.5 justify-center lg:justify-start mb-8">
                                {TRUST.map((b, i) => {
                                    const Icon = b.icon;
                                    return (
                                        <div key={i}
                                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl
                                                       bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm
                                                       border border-zinc-200/80 dark:border-zinc-700/50
                                                       shadow-sm">
                                            <Icon size={13} className="text-amber-500" />
                                            <span className="text-[12.5px] font-semibold text-zinc-700 dark:text-zinc-300">
                                                {b.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </motion.div>

                            {/* Attribution — desktop only */}
                            <motion.div {...fadeUp(0.28)}
                                className="hidden lg:flex items-center gap-2 text-[11px]
                                           text-zinc-400 dark:text-zinc-600 tracking-wider uppercase font-medium">
                                <Sparkles size={11} className="text-amber-500/50" />
                                By 72 Street · Built for Indian Investors
                            </motion.div>
                        </div>

                        {/* ════ RIGHT — Input + Prompt cards ══════════════ */}
                        <motion.div {...fadeUp(0.12)}
                            className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col gap-3">

                            {/* Glass input card */}
                            <div className="relative group">
                                {/* Glow ring on focus */}
                                <div className="absolute -inset-[1px] rounded-2xl
                                                bg-gradient-to-r from-amber-500/30 via-amber-300/10 to-amber-500/30
                                                opacity-0 group-focus-within:opacity-100
                                                transition-all duration-500 blur-[2px] pointer-events-none" />

                                <div className="relative flex flex-col rounded-2xl overflow-hidden
                                                bg-white/90 dark:bg-white/[0.07] backdrop-blur-xl
                                                border border-zinc-200/80 dark:border-zinc-700/60
                                                shadow-[0_8px_40px_rgba(0,0,0,0.10)]
                                                focus-within:border-amber-400/60 dark:focus-within:border-amber-500/45
                                                focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.13),0_8px_40px_rgba(0,0,0,0.10)]
                                                transition-all duration-300">

                                    {/* Gold stripe on focus */}
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent
                                                    opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                                    <div className="px-5 pt-4 pb-2">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={onKey}
                                            placeholder="Ask about any stock, sector, or market idea..."
                                            className="w-full bg-transparent outline-none border-none text-[15px] h-10
                                                       text-zinc-900 placeholder:text-zinc-400
                                                       dark:text-white dark:placeholder:text-zinc-500"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90">
                                            {MODES.map(mode => {
                                                const Icon = mode.icon;
                                                const active = responseMode === mode.key;
                                                return (
                                                    <button key={mode.key} type="button" title={mode.subtitle}
                                                        onClick={() => setResponseMode(mode.key)}
                                                        className={clsx(
                                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 select-none',
                                                            active
                                                                ? 'bg-amber-500 text-black shadow-sm scale-[1.02]'
                                                                : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                                                        )}>
                                                        <Icon size={11} />
                                                        {mode.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button onClick={send} disabled={!input.trim()} aria-label="Send"
                                            className="w-9 h-9 flex items-center justify-center rounded-full
                                                       transition-all duration-200 active:scale-95
                                                       bg-amber-500 hover:bg-amber-400 text-black
                                                       disabled:opacity-25 disabled:cursor-not-allowed
                                                       shadow-[0_2px_12px_rgba(212,160,23,0.45)]
                                                       hover:shadow-[0_4px_20px_rgba(212,160,23,0.65)]
                                                       hover:scale-105 disabled:hover:scale-100
                                                       disabled:hover:shadow-[0_2px_12px_rgba(212,160,23,0.45)]">
                                            <ArrowRight size={17} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Prompt cards — 2-column grid */}
                            <div className="grid grid-cols-2 gap-2">
                                {SUGGESTIONS.map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                        <motion.button key={s.text}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0  }}
                                            transition={{ duration: 0.4, delay: 0.22 + i * 0.06, ease: 'easeOut' }}
                                            onClick={() => onStartChat(s.text, 'stock')}
                                            className="group flex items-start gap-2.5 p-3.5 rounded-xl text-left
                                                       bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm
                                                       border border-zinc-200/80 dark:border-zinc-700/50
                                                       hover:border-amber-400/50 dark:hover:border-amber-500/35
                                                       hover:bg-amber-50/70 dark:hover:bg-amber-500/8
                                                       hover:shadow-[0_4px_20px_rgba(212,160,23,0.12)]
                                                       transition-all duration-200 cursor-pointer">
                                            <Icon size={14}
                                                className="text-zinc-300 dark:text-zinc-600
                                                           group-hover:text-amber-500 dark:group-hover:text-amber-500
                                                           transition-colors mt-0.5 flex-shrink-0" />
                                            <span className="text-[12.5px] leading-snug
                                                             text-zinc-500 dark:text-zinc-400
                                                             group-hover:text-zinc-800 dark:group-hover:text-zinc-200
                                                             transition-colors">
                                                {s.text}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Mobile attribution */}
                            <div className="flex lg:hidden items-center justify-center gap-2 mt-1">
                                <Sparkles size={10} className="text-amber-500/50" />
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-600 tracking-wider uppercase font-medium">
                                    Powered by 72 Street AI
                                </span>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartScreen;
