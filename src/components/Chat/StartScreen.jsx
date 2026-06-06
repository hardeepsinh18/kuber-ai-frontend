import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Zap, BookOpen, Search, Activity,
    TrendingUp, TrendingDown, BarChart2, GitCompare,
    LineChart, Building2, ShieldCheck, Brain, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const MODES = [
    { key: 'snap',    label: 'Quick',   icon: Zap,      subtitle: 'Fast signal · ≤120 words' },
    { key: 'analyst', label: 'Analyst', icon: BookOpen,  subtitle: 'Full deep-dive analysis'  },
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

const METRICS = [
    { label: '5,000+ Stocks',  icon: BarChart2   },
    { label: 'NSE · BSE',      icon: ShieldCheck },
    { label: 'Real-time Data', icon: Activity    },
    { label: 'AI Research',    icon: Brain       },
];

const SUGGESTIONS = [
    {
        category: 'ANALYSIS',
        badge: 'text-blue-500 dark:text-blue-400 bg-blue-500/[0.08]',
        text: 'TCS fundamentals\n& valuation',
        short: 'TCS fundamentals & valuation',
        icon: BarChart2,
    },
    {
        category: 'COMPARE',
        badge: 'text-violet-500 dark:text-violet-400 bg-violet-500/[0.08]',
        text: 'HDFC vs ICICI\nBank',
        short: 'HDFC vs ICICI Bank comparison',
        icon: GitCompare,
    },
    {
        category: 'SECTOR',
        badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08]',
        text: 'Banking sector\noutlook 2025',
        short: 'Banking sector outlook 2025',
        icon: LineChart,
    },
    {
        category: 'SCREEN',
        badge: 'text-amber-600 dark:text-amber-400 bg-amber-500/[0.08]',
        text: 'Mid-cap stocks\nwith best ROE',
        short: 'Mid-cap stocks with best ROE',
        icon: Search,
    },
    {
        category: 'MARKET',
        badge: 'text-rose-500 dark:text-rose-400 bg-rose-500/[0.08]',
        text: 'Nifty 50 trend\nlast 6 months',
        short: 'Nifty 50 chart last 6 months',
        icon: TrendingUp,
    },
    {
        category: 'INCOME',
        badge: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.08]',
        text: 'Top PSU stocks\nby dividend',
        short: 'Top PSU stocks by dividend',
        icon: Building2,
    },
];

const STOCKS = [
    { symbol: 'RELIANCE',  name: 'Reliance Ind.',   price: '₹2,840', change: '+1.10%', up: true,  spark: [68,72,70,76,74,79,77,83,81,87] },
    { symbol: 'TCS',       name: 'Tata Cons. Serv.', price: '₹3,920', change: '+0.68%', up: true,  spark: [55,58,56,62,66,64,69,67,72,75] },
    { symbol: 'INFY',      name: 'Infosys',          price: '₹1,570', change: '+1.55%', up: true,  spark: [48,50,54,52,58,61,59,64,62,67] },
    { symbol: 'HDFCBANK',  name: 'HDFC Bank',        price: '₹1,680', change: '-0.22%', up: false, spark: [80,78,75,77,74,72,74,71,69,68] },
    { symbol: 'ICICIBANK', name: 'ICICI Bank',       price: '₹1,180', change: '+0.85%', up: true,  spark: [42,44,47,45,51,54,52,57,55,60] },
];

/* ── Sparkline SVG ─────────────────────────────────────── */
const Sparkline = ({ data, up, width = 60, height = 28 }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
        (i / (data.length - 1)) * width,
        height - ((v - min) / range) * (height - 4) - 2,
    ]);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const color = up ? '#22c55e' : '#ef4444';
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

/* ── Section divider ───────────────────────────────────── */
const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase
                         text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
            {children}
        </span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
);

/* ── Stagger animation ─────────────────────────────────── */
const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 14 },
    animate:    { opacity: 1, y: 0  },
    transition: { duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] },
});

/* ═══════════════════════════════════════════════════════════
   StartScreen
═══════════════════════════════════════════════════════════ */
const StartScreen = ({ onStartChat, responseMode, setResponseMode }) => {
    const [input, setInput] = useState('');

    const send = () => { if (input.trim()) onStartChat(input, 'stock'); };
    const onKey = (e) => { if (e.key === 'Enter') send(); };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">

            {/* ── Ticker tape ──────────────────────────────────── */}
            <div className="flex-none w-full overflow-hidden
                            border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="ticker-animate inline-flex py-[5px]">
                    {[...TICKERS, ...TICKERS].map((t, i) => (
                        <span key={i}
                            className="inline-flex items-center gap-2 px-4
                                       border-r border-zinc-200 dark:border-zinc-800/80
                                       last:border-0 whitespace-nowrap">
                            <span className="text-[10px] font-bold tracking-wider uppercase
                                             text-zinc-400 dark:text-zinc-500">
                                {t.symbol}
                            </span>
                            <span className="text-[10px] font-semibold font-mono
                                             text-zinc-700 dark:text-zinc-300">
                                {t.price}
                            </span>
                            <span className={clsx(
                                'text-[10px] font-bold font-mono flex items-center gap-0.5',
                                t.up ? 'text-emerald-500' : 'text-rose-500'
                            )}>
                                {t.up ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                {t.change}
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Scrollable body ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative">

                    {/* Ambient warm glow behind hero — very subtle */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(212,160,23,0.055) 0%, transparent 65%)',
                    }} />

                    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-14">

                        {/* ══ HERO ════════════════════════════════════════ */}
                        <div className="flex flex-col items-center text-center mb-10">

                            {/* Status pill */}
                            <motion.div {...fadeUp(0)} className="mb-5">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                                                 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm
                                                 border border-zinc-200 dark:border-zinc-800
                                                 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                    </span>
                                    NSE · BSE · Live
                                    <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                                    5,000+ Stocks
                                </span>
                            </motion.div>

                            {/* Headline */}
                            <motion.h1 {...fadeUp(0.06)}
                                className="text-[2rem] sm:text-[2.85rem] font-bold tracking-[-0.025em]
                                           leading-[1.1] text-zinc-900 dark:text-zinc-50 mb-3 max-w-xl">
                                Research any Indian stock{' '}
                                <span className="gold-shimmer">in seconds</span>
                            </motion.h1>

                            {/* Sub-headline */}
                            <motion.p {...fadeUp(0.1)}
                                className="text-[14.5px] text-zinc-500 dark:text-zinc-400
                                           max-w-[420px] mb-8 leading-relaxed">
                                Institutional-grade fundamental analysis, peer comparisons &amp;
                                market intelligence — powered by AI.
                            </motion.p>

                            {/* ── Search card ─────────────────────── */}
                            <motion.div {...fadeUp(0.14)} className="w-full max-w-2xl mb-7 group">
                                <div className="flex flex-col rounded-2xl overflow-hidden
                                                bg-white dark:bg-[#111111]
                                                border border-zinc-200 dark:border-zinc-800
                                                shadow-[0_2px_20px_rgba(0,0,0,0.06)]
                                                dark:shadow-[0_2px_20px_rgba(0,0,0,0.45)]
                                                focus-within:border-amber-300/70 dark:focus-within:border-amber-500/30
                                                focus-within:shadow-[0_0_0_3px_rgba(212,160,23,0.12),0_4px_28px_rgba(0,0,0,0.07)]
                                                dark:focus-within:shadow-[0_0_0_3px_rgba(245,184,65,0.12),0_4px_28px_rgba(0,0,0,0.5)]
                                                transition-all duration-200">

                                    {/* Amber top stripe — on focus */}
                                    <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent
                                                    opacity-0 group-focus-within:opacity-60 transition-opacity duration-300" />

                                    {/* Input row */}
                                    <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                                        <Search size={15} className="text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            onKeyDown={onKey}
                                            placeholder="Analyze any stock, sector, or market idea..."
                                            className="flex-1 bg-transparent outline-none border-none
                                                       text-[15px] text-zinc-900 dark:text-zinc-100
                                                       placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                                            autoFocus
                                        />
                                        <button onClick={send} disabled={!input.trim()} aria-label="Send"
                                            className="w-8 h-8 flex items-center justify-center rounded-xl
                                                       bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900
                                                       hover:bg-zinc-700 dark:hover:bg-white
                                                       disabled:opacity-25 disabled:cursor-not-allowed
                                                       transition-all duration-150 hover:scale-105 active:scale-95
                                                       disabled:hover:scale-100">
                                            <ArrowRight size={14} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Footer row */}
                                    <div className="flex items-center justify-between px-4 pb-3 pt-0
                                                    border-t border-zinc-100 dark:border-zinc-800/80">
                                        <div className="flex items-center gap-0.5 p-0.5 rounded-lg
                                                        bg-zinc-100 dark:bg-zinc-800/80">
                                            {MODES.map(mode => {
                                                const Icon = mode.icon;
                                                const active = responseMode === mode.key;
                                                return (
                                                    <button key={mode.key} type="button" title={mode.subtitle}
                                                        onClick={() => setResponseMode(mode.key)}
                                                        className={clsx(
                                                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
                                                            'text-[11px] font-medium transition-all duration-150 select-none',
                                                            active
                                                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                                                : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                                                        )}>
                                                        <Icon size={10} className={active ? 'text-kuber-gold' : ''} />
                                                        {mode.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-600 hidden sm:inline-flex items-center gap-1">
                                            Press{' '}
                                            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono
                                                            bg-zinc-100 dark:bg-zinc-800
                                                            border border-zinc-200 dark:border-zinc-700
                                                            text-zinc-500 dark:text-zinc-400">
                                                ↵
                                            </kbd>
                                            {' '}to search
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Trust metrics */}
                            <motion.div {...fadeUp(0.18)}
                                className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
                                {METRICS.map((m, i) => {
                                    const Icon = m.icon;
                                    return (
                                        <span key={i} className="flex items-center gap-1.5
                                                                  text-[12px] text-zinc-500 dark:text-zinc-500">
                                            <Icon size={12} className="text-kuber-gold" />
                                            {m.label}
                                        </span>
                                    );
                                })}
                            </motion.div>
                        </div>

                        {/* ══ TRY ASKING ══════════════════════════════════ */}
                        <motion.div {...fadeUp(0.22)} className="mb-8">
                            <SectionLabel>Try Asking</SectionLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {SUGGESTIONS.map((s, i) => {
                                    const Icon = s.icon;
                                    return (
                                        <motion.button key={s.short}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                                            onClick={() => onStartChat(s.short, 'stock')}
                                            className="group flex flex-col gap-3 p-4 rounded-xl text-left
                                                       bg-white dark:bg-[#111111]
                                                       border border-zinc-200 dark:border-zinc-800
                                                       hover:border-zinc-300 dark:hover:border-zinc-700
                                                       hover:-translate-y-0.5
                                                       hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)]
                                                       dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)]
                                                       transition-all duration-200 cursor-pointer">

                                            <div className="flex items-center justify-between">
                                                <span className={clsx(
                                                    'text-[9px] font-bold tracking-[0.14em] px-1.5 py-0.5 rounded',
                                                    s.badge
                                                )}>
                                                    {s.category}
                                                </span>
                                                <ChevronRight size={12}
                                                    className="text-zinc-300 dark:text-zinc-700
                                                               group-hover:text-zinc-500 dark:group-hover:text-zinc-500
                                                               group-hover:translate-x-0.5 transition-all duration-150" />
                                            </div>

                                            <div className="flex items-end justify-between gap-2">
                                                <span className="text-[12.5px] font-medium leading-snug
                                                                 text-zinc-700 dark:text-zinc-300
                                                                 group-hover:text-zinc-900 dark:group-hover:text-zinc-100
                                                                 transition-colors whitespace-pre-line">
                                                    {s.text}
                                                </span>
                                                <Icon size={15}
                                                    className="flex-shrink-0 mb-0.5
                                                               text-zinc-300 dark:text-zinc-700
                                                               group-hover:text-kuber-gold
                                                               transition-colors duration-200" />
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* ══ MARKETS ═════════════════════════════════════ */}
                        <motion.div {...fadeUp(0.28)}>
                            <SectionLabel>Markets</SectionLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                {STOCKS.map((s, i) => (
                                    <motion.button key={s.symbol}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.32 + i * 0.06 }}
                                        onClick={() => onStartChat(`Analyze ${s.name} — fundamentals, valuation & outlook`, 'stock')}
                                        className="group flex flex-col gap-2.5 p-4 rounded-xl text-left
                                                   bg-white dark:bg-[#111111]
                                                   border border-zinc-200 dark:border-zinc-800
                                                   hover:border-zinc-300 dark:hover:border-zinc-700
                                                   hover:-translate-y-0.5
                                                   hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)]
                                                   dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)]
                                                   transition-all duration-200 cursor-pointer">

                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-wider font-mono
                                                             text-zinc-800 dark:text-zinc-200">
                                                {s.symbol}
                                            </span>
                                            <span className={clsx(
                                                'text-[10px] font-bold font-mono',
                                                s.up ? 'text-emerald-500' : 'text-rose-500'
                                            )}>
                                                {s.change}
                                            </span>
                                        </div>

                                        {/* Sparkline */}
                                        <Sparkline data={s.spark} up={s.up} />

                                        {/* Price + name */}
                                        <div>
                                            <div className="text-[13.5px] font-semibold font-mono
                                                            text-zinc-900 dark:text-zinc-100">
                                                {s.price}
                                            </div>
                                            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-600 mt-0.5 truncate">
                                                {s.name}
                                            </div>
                                        </div>

                                        {/* CTA on hover */}
                                        <div className="flex items-center gap-1 text-[10px] font-semibold
                                                        text-kuber-gold opacity-0 group-hover:opacity-100
                                                        -mt-0.5 transition-opacity duration-150">
                                            Analyze <ChevronRight size={10} />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {/* Attribution */}
                        <motion.p {...fadeUp(0.55)}
                            className="text-center text-[11px] mt-10
                                       text-zinc-400 dark:text-zinc-700
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
